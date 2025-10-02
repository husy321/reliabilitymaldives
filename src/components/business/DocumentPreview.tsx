"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, X, FileText, Image, FileIcon } from "lucide-react";
import { DocumentWithUser, DocumentDownloadProgress } from "../../../types/document";

interface DocumentPreviewProps {
  document: DocumentWithUser;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (documentId: string) => Promise<void>;
  currentUserRole: string;
  downloadProgress?: DocumentDownloadProgress;
}

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function getFileTypeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-5 w-5" />;
  } else if (mimeType === 'application/pdf') {
    return <FileText className="h-5 w-5" />;
  } else {
    return <FileIcon className="h-5 w-5" />;
  }
}

function isPreviewable(mimeType: string): boolean {
  const previewableMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  return previewableMimeTypes.includes(mimeType.toLowerCase());
}

function DocumentPreviewContent({ document }: { document: DocumentWithUser }) {
  const [previewUrl, setPreviewUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error] = React.useState<string>('');

  React.useEffect(() => {
    if (isPreviewable(document.mimeType)) {
      setLoading(true);
      // TODO: Generate secure preview URL through Server Action
      // This would be implemented in the previewDocumentAction
      const mockPreviewUrl = `/api/documents/${document.id}/preview`;
      setPreviewUrl(mockPreviewUrl);
      setLoading(false);
    }
  }, [document]);

  if (!isPreviewable(document.mimeType)) {
    return (
      <Alert>
        <FileIcon className="h-4 w-4" />
        <AlertDescription>
          Preview not available for this file type. Use the download button to view the file.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (document.mimeType === 'application/pdf') {
    return (
      <div className="w-full h-96 border rounded">
        <iframe
          src={previewUrl}
          className="w-full h-full"
          title={`Preview of ${document.originalName}`}
        />
      </div>
    );
  }

  if (document.mimeType.startsWith('image/')) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={previewUrl}
          alt={document.originalName}
          className="max-w-full max-h-96 object-contain rounded"
        />
      </div>
    );
  }

  return null;
}

export default function DocumentPreview({
  document,
  isOpen,
  onClose,
  onDownload,
  downloadProgress
}: DocumentPreviewProps) {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await onDownload(document.id);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  const isDownloading = downloading || downloadProgress?.status === 'downloading';
  const downloadProgressValue = downloadProgress?.progress || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            {getFileTypeIcon(document.mimeType)}
            <div>
              <DialogTitle className="text-lg font-semibold">
                {document.originalName}
              </DialogTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">
                  {document.category.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(document.fileSize)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {isDownloading && downloadProgress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Downloading...</span>
              <span>{Math.round(downloadProgressValue)}%</span>
            </div>
            <Progress value={downloadProgressValue} className="h-2" />
          </div>
        )}

        <div className="mt-4">
          <DocumentPreviewContent document={document} />
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Uploaded by:</strong> {document.uploadedBy.name}</p>
            <p><strong>Upload date:</strong> {new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }).format(new Date(document.createdAt))}</p>
            <p><strong>MIME type:</strong> {document.mimeType}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}