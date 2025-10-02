'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole as PrismaUserRole, ReceivableStatus as PrismaReceivableStatus } from '@prisma/client';
import { z } from 'zod';
import {
  CustomerImportRow,
  ReceivableImportRow,
  CombinedImportRow,
  BulkImportResult,
  ImportRowResult,
  ImportValidationError,
  ImportPreview,
  ImportOptions
} from '../../../types/bulk-import';
import { ActionResult } from '../../../types/document';
import { formatDate } from '@/lib/utils';

/**
 * Validation schemas for bulk import
 */
const CustomerImportSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255, 'Customer name must be less than 255 characters'),
  email: z.string().email('Invalid email format - use format: user@domain.com').optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone number must be less than 50 characters').optional().or(z.literal('')),
  address: z.string().max(1000, 'Address must be less than 1000 characters').optional().or(z.literal('')),
  paymentTerms: z.number().int('Payment terms must be a whole number').min(0, 'Payment terms cannot be negative').max(365, 'Payment terms cannot exceed 365 days'),
  isActive: z.boolean()
});

const ReceivableImportSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100, 'Invoice number must be less than 100 characters'),
  customerName: z.string().min(1, 'Customer name is required for invoice matching'),
  customerEmail: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val || val === '') return true;
    return z.string().email().safeParse(val).success;
  }, 'Invalid customer email format - use format: user@domain.com'),
  amount: z.number().positive('Invoice amount must be a positive number (e.g., 1500.00)').max(99999999.99, 'Amount cannot exceed 99,999,999.99'),
  invoiceDate: z.string().refine((date) => {
    const parsed = Date.parse(date);
    return !isNaN(parsed);
  }, 'Invalid date format - use YYYY-MM-DD format (e.g., 2024-01-15)'),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').optional(),
  assignedTo: z.nativeEnum(PrismaUserRole, {
    errorMap: () => ({ message: 'Assigned to must be one of: ADMIN, SALES, ACCOUNTS, MANAGER, ACCOUNTANT' })
  })
});

const CombinedImportSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val || val === '') return true;
    return z.string().email().safeParse(val).success;
  }, 'Invalid customer email format - use format: user@domain.com'),
  customerPhone: z.string().max(50, 'Customer phone must be less than 50 characters').optional().or(z.literal('')),
  customerAddress: z.string().max(1000, 'Customer address must be less than 1000 characters').optional().or(z.literal('')),
  customerPaymentTerms: z.number().int('Customer payment terms must be a whole number').min(0, 'Payment terms cannot be negative').max(365, 'Payment terms cannot exceed 365 days').optional().default(30),
  invoiceNumber: z.string().min(1, 'Invoice number is required').max(100, 'Invoice number must be less than 100 characters'),
  amount: z.number().positive('Invoice amount must be a positive number (e.g., 1500.00)').max(99999999.99, 'Amount cannot exceed 99,999,999.99'),
  invoiceDate: z.string().refine((date) => {
    const parsed = Date.parse(date);
    return !isNaN(parsed);
  }, 'Invalid date format - use YYYY-MM-DD format (e.g., 2024-01-15)'),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').optional().default(0),
  assignedTo: z.nativeEnum(PrismaUserRole, {
    errorMap: () => ({ message: 'Assigned to must be one of: ADMIN, SALES, ACCOUNTS, MANAGER, ACCOUNTANT' })
  })
});

/**
 * Access control for bulk import operations
 */
async function checkBulkImportAccess(): Promise<{ success: false; error: string } | { success: true; userRole: PrismaUserRole }> {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Authentication required'
    };
  }

  // Only Admin, Manager, and Accounts can perform bulk imports
  if (![PrismaUserRole.ADMIN, PrismaUserRole.MANAGER, PrismaUserRole.ACCOUNTS].includes(session.user.role as PrismaUserRole)) {
    return {
      success: false,
      error: 'Access denied. Bulk import requires Admin, Manager or Accounts permissions.'
    };
  }

  return {
    success: true,
    userRole: session.user.role as PrismaUserRole
  };
}

/**
 * Validate and preview import data
 */
