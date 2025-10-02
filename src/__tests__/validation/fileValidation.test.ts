import {
  validateFileSize,
  validateFileExtension,
  validateFileSignature,
  validateFile,
  validateFiles,
  generateFileHash,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES
} from '@/lib/validation/fileValidation';

// Mock file creation helper
function createMockFile(
  name: string,
  size: number,
  type: string,
  content?: number[]
): File {
  const arrayBuffer = new ArrayBuffer(content?.length || size);
  if (content) {
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array.set(content);
  } else {
    // Fill with zeros for consistent testing
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array.fill(0);
  }

  // Create a mock file object with the necessary methods
  const mockFile = {
    name,
    size,
    type,
    arrayBuffer: jest.fn().mockResolvedValue(arrayBuffer),
    slice: jest.fn().mockReturnValue({
      arrayBuffer: jest.fn().mockResolvedValue(arrayBuffer)
    })
  } as unknown as File;
  
  return mockFile;
}

// Mock crypto.subtle for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockImplementation(async (algorithm: string, data: ArrayBuffer) => {
        // Create a deterministic hash based on input data
        const view = new Uint8Array(data);
        const sum = Array.from(view).reduce((acc, byte) => acc + byte, 0);
        
        // Create a 32-byte buffer for SHA-256 with deterministic content
        const hashBuffer = new ArrayBuffer(32);
        const hashView = new Uint8Array(hashBuffer);
        
        // Fill with a pattern based on the input sum
        for (let i = 0; i < 32; i++) {
          hashView[i] = (sum + i) % 256;
        }
        
        return hashBuffer;
      })
    }
  }
});

