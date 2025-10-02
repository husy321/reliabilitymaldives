'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useUploadProgress } from '@/hooks/useUploadProgress';
import { useToast } from '@/hooks/useToast';
import { DocumentCategory, Document, CategoryDetection } from '../../../types/document';
import { UploadOptions, DragDropState, UploadStatus } from '../../../types/upload';
import { cn } from '@/lib/utils';
import { CategoryConfirmationDialog } from './CategoryConfirmationDialog';
import { detectCategoriesForFiles } from '@/lib/services/documentCategorization';
import { uploadDocumentActionWithDetection } from '@/lib/actions/documents';

interface DocumentUploaderProps {
  options: UploadOptions;
  linkSalesReportId?: string; // if provided later, we auto-upload queued files
  onUploadComplete?: (documents: Document[]) => void;
  onError?: (error: string) => void;
}

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
const MAX_FILES = 10;
const UPLOAD_TIMEOUT = 30000; // 30 seconds
const MAX_CONCURRENT_UPLOADS = 3;

export function DocumentUploader({ options, linkSalesReportId, onUploadComplete, onError }: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError, showInfo } = useToast();
  const [dragState, setDragState] = useState<DragDropState>({
    isDragOver: false,
    isDragActive: false,
    hasFiles: false
  });
  
  // Category confirmation dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [categoryDetections, setCategoryDetections] = useState<CategoryDetection[]>([]);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [pendingConfirmedCategories, setPendingConfirmedCategories] = useState<{ filename: string; category: DocumentCategory }[] | null>(null);
  
  const {
    files,
    totalFiles,
    completedFiles,
    overallProgress,
    isUploading,
    addFiles,
    removeFile,
    updateFileProgress,
    updateFileStatus,
    clearCompleted,
    clearAll
  } = useUploadProgress();

  // Validate files before adding to queue
  const validateFiles = useCallback((fileList: File[]) => {
    const errors: string[] = [];
    const validFiles: File[] = [];

    for (const file of fileList) {
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed`);
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        continue;
      }

      validFiles.push(file);
    }

    // Check total file count
    if (files.length + validFiles.length > MAX_FILES) {
      errors.push(`Maximum ${MAX_FILES} files allowed`);
      return { validFiles: [], errors };
    }

    return { validFiles, errors };
  }, [files.length]);

  // Handle file selection from drag-and-drop or file input
  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    const { validFiles, errors } = validateFiles(filesArray);

    if (errors.length > 0) {
      const errorMessage = errors.join('; ');
      showError(errorMessage, { title: 'File Validation Failed' });
      onError?.(errorMessage);
      return;
    }

    if (validFiles.length > 0) {
      addFiles(validFiles);
      setDragState(prev => ({ ...prev, hasFiles: true }));
      showInfo(`${validFiles.length} file(s) added to upload queue`, { 
        title: 'Files Added' 
      });
    }
  }, [validateFiles, addFiles, onError]);

  // Drag and drop event handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({ ...prev, isDragOver: true, isDragActive: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only update if leaving the drop zone itself, not child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragState(prev => ({ ...prev, isDragOver: false, isDragActive: false }));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState(prev => ({ ...prev, isDragOver: false, isDragActive: false }));
    
    const { files: droppedFiles } = e.dataTransfer;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  // File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);


  // Start upload process with category confirmation workflow
  const startUpload = useCallback(async () => {
    const queuedFiles = files.filter(f => f.status === UploadStatus.QUEUED);
    
    if (queuedFiles.length === 0) {
      return;
    }

    // Convert FileState objects to File objects for category detection
    const fileObjects = queuedFiles.map(f => f.file);
    
    try {
      // Perform automatic category detection
      const detections = detectCategoriesForFiles(fileObjects);
      
      // If all detections are non-ambiguous and HIGH confidence, auto-confirm
      const allHighAndCertain = detections.every(d => !d.isAmbiguous && d.confidence === 'HIGH');
      if (allHighAndCertain) {
        const autoCategories = detections.map(d => ({ filename: d.filename, category: d.detectedCategory }));
        await handleCategoryConfirmation(autoCategories);
        return;
      }

      // Else show confirmation dialog
      setPendingFiles(fileObjects);
      setCategoryDetections(detections);
      setShowCategoryDialog(true);
      
    } catch (error) {
      console.error('Category detection error:', error);
      showError('Failed to analyze document categories', { title: 'Category Detection Error' });
    }
  }, [files, detectCategoriesForFiles, showError]);

  // Handle confirmed categories from dialog
  const handleCategoryConfirmation = useCallback(async (
    confirmedCategories: { filename: string; category: DocumentCategory }[]
  ) => {
    setIsProcessingUpload(true);
    
    try {
      // If no sales report link is available yet, defer upload until it is provided
      const effectiveSalesReportId = linkSalesReportId || options.salesReportId;
      if (!effectiveSalesReportId && !options.receivableId && !options.customerId) {
        setPendingConfirmedCategories(confirmedCategories);
        showInfo('Ready to upload after the sales report is created', { title: 'Upload Deferred' });
        return;
      }
      // Prepare form data for upload
      const formData = new FormData();
      
      // Add all pending files to form data
      pendingFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Add additional form fields
      if (options.customerId) formData.append('customerId', options.customerId);
      if (options.receivableId) formData.append('receivableId', options.receivableId);
      if (effectiveSalesReportId) formData.append('salesReportId', effectiveSalesReportId);
      
      // Update file statuses to uploading
      pendingFiles.forEach(file => {
        const fileState = files.find(f => f.file.name === file.name);
        if (fileState) {
          updateFileStatus(fileState.id, UploadStatus.UPLOADING);
        }
      });
      
      // Call the enhanced upload action with confirmed categories
      const result = await uploadDocumentActionWithDetection(formData, confirmedCategories);
      
      if (result.success) {
        // Update file statuses to completed
        pendingFiles.forEach(file => {
          const fileState = files.find(f => f.file.name === file.name);
          if (fileState) {
            updateFileStatus(fileState.id, UploadStatus.COMPLETED);
          }
        });
        
        showSuccess(`Successfully uploaded ${pendingFiles.length} document${pendingFiles.length > 1 ? 's' : ''}!`, {
          title: 'Upload Complete'
        });
        
        onUploadComplete?.(result.data.documents);
      } else {
        // Handle upload failure
        pendingFiles.forEach(file => {
          const fileState = files.find(f => f.file.name === file.name);
          if (fileState) {
            updateFileStatus(fileState.id, UploadStatus.ERROR, result.error);
          }
        });
        
        showError(result.error, { title: 'Upload Failed' });
        onError?.(result.error);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      // Mark all files as failed
      pendingFiles.forEach(file => {
        const fileState = files.find(f => f.file.name === file.name);
        if (fileState) {
          updateFileStatus(fileState.id, UploadStatus.ERROR, errorMessage);
        }
      });
      
      showError(errorMessage, { title: 'Upload Error' });
      onError?.(errorMessage);
    } finally {
      setIsProcessingUpload(false);
      setShowCategoryDialog(false);
      setPendingFiles([]);
      setCategoryDetections([]);
      setPendingConfirmedCategories(null);
    }
  }, [
    pendingFiles, 
    options, 
    files, 
    updateFileStatus, 
    showSuccess, 
    showError, 
    onUploadComplete, 
    onError,
    linkSalesReportId
  ]);

  // If a salesReportId arrives after category confirmation, auto-upload
  React.useEffect(() => {
    if (linkSalesReportId && pendingFiles.length > 0 && pendingConfirmedCategories && !isProcessingUpload) {
      // Trigger upload with the now available link id
      (async () => {
        await handleCategoryConfirmation(pendingConfirmedCategories);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkSalesReportId]);

  // Handle dialog cancellation
  const handleCategoryCancel = useCallback(() => {
    setShowCategoryDialog(false);
    setPendingFiles([]);
    setCategoryDetections([]);
    showInfo('Upload cancelled', { title: 'Cancelled' });
  }, [showInfo]);

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case UploadStatus.UPLOADING:
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case UploadStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case UploadStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case UploadStatus.CANCELLED:
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: UploadStatus) => {
    switch (status) {
      case UploadStatus.UPLOADING:
        return <Badge variant="outline">Uploading</Badge>;
      case UploadStatus.COMPLETED:
        return <Badge variant="default">Completed</Badge>;
      case UploadStatus.ERROR:
        return <Badge variant="destructive">Error</Badge>;
      case UploadStatus.CANCELLED:
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Queued</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category will be determined automatically with confirmation dialog */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            📄 Document categories will be automatically detected and confirmed before upload
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            dragState.isDragOver ? "border-primary bg-primary/5" : "border-border",
            dragState.isDragActive ? "border-primary" : "",
            "hover:border-primary/50 cursor-pointer"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_FILE_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <div className="space-y-2">
            <Upload className={cn(
              "h-8 w-8 mx-auto",
              dragState.isDragOver ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="text-sm">
              {dragState.isDragOver 
                ? "Drop files here..." 
                : "Drag and drop files here, or click to browse"
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Max {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each
            </p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Files ({files.length})</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                  disabled={completedFiles === 0}
                >
                  Clear Completed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Overall Progress */}
            {totalFiles > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{completedFiles}/{totalFiles} completed</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            )}

            {/* Individual File Progress */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((fileState) => (
                <div key={fileState.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(fileState.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {fileState.file.name}
                        </p>
                        {getStatusBadge(fileState.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(fileState.file.size)}</span>
                        {fileState.error && (
                          <span className="text-red-600">{fileState.error}</span>
                        )}
                      </div>
                      {fileState.status === UploadStatus.UPLOADING && (
                        <Progress value={fileState.progress} className="h-1 mt-1" />
                      )}
                      {fileState.status === UploadStatus.COMPLETED && fileState.uploadStartTime && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Upload time: {Math.round((Date.now() - fileState.uploadStartTime) / 1000)}s
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileState.id)}
                      disabled={fileState.status === UploadStatus.UPLOADING}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Actions */}
        {files.length > 0 && (
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || files.length >= MAX_FILES}
            >
              Add More Files
            </Button>
            <Button
              onClick={startUpload}
              disabled={isUploading || files.filter(f => f.status === UploadStatus.QUEUED).length === 0}
              className="min-w-24"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Review & Upload'
              )}
            </Button>
          </div>
        )}

        {/* Category Confirmation Dialog */}
        <CategoryConfirmationDialog
          files={pendingFiles}
          categoryDetections={categoryDetections}
          isOpen={showCategoryDialog}
          onConfirm={handleCategoryConfirmation}
          onCancel={handleCategoryCancel}
          isProcessing={isProcessingUpload}
        />
      </CardContent>
    </Card>
  );
}