export async function previewImportAction(
  rawData: any[],
  options: ImportOptions
): Promise<ActionResult<ImportPreview>> {
  try {
    const accessCheck = await checkBulkImportAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const errors: ImportValidationError[] = [];
    const validRows: any[] = [];
    const duplicateInvoices: string[] = [];
    const duplicateCustomers: string[] = [];

    // Choose validation schema based on import type
    let schema: z.ZodSchema;
    switch (options.importType) {
      case 'customers':
        schema = CustomerImportSchema;
        break;
      case 'receivables':
        schema = ReceivableImportSchema;
        break;
      case 'combined':
        schema = CombinedImportSchema;
        break;
      default:
        return {
          success: false,
          error: 'Invalid import type'
        };
    }

    // Validate each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNumber = i + 1;

      console.log(`Validating row ${rowNumber}:`, JSON.stringify(row, null, 2));

      try {
        const validatedRow = schema.parse(row);
        validRows.push(validatedRow);
        console.log(`Row ${rowNumber} validation successful`);

        // Check for duplicate invoice numbers within the data
        if ('invoiceNumber' in validatedRow) {
          const invoiceNumber = validatedRow.invoiceNumber as string;
          const existingInvoice = validRows.find((r, idx) =>
            idx < validRows.length - 1 && 'invoiceNumber' in r && r.invoiceNumber === invoiceNumber
          );
          if (existingInvoice) {
            duplicateInvoices.push(invoiceNumber);
            errors.push({
              row: rowNumber,
              field: 'invoiceNumber',
              message: 'Duplicate invoice number in import data',
              value: invoiceNumber
            });
          }
        }

        // Check for duplicate customer names within the data (for customer-only imports)
        if (options.importType === 'customers' && 'name' in validatedRow) {
          const customerName = validatedRow.name as string;
          const existingCustomer = validRows.find((r, idx) =>
            idx < validRows.length - 1 && 'name' in r && r.name === customerName
          );
          if (existingCustomer) {
            duplicateCustomers.push(customerName);
            errors.push({
              row: rowNumber,
              field: 'name',
              message: 'Duplicate customer name in import data',
              value: customerName
            });
          }
        }

      } catch (validationError) {
        console.log(`Row ${rowNumber} validation error:`, validationError);
        if (validationError instanceof z.ZodError) {
          console.log('Zod validation errors:', validationError.errors);
          const errorList = validationError.errors || [];
          errorList.forEach(err => {
            const fieldName = err.path.join('.');
            const fieldValue = err.path.length > 0 ? row[err.path[0]] : undefined;
            console.log(`Adding error for row ${rowNumber}, field ${fieldName}:`, err.message);
            errors.push({
              row: rowNumber,
              field: fieldName,
              message: err.message,
              value: fieldValue
            });
          });
        } else {
          // Handle non-Zod errors
          console.log('Non-Zod error:', validationError);
          errors.push({
            row: rowNumber,
            field: 'general',
            message: validationError instanceof Error ? validationError.message : 'Unknown validation error',
            value: undefined
          });
        }
      }
    }

    // Check for existing duplicates in database
    if (options.importType === 'receivables' || options.importType === 'combined') {
      const invoiceNumbers = validRows
        .filter(row => 'invoiceNumber' in row)
        .map(row => (row as any).invoiceNumber);

      if (invoiceNumbers.length > 0) {
        const existingInvoices = await prisma.receivable.findMany({
          where: { invoiceNumber: { in: invoiceNumbers } },
          select: { invoiceNumber: true }
        });

        existingInvoices.forEach(invoice => {
          if (!duplicateInvoices.includes(invoice.invoiceNumber)) {
            duplicateInvoices.push(invoice.invoiceNumber);
          }
        });
      }
    }

    const preview: ImportPreview = {
      totalRows: rawData.length,
      validRows: validRows.length,
      invalidRows: rawData.length - validRows.length,
      sampleData: validRows.slice(0, 5), // Show first 5 valid rows as sample
      errors,
      duplicateInvoices,
      duplicateCustomers
    };

    return {
      success: true,
      data: preview
    };

  } catch (error) {
    console.error('Error previewing import:', error);
    return {
      success: false,
      error: 'Failed to preview import data'
    };
  }
}

