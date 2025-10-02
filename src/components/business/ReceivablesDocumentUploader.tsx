'use client';

import { DocumentUploader } from './DocumentUploader';
import { Document } from '../../../types/document';
import { UploadOptions } from '../../../types/upload';

interface ReceivablesDocumentUploaderProps {
  options?: Partial<UploadOptions>;
  receivableId?: string;
  onUploadComplete?: (files: File[]) => Promise<void>;
}

export function ReceivablesDocumentUploader({ options = {}, receivableId, onUploadComplete }: ReceivablesDocumentUploaderProps) {
  const uploadOptions: UploadOptions = {
    // Don't set a default category to allow auto-detection for Invoice, PO, Delivery Note
    maxFiles: 10,
    maxFileSize: 10 * 1024 * 1024,
    receivableId,
    ...options
  };

  const handleUploadComplete = async (documents: Document[]) => {
    console.log('Receivables documents uploaded:', documents);

    // Call the parent callback if provided
    if (onUploadComplete) {
      try {
        // Convert documents to files for the callback
        // Note: This is a simplified conversion since we don't have the original File objects
        const fileObjects = documents.map(doc => ({
          name: doc.originalName,
          size: doc.fileSize,
          type: doc.mimeType
        })) as File[];

        await onUploadComplete(fileObjects);
      } catch (error) {
        console.error('Error in upload complete callback:', error);
      }
    }
  };

  const handleError = (error: string) => {
    console.error('Receivables document upload error:', error);
    // Here you could add more sophisticated error handling like:
    // - Showing user-friendly error messages
    // - Error reporting/logging
    // - Retry mechanisms
    // - Analytics tracking
    // - Fallback upload options
  };

  return (
    <DocumentUploader
      options={uploadOptions}
      onUploadComplete={handleUploadComplete}
      onError={handleError}
    />
  );
}