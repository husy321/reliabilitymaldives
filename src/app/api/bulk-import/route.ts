import { NextRequest, NextResponse } from 'next/server';
import { previewImportAction, executeBulkImportAction } from '@/lib/actions/bulk-import';
import { ImportOptions } from '../../../../types/bulk-import';

/**
 * Parse CSV data from request body
 */
function parseCSV(csvText: string): any[] {
  console.log('Parsing CSV, input length:', csvText.length);
  const lines = csvText.trim().split('\n');
  console.log('CSV lines count:', lines.length);

  if (lines.length < 2) {
    console.log('Not enough lines in CSV');
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  console.log('CSV headers:', headers);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};

    headers.forEach((header, index) => {
      let value = values[index] || '';

      // Type conversion based on field name
      if (header.includes('amount') || header.includes('Amount') || header.includes('paymentTerms') || header.includes('PaymentTerms')) {
        const numValue = parseFloat(value);
        row[header] = isNaN(numValue) ? 0 : numValue;
      } else if (header.includes('isActive') || header.includes('IsActive')) {
        row[header] = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
      } else if (header.includes('assignedTo') || header.includes('AssignedTo')) {
        // Map user role strings to enum values
        const roleMap: { [key: string]: string } = {
          'admin': 'ADMIN',
          'sales': 'SALES',
          'accounts': 'ACCOUNTS',
          'manager': 'MANAGER',
          'accountant': 'ACCOUNTANT'
        };
        row[header] = roleMap[value.toLowerCase()] || 'SALES';
      } else if (header.includes('Date') || header.includes('date')) {
        // Handle date conversion - convert various formats to YYYY-MM-DD
        if (value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            // Convert to YYYY-MM-DD format
            row[header] = date.toISOString().split('T')[0];
          } else {
            row[header] = value; // Keep original if conversion fails
          }
        } else {
          row[header] = value;
        }
      } else {
        row[header] = value;
      }
    });

    // Convert field names to expected format
    const normalizedRow: any = {};
    Object.keys(row).forEach(key => {
      const lowerKey = key.toLowerCase();

      // Map CSV headers to expected field names
      if (lowerKey.includes('customer') && lowerKey.includes('name')) {
        normalizedRow.customerName = row[key];
      } else if (lowerKey.includes('customer') && lowerKey.includes('email')) {
        normalizedRow.customerEmail = row[key];
      } else if (lowerKey.includes('customer') && lowerKey.includes('phone')) {
        normalizedRow.customerPhone = row[key];
      } else if (lowerKey.includes('customer') && lowerKey.includes('address')) {
        normalizedRow.customerAddress = row[key];
      } else if (lowerKey.includes('customer') && lowerKey.includes('paymentterms')) {
        normalizedRow.customerPaymentTerms = row[key];
      } else if (lowerKey.includes('invoice') && lowerKey.includes('number')) {
        normalizedRow.invoiceNumber = row[key];
      } else if (lowerKey.includes('invoice') && lowerKey.includes('date')) {
        normalizedRow.invoiceDate = row[key];
      } else if (lowerKey.includes('paid') && lowerKey.includes('amount')) {
        normalizedRow.paidAmount = row[key];
      } else if (lowerKey.includes('assigned') && lowerKey.includes('to')) {
        normalizedRow.assignedTo = row[key];
      } else {
        // Use the original key if no mapping found
        normalizedRow[key] = row[key];
      }
    });

    rows.push(normalizedRow);
  }

  console.log('Parsed CSV rows:', rows.length);
  console.log('Sample row:', rows[0]);
  return rows;
}

/**
 * POST /api/bulk-import
 * Handle bulk import requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, options, csvText } = body;

    // Validate required fields
    if (!options || !options.importType) {
      return NextResponse.json(
        { success: false, error: 'Import options with type are required' },
        { status: 400 }
      );
    }

    let importData = data;

    // If CSV text is provided, parse it
    if (csvText && typeof csvText === 'string') {
      try {
        importData = parseCSV(csvText);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Failed to parse CSV data' },
          { status: 400 }
        );
      }
    }

    if (!importData || !Array.isArray(importData) || importData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid import data is required' },
        { status: 400 }
      );
    }

    const importOptions: ImportOptions = {
      importType: options.importType,
      updateExisting: options.updateExisting || false,
      skipDuplicates: options.skipDuplicates || false,
      validateOnly: options.validateOnly || false
    };

    // Execute preview or actual import based on validateOnly flag
    const result = importOptions.validateOnly
      ? await previewImportAction(importData, importOptions)
      : await executeBulkImportAction(importData, importOptions);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Bulk import API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bulk-import
 * Get bulk import templates and documentation
 */
export async function GET() {
  const templates = {
    customers: {
      headers: ['name', 'email', 'phone', 'address', 'paymentTerms', 'isActive'],
      example: [
        {
          name: 'Example Customer Ltd',
          email: 'contact@example.com',
          phone: '+960 123-4567',
          address: 'Male, Maldives',
          paymentTerms: 30,
          isActive: true
        }
      ]
    },
    receivables: {
      headers: ['invoiceNumber', 'customerName', 'customerEmail', 'amount', 'invoiceDate', 'paidAmount', 'assignedTo'],
      example: [
        {
          invoiceNumber: 'INV-2024-001',
          customerName: 'Example Customer Ltd',
          customerEmail: 'contact@example.com',
          amount: 1500.00,
          invoiceDate: '2024-01-15',
          paidAmount: 0,
          assignedTo: 'SALES'
        }
      ]
    },
    combined: {
      headers: [
        'customerName', 'customerEmail', 'customerPhone', 'customerAddress', 'customerPaymentTerms',
        'invoiceNumber', 'amount', 'invoiceDate', 'paidAmount', 'assignedTo'
      ],
      example: [
        {
          customerName: 'Example Customer Ltd',
          customerEmail: 'contact@example.com',
          customerPhone: '+960 123-4567',
          customerAddress: 'Male, Maldives',
          customerPaymentTerms: 30,
          invoiceNumber: 'INV-2024-001',
          amount: 1500.00,
          invoiceDate: '2024-01-15',
          paidAmount: 0,
          assignedTo: 'SALES'
        }
      ]
    }
  };

  const documentation = {
    supportedFormats: ['CSV', 'JSON'],
    fieldTypes: {
      string: ['name', 'email', 'phone', 'address', 'invoiceNumber', 'customerName', 'customerEmail'],
      number: ['amount', 'paidAmount', 'paymentTerms', 'customerPaymentTerms'],
      boolean: ['isActive'],
      date: ['invoiceDate'],
      enum: {
        assignedTo: ['ADMIN', 'SALES', 'ACCOUNTS', 'MANAGER', 'ACCOUNTANT']
      }
    },
    dateFormat: 'YYYY-MM-DD',
    notes: [
      'All amount fields should be in MVR',
      'Dates should be in YYYY-MM-DD format',
      'Boolean fields accept: true/false, 1/0, yes/no',
      'Customer names are used for matching - ensure consistency',
      'Invoice numbers must be unique across the system'
    ]
  };

  return NextResponse.json({
    success: true,
    data: {
      templates,
      documentation
    }
  });
}