/**
 * Process bulk customer import
 */
async function processBulkCustomers(
  customers: CustomerImportRow[],
  options: ImportOptions
): Promise<{ results: ImportRowResult[]; customersCreated: number; customersUpdated: number }> {
  const results: ImportRowResult[] = [];
  let customersCreated = 0;
  let customersUpdated = 0;

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const rowNumber = i + 1;

    try {
      // Check if customer already exists
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          name: customer.name,
          email: customer.email || null
        }
      });

      if (existingCustomer) {
        if (options.updateExisting) {
          // Update existing customer
          const updatedCustomer = await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
              email: customer.email || null,
              phone: customer.phone || null,
              address: customer.address || null,
              paymentTerms: customer.paymentTerms,
              isActive: customer.isActive
            }
          });

          results.push({
            row: rowNumber,
            success: true,
            data: {
              customer: {
                id: updatedCustomer.id,
                name: updatedCustomer.name,
                created: false
              }
            }
          });
          customersUpdated++;
        } else if (options.skipDuplicates) {
          // Skip duplicate
          results.push({
            row: rowNumber,
            success: true,
            data: {
              customer: {
                id: existingCustomer.id,
                name: existingCustomer.name,
                created: false
              }
            }
          });
        } else {
          // Report error for duplicate
          results.push({
            row: rowNumber,
            success: false,
            errors: [{
              row: rowNumber,
              field: 'name',
              message: 'Customer already exists',
              value: customer.name
            }]
          });
        }
      } else {
        // Create new customer
        const newCustomer = await prisma.customer.create({
          data: {
            name: customer.name,
            email: customer.email || null,
            phone: customer.phone || null,
            address: customer.address || null,
            paymentTerms: customer.paymentTerms,
            isActive: customer.isActive
          }
        });

        results.push({
          row: rowNumber,
          success: true,
          data: {
            customer: {
              id: newCustomer.id,
              name: newCustomer.name,
              created: true
            }
          }
        });
        customersCreated++;
      }

    } catch (error) {
      console.error(`Error processing customer row ${rowNumber}:`, error);
      results.push({
        row: rowNumber,
        success: false,
        errors: [{
          row: rowNumber,
          field: 'general',
          message: 'Failed to process customer',
          value: customer.name
        }]
      });
    }
  }

  return { results, customersCreated, customersUpdated };
}

/**
 * Process bulk receivable import
 */
