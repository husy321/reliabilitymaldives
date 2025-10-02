import { DocumentCategory } from './document';

export interface FileUploadState {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  uploadStartTime?: number;
}

export enum UploadStatus {
  QUEUED = 'QUEUED',
  UPLOADING = 'UPLOADING', 
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED'
}

export interface UploadQueue {
  files: FileUploadState[];
  totalFiles: number;
  completedFiles: number;
  overallProgress: number;
  isUploading: boolean;
}

export interface DragDropState {
  isDragOver: boolean;
  isDragActive: boolean;
  hasFiles: boolean;
}

export interface UploadOptions {
  category?: DocumentCategory;
  customerId?: string;
  receivableId?: string;
  salesReportId?: string;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
}

export interface UploadProgressEvent {
  fileId: string;
  loaded: number;
  total: number;
  progress: number;
}