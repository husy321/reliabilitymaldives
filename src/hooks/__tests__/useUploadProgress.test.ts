import { renderHook, act } from '@testing-library/react';
import { useUploadProgress } from '../useUploadProgress';
import { UploadStatus } from '../../../types/upload';

describe('useUploadProgress', () => {
  const mockFile1 = new File(['test content 1'], 'test1.pdf', {
    type: 'application/pdf'
  });

  const mockFile2 = new File(['test content 2'], 'test2.pdf', {
    type: 'application/pdf'
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('initializes with empty state', () => {
      const { result } = renderHook(() => useUploadProgress());

      expect(result.current.files).toEqual([]);
      expect(result.current.totalFiles).toBe(0);
      expect(result.current.completedFiles).toBe(0);
      expect(result.current.overallProgress).toBe(0);
      expect(result.current.isUploading).toBe(false);
    });
  });

  describe('Adding Files', () => {
    test('adds single file to queue', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.totalFiles).toBe(1);
      expect(result.current.files[0].file).toBe(mockFile1);
      expect(result.current.files[0].status).toBe(UploadStatus.QUEUED);
      expect(result.current.files[0].progress).toBe(0);
      expect(result.current.files[0].id).toBeDefined();
    });

    test('adds multiple files to queue', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1, mockFile2]);
      });

      expect(result.current.files).toHaveLength(2);
      expect(result.current.totalFiles).toBe(2);
      expect(result.current.files[0].file).toBe(mockFile1);
      expect(result.current.files[1].file).toBe(mockFile2);
    });

    test('generates unique IDs for files', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1, mockFile2]);
      });

      const ids = result.current.files.map(f => f.id);
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[0]).toMatch(/^\d+-[a-z0-9]{9}$/);
      expect(ids[1]).toMatch(/^\d+-[a-z0-9]{9}$/);
    });
  });

  describe('Removing Files', () => {
    test('removes file from queue', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1, mockFile2]);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.removeFile(fileId);
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.totalFiles).toBe(1);
      expect(result.current.files[0].file).toBe(mockFile2);
    });

    test('updates completed count when removing completed file', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.updateFileStatus(fileId, UploadStatus.COMPLETED);
      });

      expect(result.current.completedFiles).toBe(1);

      act(() => {
        result.current.removeFile(fileId);
      });

      expect(result.current.completedFiles).toBe(0);
      expect(result.current.totalFiles).toBe(0);
    });

    test('handles removal of non-existent file', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      const originalLength = result.current.files.length;

      act(() => {
        result.current.removeFile('non-existent-id');
      });

      expect(result.current.files).toHaveLength(originalLength);
    });
  });

  describe('Progress Updates', () => {
    test('updates file progress', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.updateFileProgress({
          fileId,
          loaded: 500,
          total: 1000,
          progress: 50
        });
      });

      expect(result.current.files[0].progress).toBe(50);
      expect(result.current.overallProgress).toBe(50);
    });

    test('calculates overall progress correctly', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1, mockFile2]);
      });

      const [file1Id, file2Id] = result.current.files.map(f => f.id);

      act(() => {
        result.current.updateFileProgress({
          fileId: file1Id,
          loaded: 250,
          total: 1000,
          progress: 25
        });
      });

      act(() => {
        result.current.updateFileProgress({
          fileId: file2Id,
          loaded: 750,
          total: 1000,
          progress: 75
        });
      });

      expect(result.current.overallProgress).toBe(50); // (25 + 75) / 2
    });
  });

  describe('Status Updates', () => {
    test('updates file status to uploading', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.updateFileStatus(fileId, UploadStatus.UPLOADING);
      });

      expect(result.current.files[0].status).toBe(UploadStatus.UPLOADING);
      expect(result.current.files[0].uploadStartTime).toBeDefined();
      expect(result.current.isUploading).toBe(true);
    });

    test('updates file status to completed', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.updateFileStatus(fileId, UploadStatus.COMPLETED);
      });

      expect(result.current.files[0].status).toBe(UploadStatus.COMPLETED);
      expect(result.current.files[0].progress).toBe(100);
      expect(result.current.completedFiles).toBe(1);
      expect(result.current.overallProgress).toBe(100);
      expect(result.current.isUploading).toBe(false);
    });

    test('updates file status to error with message', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.updateFileStatus(fileId, UploadStatus.ERROR, 'Upload failed');
      });

      expect(result.current.files[0].status).toBe(UploadStatus.ERROR);
      expect(result.current.files[0].error).toBe('Upload failed');
      expect(result.current.isUploading).toBe(false);
    });

    test('tracks uploading state correctly', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1, mockFile2]);
      });

      const [file1Id, file2Id] = result.current.files.map(f => f.id);

      act(() => {
        result.current.updateFileStatus(file1Id, UploadStatus.UPLOADING);
      });

      expect(result.current.isUploading).toBe(true);

      act(() => {
        result.current.updateFileStatus(file2Id, UploadStatus.UPLOADING);
      });

      expect(result.current.isUploading).toBe(true);

      act(() => {
        result.current.updateFileStatus(file1Id, UploadStatus.COMPLETED);
      });

      expect(result.current.isUploading).toBe(true); // Still one uploading

      act(() => {
        result.current.updateFileStatus(file2Id, UploadStatus.COMPLETED);
      });

      expect(result.current.isUploading).toBe(false); // None uploading
    });
  });

  describe('Cancel Operations', () => {
    test('cancels uploading file', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.updateFileStatus(fileId, UploadStatus.UPLOADING);
      });

      act(() => {
        result.current.cancelUpload(fileId);
      });

      expect(result.current.files[0].status).toBe(UploadStatus.CANCELLED);
    });

    test('does not cancel non-uploading file', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      const fileId = result.current.files[0].id;

      act(() => {
        result.current.cancelUpload(fileId);
      });

      expect(result.current.files[0].status).toBe(UploadStatus.QUEUED);
    });
  });

  describe('Clear Operations', () => {
    test('clears completed files', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1, mockFile2]);
      });

      const [file1Id, file2Id] = result.current.files.map(f => f.id);

      act(() => {
        result.current.updateFileStatus(file1Id, UploadStatus.COMPLETED);
      });

      act(() => {
        result.current.clearCompleted();
      });

      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].id).toBe(file2Id);
      expect(result.current.totalFiles).toBe(1);
      expect(result.current.completedFiles).toBe(0);
    });

    test('clears all files', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1, mockFile2]);
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.files).toHaveLength(0);
      expect(result.current.totalFiles).toBe(0);
      expect(result.current.completedFiles).toBe(0);
      expect(result.current.overallProgress).toBe(0);
      expect(result.current.isUploading).toBe(false);
    });
  });

  describe('File Retrieval', () => {
    test('gets file by ID', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1]);
      });

      const fileId = result.current.files[0].id;
      const retrievedFile = result.current.getFileById(fileId);

      expect(retrievedFile).toBeDefined();
      expect(retrievedFile?.id).toBe(fileId);
      expect(retrievedFile?.file).toBe(mockFile1);
    });

    test('returns undefined for non-existent file ID', () => {
      const { result } = renderHook(() => useUploadProgress());

      const retrievedFile = result.current.getFileById('non-existent-id');
      expect(retrievedFile).toBeUndefined();
    });
  });

  describe('Progress Calculations', () => {
    test('handles division by zero for overall progress', () => {
      const { result } = renderHook(() => useUploadProgress());

      expect(result.current.overallProgress).toBe(0);
    });

    test('calculates overall progress with mixed status files', () => {
      const { result } = renderHook(() => useUploadProgress());

      act(() => {
        result.current.addFiles([mockFile1, mockFile2]);
      });

      const [file1Id, file2Id] = result.current.files.map(f => f.id);

      act(() => {
        result.current.updateFileStatus(file1Id, UploadStatus.COMPLETED);
      });

      expect(result.current.overallProgress).toBe(50); // 1 of 2 files completed = 50%

      act(() => {
        result.current.updateFileProgress({
          fileId: file2Id,
          loaded: 250,
          total: 1000,
          progress: 25
        });
      });

      // Overall progress is based on completed files count, not individual progress
      expect(result.current.overallProgress).toBe(50); // Still 1 of 2 completed
    });
  });
});