async function processBulkReceivables(
  receivables: ReceivableImportRow[],
  options: ImportOptions
): Promise<{ results: ImportRowResult[]; receivablesCreated: number; customersCreated: number }> {
  const results: ImportRowResult[] = [];
  let receivablesCreated = 0;
  let customersCreated = 0;

  for (let i = 0; i < receivables.length; i++) {
    const receivable = receivables[i];
    const rowNumber = i + 1;

    try {
      // Check if invoice already exists
      const existingReceivable = await prisma.receivable.findUnique({
        where: { invoiceNumber: receivable.invoiceNumber }
      });

      if (existingReceivable && !options.skipDuplicates) {
        results.push({
          row: rowNumber,
          success: false,
          errors: [{
            row: rowNumber,
            field: 'invoiceNumber',
            message: 'Invoice number already exists',
            value: receivable.invoiceNumber
          }]
        });
        continue;
      }

      if (existingReceivable && options.skipDuplicates) {
        results.push({
          row: rowNumber,
          success: true,
          data: {
            receivable: {
              id: existingReceivable.id,
              invoiceNumber: existingReceivable.invoiceNumber,
              created: false
            }
          }
        });
        continue;
      }

      // Find or create customer
      let customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { name: receivable.customerName },
            ...(receivable.customerEmail ? [{ email: receivable.customerEmail }] : [])
          ]
        }
      });

      if (!customer) {
        // Create new customer
        customer = await prisma.customer.create({
          data: {
            name: receivable.customerName,
            email: receivable.customerEmail || null,
            paymentTerms: 30, // Default payment terms
            isActive: true
          }
        });
        customersCreated++;
      }

      // Calculate due date with validation
      const invoiceDate = new Date(receivable.invoiceDate);
      if (isNaN(invoiceDate.getTime())) {
        results.push({
          row: rowNumber,
          success: false,
          errors: [{
            row: rowNumber,
            field: 'invoiceDate',
            message: 'Invalid date format',
            value: receivable.invoiceDate
          }]
        });
        continue;
      }

      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + customer.paymentTerms);

      // Determine status
      const paidAmount = receivable.paidAmount || 0;
      let status = PrismaReceivableStatus.PENDING;
      if (paidAmount >= receivable.amount) {
        status = PrismaReceivableStatus.PAID;
      } else if (paidAmount > 0) {
        status = PrismaReceivableStatus.PARTIALLY_PAID;
      } else if (dueDate < new Date()) {
        status = PrismaReceivableStatus.OVERDUE;
      }

      // Create receivable
      const newReceivable = await prisma.receivable.create({
        data: {
          invoiceNumber: receivable.invoiceNumber,
          customerId: customer.id,
          amount: receivable.amount,
          invoiceDate,
          dueDate,
          paidAmount,
          status,
          assignedTo: receivable.assignedTo
        }
      });

      results.push({
        row: rowNumber,
        success: true,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            created: false
          },
          receivable: {
            id: newReceivable.id,
            invoiceNumber: newReceivable.invoiceNumber,
            created: true
          }
        }
      });
      receivablesCreated++;

    } catch (error) {
      console.error(`Error processing receivable row ${rowNumber}:`, error);
      results.push({
        row: rowNumber,
        success: false,
        errors: [{
          row: rowNumber,
          field: 'general',
          message: 'Failed to process receivable',
          value: receivable.invoiceNumber
        }]
      });
    }
  }

  return { results, receivablesCreated, customersCreated };
}

/**
 * Process combined customer and receivable import
 */
