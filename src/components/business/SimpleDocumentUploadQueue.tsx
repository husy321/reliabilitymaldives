'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { DocumentCategory } from '../../../types/document';
import { uploadDocumentAction } from '@/lib/actions/documents';

interface QueuedFile {
  id: string;
  file: File;
  category: DocumentCategory | null;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface SimpleDocumentUploadQueueProps {
  receivableId: string;
  onUploadComplete?: (uploadedFiles: number) => void;
}

const DOCUMENT_CATEGORIES = [
  { value: DocumentCategory.INVOICE, label: 'Invoice' },
  { value: DocumentCategory.PURCHASE_ORDER, label: 'Purchase Order' },
  { value: DocumentCategory.DELIVERY_ORDER, label: 'Delivery Note' },
  { value: DocumentCategory.OTHER, label: 'Other' }
];

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function SimpleDocumentUploadQueue({ receivableId, onUploadComplete }: SimpleDocumentUploadQueueProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Generate unique ID for files
  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  // Validate and add files to queue
  const handleFileSelection = useCallback((files: FileList | File[]) => {
    const filesArray = Array.from(files);
    const validFiles: QueuedFile[] = [];
    const errors: string[] = [];

    filesArray.forEach(file => {
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type not supported`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        return;
      }

      // Check for duplicates
      const isDuplicate = queuedFiles.some(qf => qf.file.name === file.name && qf.file.size === file.size);
      if (isDuplicate) {
        errors.push(`${file.name}: File already in queue`);
        return;
      }

      validFiles.push({
        id: generateFileId(),
        file,
        category: null,
        status: 'queued'
      });
    });

    if (errors.length > 0) {
      showError(errors.join('\n'), { title: 'File Validation Errors' });
    }

    if (validFiles.length > 0) {
      setQueuedFiles(prev => [...prev, ...validFiles]);
      showSuccess(`${validFiles.length} file(s) added to queue`, { title: 'Files Added' });
    }
  }, [queuedFiles, showError, showSuccess]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      handleFileSelection(files);
    }
    // Reset input
    e.target.value = '';
  }, [handleFileSelection]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      handleFileSelection(files);
    }
  }, [handleFileSelection]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Remove file from queue
  const removeFile = useCallback((fileId: string) => {
    setQueuedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Update file category
  const updateFileCategory = useCallback((fileId: string, category: DocumentCategory) => {
    setQueuedFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, category } : f
    ));
  }, []);

  // Clear completed files
  const clearCompleted = useCallback(() => {
    setQueuedFiles(prev => prev.filter(f => f.status !== 'completed'));
  }, []);

  // Upload all files with categories
  const uploadAllFiles = useCallback(async () => {
    const readyFiles = queuedFiles.filter(f => f.status === 'queued' && f.category);

    if (readyFiles.length === 0) {
      showError('No files ready for upload. Please select categories for all files.', { title: 'Upload Error' });
      return;
    }

    setIsUploading(true);
    let uploadedCount = 0;

    for (const queuedFile of readyFiles) {
      try {
        // Update status to uploading
        setQueuedFiles(prev => prev.map(f =>
          f.id === queuedFile.id ? { ...f, status: 'uploading' } : f
        ));

        // Create form data
        const formData = new FormData();
        formData.append('files', queuedFile.file);
        formData.append('category', queuedFile.category!);
        formData.append('receivableId', receivableId);

        // Upload file
        const result = await uploadDocumentAction(formData);

        if (result.success) {
          // Update status to completed
          setQueuedFiles(prev => prev.map(f =>
            f.id === queuedFile.id ? { ...f, status: 'completed' } : f
          ));
          uploadedCount++;
        } else {
          // Update status to error
          setQueuedFiles(prev => prev.map(f =>
            f.id === queuedFile.id ? { ...f, status: 'error', error: result.error } : f
          ));
          showError(`Failed to upload ${queuedFile.file.name}: ${result.error}`, { title: 'Upload Error' });
        }
      } catch (error) {
        console.error('Upload error:', error);
        setQueuedFiles(prev => prev.map(f =>
          f.id === queuedFile.id ? { ...f, status: 'error', error: 'Upload failed' } : f
        ));
        showError(`Failed to upload ${queuedFile.file.name}`, { title: 'Upload Error' });
      }
    }

    setIsUploading(false);

    if (uploadedCount > 0) {
      showSuccess(`Successfully uploaded ${uploadedCount} file(s)`, { title: 'Upload Complete' });
      onUploadComplete?.(uploadedCount);
    }
  }, [queuedFiles, receivableId, showError, showSuccess, onUploadComplete]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status icon
  const getStatusIcon = (status: QueuedFile['status']) => {
    switch (status) {
      case 'queued':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: QueuedFile['status']) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline">Queued</Badge>;
      case 'uploading':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Uploading</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
    }
  };

  const hasQueuedFiles = queuedFiles.length > 0;
  const hasReadyFiles = queuedFiles.some(f => f.status === 'queued' && f.category);
  const hasCompletedFiles = queuedFiles.some(f => f.status === 'completed');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Upload Supporting Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Click here or drag and drop files to add to upload queue
          </p>
          <p className="text-xs text-muted-foreground">
            Supported: PDF, Images, Word, Excel files (max 10MB each)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* File Queue */}
        {hasQueuedFiles && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Upload Queue ({queuedFiles.length} files)</h4>
              {hasCompletedFiles && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                  disabled={isUploading}
                >
                  Clear Completed
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {queuedFiles.map((queuedFile) => (
                <div key={queuedFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getStatusIcon(queuedFile.status)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{queuedFile.file.name}</p>
                      {getStatusBadge(queuedFile.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(queuedFile.file.size)}
                    </p>
                    {queuedFile.error && (
                      <p className="text-xs text-red-500 mt-1">{queuedFile.error}</p>
                    )}
                  </div>

                  {queuedFile.status === 'queued' && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={queuedFile.category || ''}
                        onValueChange={(value: DocumentCategory) => updateFileCategory(queuedFile.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(queuedFile.id)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Upload Actions */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                onClick={uploadAllFiles}
                disabled={!hasReadyFiles || isUploading}
                className="flex items-center gap-2"
              >
                {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload All Ready Files
              </Button>

              <div className="text-xs text-muted-foreground">
                {queuedFiles.filter(f => f.category).length} of {queuedFiles.length} files ready
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}