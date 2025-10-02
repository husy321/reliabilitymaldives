export async function exportFollowupHistory(filters: {
  startDate?: Date,
  endDate?: Date,
  customerId?: string,
  invoiceId?: string
}) {
  // Placeholder implementation; integrate @react-pdf/renderer or pdfkit if approved
  const summary = `Follow-up export from ${filters.startDate ?? 'N/A'} to ${filters.endDate ?? 'N/A'} for customer ${filters.customerId ?? 'any'} and receivable ${filters.invoiceId ?? 'any'}`;
  return Buffer.from(summary, 'utf-8');
}