async function processCombinedImport(
  rows: CombinedImportRow[],
  options: ImportOptions
): Promise<{ results: ImportRowResult[]; customersCreated: number; customersUpdated: number; receivablesCreated: number }> {
  const results: ImportRowResult[] = [];
  let customersCreated = 0;
  let customersUpdated = 0;
  let receivablesCreated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    console.log(`Processing row ${rowNumber}: ${row.invoiceNumber}`);

    try {
      // Check if invoice already exists
      const existingReceivable = await prisma.receivable.findUnique({
        where: { invoiceNumber: row.invoiceNumber }
      });

      console.log(`Row ${rowNumber} - Existing receivable:`, existingReceivable ? 'EXISTS' : 'NOT_FOUND');

      if (existingReceivable && !options.skipDuplicates) {
        console.log(`Row ${rowNumber} - Rejecting duplicate invoice: ${row.invoiceNumber}`);
        results.push({
          row: rowNumber,
          success: false,
          errors: [{
            row: rowNumber,
            field: 'invoiceNumber',
            message: 'Invoice number already exists',
            value: row.invoiceNumber
          }]
        });
        continue;
      }

      if (existingReceivable && options.skipDuplicates) {
        console.log(`Row ${rowNumber} - Skipping duplicate invoice: ${row.invoiceNumber}`);
        results.push({
          row: rowNumber,
          success: true,
          data: {
            receivable: {
              id: existingReceivable.id,
              invoiceNumber: existingReceivable.invoiceNumber,
              created: false
            }
          }
        });
        continue;
      }

      // Find or create customer
      let customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { name: row.customerName },
            ...(row.customerEmail ? [{ email: row.customerEmail }] : [])
          ]
        }
      });

      let customerCreatedInThisRow = false;
      let customerUpdatedInThisRow = false;

      if (!customer) {
        // Create new customer
        console.log(`Row ${rowNumber} - Creating new customer: ${row.customerName}`);
        customer = await prisma.customer.create({
          data: {
            name: row.customerName,
            email: row.customerEmail || null,
            phone: row.customerPhone || null,
            address: row.customerAddress || null,
            paymentTerms: row.customerPaymentTerms || 30,
            isActive: true
          }
        });
        customersCreated++;
        customerCreatedInThisRow = true;
        console.log(`Row ${rowNumber} - Created customer ID: ${customer.id}`);
      } else if (options.updateExisting) {
        // Update existing customer with new information
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            email: row.customerEmail || customer.email,
            phone: row.customerPhone || customer.phone,
            address: row.customerAddress || customer.address,
            paymentTerms: row.customerPaymentTerms || customer.paymentTerms
          }
        });
        customersUpdated++;
        customerUpdatedInThisRow = true;
      }

      // Calculate due date with validation
      const invoiceDate = new Date(row.invoiceDate);
      if (isNaN(invoiceDate.getTime())) {
        results.push({
          row: rowNumber,
          success: false,
          errors: [{
            row: rowNumber,
            field: 'invoiceDate',
            message: 'Invalid date format',
            value: row.invoiceDate
          }]
        });
        continue;
      }

      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + customer.paymentTerms);

      // Determine status
      const paidAmount = row.paidAmount || 0;
      let status = PrismaReceivableStatus.PENDING;
      if (paidAmount >= row.amount) {
        status = PrismaReceivableStatus.PAID;
      } else if (paidAmount > 0) {
        status = PrismaReceivableStatus.PARTIALLY_PAID;
      } else if (dueDate < new Date()) {
        status = PrismaReceivableStatus.OVERDUE;
      }

      // Create receivable
      console.log(`Row ${rowNumber} - Creating receivable: ${row.invoiceNumber} for customer ${customer.id}`);
      const newReceivable = await prisma.receivable.create({
        data: {
          invoiceNumber: row.invoiceNumber,
          customerId: customer.id,
          amount: row.amount,
          invoiceDate,
          dueDate,
          paidAmount,
          status,
          assignedTo: row.assignedTo
        }
      });

      console.log(`Row ${rowNumber} - Created receivable ID: ${newReceivable.id}`);
      results.push({
        row: rowNumber,
        success: true,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            created: customerCreatedInThisRow
          },
          receivable: {
            id: newReceivable.id,
            invoiceNumber: newReceivable.invoiceNumber,
            created: true
          }
        }
      });
      receivablesCreated++;
      console.log(`Row ${rowNumber} - Successfully processed. Total receivables created: ${receivablesCreated}`);

    } catch (error) {
      console.error(`Error processing combined row ${rowNumber}:`, error);
      results.push({
        row: rowNumber,
        success: false,
        errors: [{
          row: rowNumber,
          field: 'general',
          message: 'Failed to process row',
          value: row.invoiceNumber
        }]
      });
    }
  }

  return { results, customersCreated, customersUpdated, receivablesCreated };
}

/**
 * Execute bulk import - Updated with validation filtering
 */
