# API Specification

## Next.js Server Actions (Primary)

Server Actions handle form submissions and mutations with type safety:

```typescript
// Server Actions for form processing (app/lib/actions.ts)

// Document Upload Action
export async function uploadDocumentAction(formData: FormData): Promise<ActionResult<Document>> {
  const files = formData.getAll('files') as File[];
  const customerId = formData.get('customerId') as string;
  const category = formData.get('category') as DocumentCategory;
  
  try {
    // File validation, storage, and database insertion
    const documents = await uploadDocuments(files, customerId, category);
    revalidatePath('/documents');
    return { success: true, data: documents };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Customer Follow-up Action
export async function createFollowUpAction(formData: FormData): Promise<ActionResult<FollowUp>> {
  const customerId = formData.get('customerId') as string;
  const notes = formData.get('notes') as string;
  const followUpType = formData.get('type') as FollowUpType;
  
  try {
    const followUp = await createFollowUp({ customerId, notes, followUpType });
    revalidatePath(`/customers/${customerId}`);
    return { success: true, data: followUp };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Sales Report Submission Action
export async function submitSalesReportAction(formData: FormData): Promise<ActionResult<SalesReport>> {
  const outletId = formData.get('outletId') as string;
  const date = new Date(formData.get('date') as string);
  const cashAmount = parseFloat(formData.get('cashAmount') as string);
  const cardAmount = parseFloat(formData.get('cardAmount') as string);
  
  try {
    const report = await submitSalesReport({ outletId, date, cashAmount, cardAmount });
    revalidatePath('/sales-reports');
    return { success: true, data: report };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

type ActionResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
}
```

## REST API Routes (Secondary)

REST endpoints for data fetching and complex operations documented with OpenAPI 3.0 specification for customer management, receivables dashboard, sales report review, and ZKT attendance integration endpoints.
