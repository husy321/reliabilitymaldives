'use client';

import React, { useCallback, useState } from 'react';
import { FileText, Eye, Download, Trash2, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentWithUser, DocumentCategory } from '../../../types/document';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface DocumentListProps {
  documents: DocumentWithUser[];
  receivableId: string;
  currentUserRole: string;
  showUploadZone?: boolean;
  allowRemoval?: boolean;
  allowDownload?: boolean;
  groupByCategory?: boolean;
  sortBy?: 'date' | 'name' | 'category';
  sortOrder?: 'asc' | 'desc';
  onDocumentUpload?: (files: File[]) => Promise<void>;
  onDocumentRemove?: (documentId: string) => Promise<void>;
  onDocumentPreview?: (documentId: string) => void;
  onBulkDownload?: (documentIds: string[]) => Promise<void>;
  loading?: boolean;
}

const CategoryBadgeVariants: Record<DocumentCategory, string> = {
  [DocumentCategory.INVOICE]: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300",
  [DocumentCategory.PURCHASE_ORDER]: "bg-green-100 text-green-800 hover:bg-green-200 border-green-300",
  [DocumentCategory.DELIVERY_ORDER]: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300",
  [DocumentCategory.SALES_RECEIPT]: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300",
  [DocumentCategory.OTHER]: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300",
};

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  const dateObj = new Date(date);
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

export function DocumentList({
  documents,
  receivableId,
  currentUserRole,
  showUploadZone = true,
  allowRemoval = true,
  allowDownload = true,
  groupByCategory = false,
  sortBy = 'date',
  sortOrder = 'desc',
  onDocumentUpload,
  onDocumentRemove,
  onDocumentPreview,
  onBulkDownload,
  loading = false
}: DocumentListProps) {
  // Suppress unused variable warnings for props that may be used in future iterations
  void receivableId;
  void currentUserRole;
  const { showSuccess, showError } = useToast();
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [removingDocument, setRemovingDocument] = useState<string | null>(null);

  // Sort documents based on props
  const sortedDocuments = useCallback(() => {
    const sorted = [...documents].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.originalName.localeCompare(b.originalName);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'date':
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [documents, sortBy, sortOrder]);

  // Group documents by category if requested
  const groupedDocuments = useCallback(() => {
    const sorted = sortedDocuments();
    
    if (!groupByCategory) {
      return { 'All Documents': sorted };
    }
    
    return sorted.reduce((groups, doc) => {
      const category = doc.category.replace('_', ' ');
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(doc);
      return groups;
    }, {} as Record<string, DocumentWithUser[]>);
  }, [sortedDocuments, groupByCategory]);

  // Handle document selection
  const toggleDocumentSelection = useCallback((documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  }, [selectedDocuments]);

  // Handle bulk operations
  const handleBulkDownload = useCallback(async () => {
    if (selectedDocuments.size === 0 || !onBulkDownload) return;
    
    try {
      await onBulkDownload(Array.from(selectedDocuments));
      showSuccess(`Downloaded ${selectedDocuments.size} documents`, { title: 'Download Complete' });
    } catch (err) {
      console.error('Error downloading documents:', err);
      showError('Failed to download documents', { title: 'Download Error' });
    }
  }, [selectedDocuments, onBulkDownload, showSuccess, showError]);

  // Handle document removal
  const handleDocumentRemove = useCallback(async (documentId: string) => {
    if (!onDocumentRemove) return;
    
    setRemovingDocument(documentId);
    try {
      await onDocumentRemove(documentId);
      showSuccess('Document removed from receivable', { title: 'Document Removed' });
    } catch (err) {
      console.error('Error removing document:', err);
      showError('Failed to remove document', { title: 'Remove Error' });
    } finally {
      setRemovingDocument(null);
    }
  }, [onDocumentRemove, showSuccess, showError]);

  // Handle file drop for upload zone
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (!onDocumentUpload) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      try {
        await onDocumentUpload(files);
      } catch (err) {
        console.error('Error uploading documents:', err);
        showError('Failed to upload documents', { title: 'Upload Error' });
      }
    }
  }, [onDocumentUpload, showError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Render upload zone
  const renderUploadZone = () => {
    if (!showUploadZone || !onDocumentUpload) return null;
    
    return (
      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop files here to upload to this receivable
        </p>
        <p className="text-xs text-muted-foreground">
          Supported: PDF, Images, Excel files (max 10MB each)
        </p>
      </div>
    );
  };

  // Render individual document item
  const renderDocumentItem = (document: DocumentWithUser) => {
    const isRemoving = removingDocument === document.id;
    
    return (
      <div key={document.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedDocuments.has(document.id)}
              onChange={() => toggleDocumentSelection(document.id)}
              className="rounded"
            />
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium truncate">{document.originalName}</p>
              <Badge 
                variant="outline" 
                className={cn("text-xs", CategoryBadgeVariants[document.category])}
              >
                {document.category.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatFileSize(document.fileSize)}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>Uploaded {formatDate(document.createdAt)}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>by {document.uploadedBy.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {allowDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDocumentPreview?.(document.id)}
              className="h-8 w-8 p-0"
              title="Preview document"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          {allowDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDocumentPreview?.(document.id)} // This should be download action
              className="h-8 w-8 p-0"
              title="Download document"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          
          {allowRemoval && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDocumentRemove(document.id)}
              disabled={isRemoving}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              title="Remove document from receivable"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const documentGroups = groupedDocuments();
  const totalDocuments = documents.length;
  const hasSelectedDocuments = selectedDocuments.size > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Linked Documents ({totalDocuments})
          </CardTitle>
          
          {hasSelectedDocuments && onBulkDownload && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDownload}
                className="text-xs"
              >
                Download Selected ({selectedDocuments.size})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocuments(new Set())}
                className="text-xs"
              >
                Clear Selection
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading documents...</span>
          </div>
        ) : totalDocuments === 0 ? (
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No documents are currently linked to this receivable. Upload documents to keep track of invoices, purchase orders, and supporting materials.
              </AlertDescription>
            </Alert>
            {renderUploadZone()}
          </div>
        ) : (
          <div className="space-y-4">
            {renderUploadZone()}
            
            <div className="space-y-4">
              {Object.entries(documentGroups).map(([groupName, groupDocuments]) => (
                <div key={groupName} className="space-y-2">
                  {groupByCategory && (
                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                      {groupName} ({groupDocuments.length})
                    </h4>
                  )}
                  
                  <div className="space-y-2">
                    {groupDocuments.map(renderDocumentItem)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}