export async function executeBulkImportAction(
  data: any[],
  options: ImportOptions
): Promise<ActionResult<BulkImportResult>> {
  try {
    console.log('=== EXECUTING BULK IMPORT ===');
    console.log('Data rows:', data.length);
    console.log('Options:', options);

    const accessCheck = await checkBulkImportAccess();
    if (!accessCheck.success) {
      console.log('Access check failed:', accessCheck.error);
      return accessCheck;
    }

    if (options.validateOnly) {
      console.log('Validate only mode - redirecting to preview');
      return previewImportAction(data, options);
    }

    console.log('Starting actual import execution...');

    // First, validate and filter the data to get only valid rows
    console.log('About to call previewImportAction for validation...');
    const validationResult = await previewImportAction(data, { ...options, validateOnly: true });
    console.log('Validation result:', validationResult.success ? 'SUCCESS' : 'FAILED');
    if (!validationResult.success) {
      console.log('Validation failed during import execution');
      return validationResult;
    }

    const validData = validationResult.data.sampleData; // This contains valid rows, but only first 5

    // We need to re-validate and collect ALL valid rows, not just the sample
    const validRows: any[] = [];
    const validationErrors: ImportValidationError[] = [];

    // Choose validation schema based on import type
    let schema: z.ZodSchema;
    switch (options.importType) {
      case 'customers':
        schema = CustomerImportSchema;
        break;
      case 'receivables':
        schema = ReceivableImportSchema;
        break;
      case 'combined':
        schema = CombinedImportSchema;
        break;
      default:
        return {
          success: false,
          error: 'Invalid import type'
        };
    }

    // Validate each row and collect valid ones
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;

      try {
        const validatedRow = schema.parse(row);
        validRows.push(validatedRow);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const errorList = validationError.errors || [];
          errorList.forEach(err => {
            const fieldName = err.path.join('.');
            const fieldValue = err.path.length > 0 ? row[err.path[0]] : undefined;
            validationErrors.push({
              row: rowNumber,
              field: fieldName,
              message: err.message,
              value: fieldValue
            });
          });
        }
      }
    }

    console.log(`Validation complete: ${validRows.length} valid rows, ${validationErrors.length} errors`);
    console.log('Valid row sample:', validRows.slice(0, 2));

    if (validRows.length === 0) {
      console.log('ERROR: No valid rows found for import');
      return {
        success: false,
        error: 'No valid rows to import'
      };
    }

    console.log('About to start processing based on import type:', options.importType);

    let allResults: ImportRowResult[] = [];
    let customersCreated = 0;
    let customersUpdated = 0;
    let receivablesCreated = 0;

    // Process based on import type with ONLY valid data
    switch (options.importType) {
      case 'customers': {
        const { results, customersCreated: created, customersUpdated: updated } =
          await processBulkCustomers(validRows as CustomerImportRow[], options);
        allResults = results;
        customersCreated = created;
        customersUpdated = updated;
        break;
      }
      case 'receivables': {
        const { results, receivablesCreated: created, customersCreated: custCreated } =
          await processBulkReceivables(validRows as ReceivableImportRow[], options);
        allResults = results;
        receivablesCreated = created;
        customersCreated = custCreated;
        break;
      }
      case 'combined': {
        console.log('Processing combined import with', validRows.length, 'valid rows');
        console.log('Sample valid data being processed:', validRows.slice(0, 2));
        const { results, customersCreated: custCreated, customersUpdated: custUpdated, receivablesCreated: recCreated } =
          await processCombinedImport(validRows as CombinedImportRow[], options);
        console.log('Combined processing completed. Results count:', results.length);
        allResults = results;
        customersCreated = custCreated;
        customersUpdated = custUpdated;
        receivablesCreated = recCreated;
        break;
      }
      default:
        return {
          success: false,
          error: 'Invalid import type'
        };
    }

    // Calculate summary
    const successCount = allResults.filter(r => r.success).length;
    const processingErrorCount = allResults.filter(r => !r.success).length;
    const processingErrors = allResults.flatMap(r => r.errors || []);

    // Combine validation errors with processing errors
    const allErrors = [...validationErrors, ...processingErrors];
    const totalErrorCount = validationErrors.length + processingErrorCount;

    console.log('Import execution completed!');
    console.log('Success count:', successCount);
    console.log('Validation errors:', validationErrors.length);
    console.log('Processing errors:', processingErrorCount);
    console.log('Total errors:', totalErrorCount);
    console.log('Customers created:', customersCreated);
    console.log('Customers updated:', customersUpdated);
    console.log('Receivables created:', receivablesCreated);

    const result: BulkImportResult = {
      success: totalErrorCount === 0,
      totalRows: data.length,
      processedRows: allResults.length,
      successCount,
      errorCount: totalErrorCount,
      customersCreated,
      customersUpdated,
      receivablesCreated,
      results: allResults,
      errors: allErrors
    };

    // Revalidate relevant pages
    if (customersCreated > 0 || customersUpdated > 0) {
      revalidatePath('/customers');
      revalidatePath('/receivables/customers');
    }
    if (receivablesCreated > 0) {
      revalidatePath('/receivables');
    }

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('Error executing bulk import:', error);
    return {
      success: false,
      error: 'Failed to execute bulk import'
    };
  }
}