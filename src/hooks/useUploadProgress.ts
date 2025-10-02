import { create } from 'zustand';
import { FileUploadState, UploadQueue, UploadStatus, UploadProgressEvent } from '../../types/upload';

interface UploadStore extends UploadQueue {
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  updateFileProgress: (event: UploadProgressEvent) => void;
  updateFileStatus: (fileId: string, status: UploadStatus, error?: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  cancelUpload: (fileId: string) => void;
  getFileById: (fileId: string) => FileUploadState | undefined;
}

export const useUploadProgress = create<UploadStore>((set, get) => ({
  files: [],
  totalFiles: 0,
  completedFiles: 0,
  overallProgress: 0,
  isUploading: false,

  addFiles: (files: File[]) => {
    const newFileStates: FileUploadState[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: UploadStatus.QUEUED,
      progress: 0
    }));

    set(state => ({
      files: [...state.files, ...newFileStates],
      totalFiles: state.totalFiles + files.length
    }));
  },

  removeFile: (fileId: string) => {
    set(state => {
      const fileToRemove = state.files.find(f => f.id === fileId);
      const newFiles = state.files.filter(f => f.id !== fileId);
      const wasCompleted = fileToRemove?.status === UploadStatus.COMPLETED;
      
      return {
        files: newFiles,
        totalFiles: Math.max(0, state.totalFiles - 1),
        completedFiles: wasCompleted ? Math.max(0, state.completedFiles - 1) : state.completedFiles,
        overallProgress: newFiles.length === 0 ? 0 : (state.completedFiles / newFiles.length) * 100
      };
    });
  },

  updateFileProgress: (event: UploadProgressEvent) => {
    set(state => {
      const updatedFiles = state.files.map(file =>
        file.id === event.fileId
          ? { ...file, progress: event.progress }
          : file
      );

      return {
        files: updatedFiles,
        overallProgress: state.totalFiles > 0 
          ? (updatedFiles.reduce((sum, file) => sum + file.progress, 0) / state.totalFiles)
          : 0
      };
    });
  },

  updateFileStatus: (fileId: string, status: UploadStatus, error?: string) => {
    set(state => {
      const updatedFiles = state.files.map(file =>
        file.id === fileId
          ? { 
              ...file, 
              status, 
              error,
              progress: status === UploadStatus.COMPLETED ? 100 : file.progress,
              uploadStartTime: status === UploadStatus.UPLOADING ? Date.now() : file.uploadStartTime
            }
          : file
      );

      const completedFiles = updatedFiles.filter(f => f.status === UploadStatus.COMPLETED).length;
      const isUploading = updatedFiles.some(f => f.status === UploadStatus.UPLOADING);

      return {
        files: updatedFiles,
        completedFiles,
        isUploading,
        overallProgress: state.totalFiles > 0 ? (completedFiles / state.totalFiles) * 100 : 0
      };
    });
  },

  clearCompleted: () => {
    set(state => ({
      files: state.files.filter(f => f.status !== UploadStatus.COMPLETED),
      totalFiles: state.files.filter(f => f.status !== UploadStatus.COMPLETED).length,
      completedFiles: 0,
      overallProgress: 0
    }));
  },

  clearAll: () => {
    set({
      files: [],
      totalFiles: 0,
      completedFiles: 0,
      overallProgress: 0,
      isUploading: false
    });
  },

  cancelUpload: (fileId: string) => {
    set(state => ({
      files: state.files.map(file =>
        file.id === fileId && file.status === UploadStatus.UPLOADING
          ? { ...file, status: UploadStatus.CANCELLED }
          : file
      )
    }));
  },

  getFileById: (fileId: string) => {
    const state = get();
    return state.files.find(f => f.id === fileId);
  }
}));