describe('File Validation', () => {
  describe('validateFileSize', () => {
    it('should pass for files within size limit', () => {
      const file = createMockFile('test.pdf', 5 * 1024 * 1024, 'application/pdf'); // 5MB
      const result = validateFileSize(file);
      expect(result).toBeNull();
    });

    it('should fail for files exceeding size limit', () => {
      const file = createMockFile('large.pdf', 15 * 1024 * 1024, 'application/pdf'); // 15MB
      const result = validateFileSize(file);
      expect(result).toEqual({
        type: 'FILE_SIZE',
        message: expect.stringContaining('exceeds maximum size'),
        fileName: 'large.pdf'
      });
    });

    it('should pass for files at exactly the size limit', () => {
      const file = createMockFile('exact.pdf', MAX_FILE_SIZE, 'application/pdf');
      const result = validateFileSize(file);
      expect(result).toBeNull();
    });
  });

  describe('validateFileExtension', () => {
    it('should pass for valid PDF extension and MIME type', () => {
      const result = validateFileExtension('document.pdf', 'application/pdf');
      expect(result).toBeNull();
    });

    it('should pass for valid JPEG extensions', () => {
      expect(validateFileExtension('image.jpg', 'image/jpeg')).toBeNull();
      expect(validateFileExtension('image.jpeg', 'image/jpeg')).toBeNull();
    });

    it('should fail for mismatched extension and MIME type', () => {
      const result = validateFileExtension('document.txt', 'application/pdf');
      expect(result).toEqual({
        type: 'INVALID_EXTENSION',
        message: expect.stringContaining('does not match MIME type'),
        fileName: 'document.txt'
      });
    });

    it('should fail for unsupported MIME type', () => {
      const result = validateFileExtension('script.js', 'application/javascript');
      expect(result).toEqual({
        type: 'FILE_TYPE',
        message: expect.stringContaining('is not allowed'),
        fileName: 'script.js'
      });
    });

    it('should be case insensitive for extensions', () => {
      const result = validateFileExtension('document.PDF', 'application/pdf');
      expect(result).toBeNull();
    });
  });

  describe('validateFileSignature', () => {
    it('should pass for valid PDF file signature', async () => {
      const pdfSignature = [0x25, 0x50, 0x44, 0x46]; // %PDF
      const file = createMockFile('test.pdf', 1024, 'application/pdf', pdfSignature);
      const result = await validateFileSignature(file);
      expect(result).toBeNull();
    });

    it('should pass for valid PNG file signature', async () => {
      const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      const file = createMockFile('test.png', 1024, 'image/png', pngSignature);
      const result = await validateFileSignature(file);
      expect(result).toBeNull();
    });

    it('should pass for valid JPEG file signature', async () => {
      const jpegSignature = [0xFF, 0xD8, 0xFF];
      const file = createMockFile('test.jpg', 1024, 'image/jpeg', jpegSignature);
      const result = await validateFileSignature(file);
      expect(result).toBeNull();
    });

    it('should fail for mismatched file signature (MIME spoofing)', async () => {
      const wrongSignature = [0x00, 0x00, 0x00, 0x00]; // Wrong signature
      const file = createMockFile('fake.pdf', 1024, 'application/pdf', wrongSignature);
      const result = await validateFileSignature(file);
      expect(result).toEqual({
        type: 'MIME_SPOOFING',
        message: expect.stringContaining('does not match declared MIME type'),
        fileName: 'fake.pdf'
      });
    });

    it('should fail for unsupported file type', async () => {
      const file = createMockFile('script.js', 1024, 'application/javascript');
      const result = await validateFileSignature(file);
      expect(result).toEqual({
        type: 'FILE_TYPE',
        message: expect.stringContaining('is not allowed'),
        fileName: 'script.js'
      });
    });
  });

  describe('generateFileHash', () => {
    it('should generate consistent hash for same file content', async () => {
      const content = [0x25, 0x50, 0x44, 0x46];
      const file1 = createMockFile('test1.pdf', 4, 'application/pdf', content);
      const file2 = createMockFile('test2.pdf', 4, 'application/pdf', content);
      
      const hash1 = await generateFileHash(file1);
      const hash2 = await generateFileHash(file2);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 produces 64-character hex string
    });

    it('should generate different hashes for different content', async () => {
      const content1 = [0x25, 0x50, 0x44, 0x46];
      const content2 = [0x89, 0x50, 0x4E, 0x47];
      const file1 = createMockFile('test1.pdf', 4, 'application/pdf', content1);
      const file2 = createMockFile('test2.png', 4, 'image/png', content2);
      
      const hash1 = await generateFileHash(file1);
      const hash2 = await generateFileHash(file2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateFile', () => {
    it('should pass for valid PDF file', async () => {
      const pdfSignature = [0x25, 0x50, 0x44, 0x46];
      const file = createMockFile('document.pdf', 1024, 'application/pdf', pdfSignature);
      
      const result = await validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileHash).toBeDefined();
      expect(result.detectedMimeType).toBe('application/pdf');
    });

    it('should fail for empty file', async () => {
      const file = createMockFile('empty.pdf', 0, 'application/pdf');
      
      const result = await validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('CORRUPTED_FILE');
    });

    it('should fail for oversized file', async () => {
      const file = createMockFile('large.pdf', 15 * 1024 * 1024, 'application/pdf');
      
      const result = await validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'FILE_SIZE')).toBe(true);
    });

    it('should fail for unsupported file type', async () => {
      const file = createMockFile('script.js', 1024, 'application/javascript');
      
      const result = await validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'FILE_TYPE')).toBe(true);
    });

    it('should accumulate multiple validation errors', async () => {
      // Large file with wrong extension
      const file = createMockFile('document.txt', 15 * 1024 * 1024, 'application/pdf');
      
      const result = await validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateFiles', () => {
    it('should pass for multiple valid files', async () => {
      const pdfSignature = [0x25, 0x50, 0x44, 0x46];
      const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      
      const files = [
        createMockFile('doc.pdf', 1024, 'application/pdf', pdfSignature),
        createMockFile('image.png', 2048, 'image/png', pngSignature)
      ];
      
      const result = await validateFiles(files);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].fileName).toBe('doc.pdf');
      expect(result.results[1].fileName).toBe('image.png');
    });

    it('should fail if any file is invalid', async () => {
      const pdfSignature = [0x25, 0x50, 0x44, 0x46];
      
      const files = [
        createMockFile('valid.pdf', 1024, 'application/pdf', pdfSignature),
        createMockFile('invalid.js', 1024, 'application/javascript') // Unsupported type
      ];
      
      const result = await validateFiles(files);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.results).toHaveLength(2);
    });

    it('should fail for empty file array', async () => {
      const result = await validateFiles([]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('CORRUPTED_FILE');
      expect(result.errors[0].message).toContain('No files provided');
    });

    it('should provide detailed error information', async () => {
      const files = [
        createMockFile('large.pdf', 15 * 1024 * 1024, 'application/pdf'), // Too large
        createMockFile('wrong.txt', 1024, 'application/pdf') // Wrong extension
      ];
      
      const result = await validateFiles(files);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check that errors include file names
      const errorMessages = result.errors.map(e => e.fileName);
      expect(errorMessages).toContain('large.pdf');
      expect(errorMessages).toContain('wrong.txt');
    });
  });

  describe('ALLOWED_FILE_TYPES configuration', () => {
    it('should include all required business document types', () => {
      const requiredTypes = [
        'application/pdf',
        'image/jpeg', 
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      requiredTypes.forEach(type => {
        expect(ALLOWED_FILE_TYPES).toHaveProperty(type);
      });
    });

    it('should have valid file signatures for all types', () => {
      Object.values(ALLOWED_FILE_TYPES).forEach(config => {
        expect(config.signature).toBeDefined();
        expect(Array.isArray(config.signature)).toBe(true);
        expect(config.signature.length).toBeGreaterThan(0);
      });
    });

    it('should have valid extensions for all types', () => {
      Object.values(ALLOWED_FILE_TYPES).forEach(config => {
        expect(config.extensions).toBeDefined();
        expect(Array.isArray(config.extensions)).toBe(true);
        expect(config.extensions.length).toBeGreaterThan(0);
        
        // All extensions should start with a dot
        config.extensions.forEach(ext => {
          expect(ext).toMatch(/^\./);
        });
      });
    });
  });
});