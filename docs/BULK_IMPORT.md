# Bulk Import Feature

## Overview

The bulk import feature allows authorized users to import multiple customers and invoices efficiently using CSV files. This feature is accessible from the Receivables page and supports three import modes:

1. **Customers Only** - Import customer records
2. **Invoices Only** - Import invoice/receivable records
3. **Combined** - Import both customers and invoices in a single operation

## Access Control

- **Admin** - Full access to all import types
- **Manager** - Full access to all import types
- **Accounts** - Full access to all import types
- **Sales** - No access to bulk import
- **Accountant** - No access to bulk import

## Supported Formats

- **CSV** files (comma-separated values)
- **Manual data entry** via copy/paste

## Import Types & Templates

### 1. Customers Only

**Required Fields:**
- `name` - Customer name (string)
- `paymentTerms` - Payment terms in days (number)
- `isActive` - Active status (boolean)

**Optional Fields:**
- `email` - Email address (string)
- `phone` - Phone number (string)
- `address` - Address (string)

**Example CSV:**
```csv
name,email,phone,address,paymentTerms,isActive
"Example Customer Ltd","contact@example.com","+960 123-4567","Male, Maldives",30,true
"Another Company","info@another.com","+960 987-6543","Addu City, Maldives",45,true
```

### 2. Invoices Only

**Required Fields:**
- `invoiceNumber` - Unique invoice number (string)
- `customerName` - Customer name for matching (string)
- `amount` - Invoice amount in MVR (number)
- `invoiceDate` - Invoice date in YYYY-MM-DD format (date)
- `assignedTo` - Assigned user role (enum: ADMIN, SALES, ACCOUNTS, MANAGER, ACCOUNTANT)

**Optional Fields:**
- `customerEmail` - Customer email for matching (string)
- `paidAmount` - Amount already paid (number, default: 0)

**Example CSV:**
```csv
invoiceNumber,customerName,customerEmail,amount,invoiceDate,paidAmount,assignedTo
"INV-2024-001","Example Customer Ltd","contact@example.com",1500.00,"2024-01-15",0,SALES
"INV-2024-002","Another Company","info@another.com",2500.00,"2024-01-16",500,ACCOUNTS
```

### 3. Combined Import

Combines both customer and invoice data in a single CSV file.

**Required Fields:**
- `customerName` - Customer name (string)
- `invoiceNumber` - Unique invoice number (string)
- `amount` - Invoice amount in MVR (number)
- `invoiceDate` - Invoice date in YYYY-MM-DD format (date)
- `assignedTo` - Assigned user role (enum)

**Optional Fields:**
- `customerEmail` - Customer email (string)
- `customerPhone` - Customer phone (string)
- `customerAddress` - Customer address (string)
- `customerPaymentTerms` - Payment terms in days (number, default: 30)
- `paidAmount` - Amount already paid (number, default: 0)

**Example CSV:**
```csv
customerName,customerEmail,customerPhone,customerAddress,customerPaymentTerms,invoiceNumber,amount,invoiceDate,paidAmount,assignedTo
"Example Customer Ltd","contact@example.com","+960 123-4567","Male, Maldives",30,"INV-2024-001",1500.00,"2024-01-15",0,SALES
```

## Import Process

### Step 1: Upload Data
- **File Upload**: Choose a CSV file from your computer
- **Manual Entry**: Copy and paste CSV data directly

### Step 2: Configure Import
- Select import type (customers, invoices, or combined)
- Choose options:
  - **Update Existing**: Update existing records with new data
  - **Skip Duplicates**: Skip records that already exist (recommended)

### Step 3: Preview & Validate
- Review validation results
- Check for errors and duplicates
- View sample of valid data

### Step 4: Execute Import
- Process the import operation
- Monitor progress and results

## Data Validation

### Field Validation
- **String fields**: Length limits and format validation
- **Number fields**: Positive values, decimal precision
- **Date fields**: YYYY-MM-DD format validation
- **Boolean fields**: Accepts true/false, 1/0, yes/no
- **Enum fields**: Must match allowed values

### Business Rules
- **Invoice numbers** must be unique across the system
- **Customer matching** by name and/or email
- **Payment amounts** cannot exceed invoice amounts
- **Due dates** calculated automatically based on payment terms

### Error Handling
- Row-by-row validation with detailed error messages
- Duplicate detection within import data and against existing records
- Graceful handling of partial failures

## Import Results

After completion, you'll see:
- **Total rows processed**
- **Success/error counts**
- **Customers created/updated**
- **Invoices created**
- **Detailed error log** for failed records

## Best Practices

1. **Prepare Data Carefully**
   - Ensure customer names are consistent for matching
   - Use unique invoice numbers
   - Validate dates and amounts before import

2. **Start Small**
   - Test with a small batch first
   - Use preview mode to validate data

3. **Handle Duplicates**
   - Enable "Skip Duplicates" for safe imports
   - Use "Update Existing" only when intentionally updating records

4. **Data Backup**
   - Export existing data before large imports
   - Keep import files for reference

## Error Resolution

### Common Issues
- **Invalid date format**: Use YYYY-MM-DD format
- **Duplicate invoice numbers**: Ensure uniqueness
- **Missing customer**: Create customer first or use combined import
- **Invalid user role**: Use ADMIN, SALES, ACCOUNTS, MANAGER, or ACCOUNTANT

### Troubleshooting
- Check field mappings in CSV headers
- Validate data types and formats
- Review error messages for specific issues
- Contact system administrator for permission issues

## API Endpoints

### GET /api/bulk-import
Returns templates and documentation for bulk import formats.

### POST /api/bulk-import
Executes bulk import operations with validation and processing.

**Request Body:**
```json
{
  "csvText": "CSV data as string",
  "options": {
    "importType": "customers|receivables|combined",
    "updateExisting": false,
    "skipDuplicates": true,
    "validateOnly": false
  }
}
```

## Technical Notes

- **Database**: SQLite with Prisma ORM
- **Validation**: Zod schema validation
- **Authentication**: NextAuth.js session-based
- **File Processing**: Server-side CSV parsing
- **Error Tracking**: Comprehensive audit logging

## Feature Integration

The bulk import feature integrates with:
- **Receivables Management**: Creates invoices with proper status
- **Customer Management**: Creates/updates customer records
- **Audit System**: Logs all import activities
- **Permission System**: Role-based access control
- **Follow-up System**: Integrates with invoice follow-up workflow