// File validation utilities for business documents

// File validation constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed business document formats with their MIME types and file signatures
export const ALLOWED_FILE_TYPES = {
  'application/pdf': {
    extensions: ['.pdf'],
    signature: [0x25, 0x50, 0x44, 0x46] // %PDF
  },
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    signature: [0xFF, 0xD8, 0xFF] // JPEG header
  },
  'image/png': {
    extensions: ['.png'],
    signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] // PNG header
  },
  'application/msword': {
    extensions: ['.doc'],
    signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] // DOC header (OLE)
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    signature: [0x50, 0x4B, 0x03, 0x04] // ZIP header (DOCX is ZIP-based)
  }
} as const;

export type AllowedMimeType = keyof typeof ALLOWED_FILE_TYPES;

export interface ValidationError {
  type: 'FILE_SIZE' | 'FILE_TYPE' | 'MIME_SPOOFING' | 'INVALID_EXTENSION' | 'CORRUPTED_FILE';
  message: string;
  fileName: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  fileHash?: string;
  detectedMimeType?: string;
}

/**
 * Validates file size against maximum allowed size
 */
export function validateFileSize(file: File): ValidationError | null {
  if (file.size > MAX_FILE_SIZE) {
    return {
      type: 'FILE_SIZE',
      message: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileName: file.name
    };
  }
  return null;
}

/**
 * Validates file extension against allowed extensions for the MIME type
 */
export function validateFileExtension(fileName: string, mimeType: string): ValidationError | null {
  const allowedType = ALLOWED_FILE_TYPES[mimeType as AllowedMimeType];
  if (!allowedType) {
    return {
      type: 'FILE_TYPE',
      message: `File type ${mimeType} is not allowed`,
      fileName
    };
  }

  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  if (!allowedType.extensions.includes(extension)) {
    return {
      type: 'INVALID_EXTENSION',
      message: `File extension ${extension} does not match MIME type ${mimeType}`,
      fileName
    };
  }

  return null;
}

/**
 * Validates file signature (magic bytes) to prevent MIME type spoofing
 */
export async function validateFileSignature(file: File): Promise<ValidationError | null> {
  try {
    const allowedType = ALLOWED_FILE_TYPES[file.type as AllowedMimeType];
    if (!allowedType) {
      return {
        type: 'FILE_TYPE',
        message: `File type ${file.type} is not allowed`,
        fileName: file.name
      };
    }

    // Read first bytes of the file
    const headerSize = Math.max(...Object.values(ALLOWED_FILE_TYPES).map(t => t.signature.length));
    const arrayBuffer = await file.slice(0, headerSize).arrayBuffer();
    const fileHeader = new Uint8Array(arrayBuffer);

    // Check if file signature matches the declared MIME type
    const expectedSignature = allowedType.signature;
    const matches = expectedSignature.every((byte, index) => fileHeader[index] === byte);

    if (!matches) {
      return {
        type: 'MIME_SPOOFING',
        message: `File signature does not match declared MIME type ${file.type}`,
        fileName: file.name
      };
    }

    return null;
  } catch {
    return {
      type: 'CORRUPTED_FILE',
      message: 'Unable to read file signature - file may be corrupted',
      fileName: file.name
    };
  }
}

/**
 * Generates SHA-256 hash of file content for duplicate detection
 */
export async function generateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Comprehensive file validation function
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  const errors: ValidationError[] = [];

  // Basic file checks
  if (!file || file.size === 0) {
    errors.push({
      type: 'CORRUPTED_FILE',
      message: 'File is empty or corrupted',
      fileName: file.name || 'unknown'
    });
    return { isValid: false, errors };
  }

  // File size validation
  const sizeError = validateFileSize(file);
  if (sizeError) {
    errors.push(sizeError);
  }

  // MIME type validation
  if (!file.type || !(file.type in ALLOWED_FILE_TYPES)) {
    errors.push({
      type: 'FILE_TYPE',
      message: `File type ${file.type || 'unknown'} is not allowed. Allowed types: PDF, JPG, PNG, DOC, DOCX`,
      fileName: file.name
    });
  }

  // Extension validation (only if MIME type is valid)
  if (file.type && file.type in ALLOWED_FILE_TYPES) {
    const extensionError = validateFileExtension(file.name, file.type);
    if (extensionError) {
      errors.push(extensionError);
    }

    // File signature validation (only if extension is valid)
    if (!extensionError) {
      const signatureError = await validateFileSignature(file);
      if (signatureError) {
        errors.push(signatureError);
      }
    }
  }

  // Generate file hash if validation passed
  let fileHash: string | undefined;
  if (errors.length === 0) {
    try {
      fileHash = await generateFileHash(file);
    } catch {
      errors.push({
        type: 'CORRUPTED_FILE',
        message: 'Unable to generate file hash - file may be corrupted',
        fileName: file.name
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileHash,
    detectedMimeType: file.type
  };
}

/**
 * Validates multiple files and returns aggregated results
 */
export async function validateFiles(files: File[]): Promise<{
  isValid: boolean;
  results: Array<FileValidationResult & { fileName: string }>;
  errors: ValidationError[];
}> {
  if (!files || files.length === 0) {
    return {
      isValid: false,
      results: [],
      errors: [{
        type: 'CORRUPTED_FILE',
        message: 'No files provided',
        fileName: 'unknown'
      }]
    };
  }

  const results = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      ...(await validateFile(file))
    }))
  );

  const allErrors = results.flatMap(result => result.errors);
  
  return {
    isValid: allErrors.length === 0,
    results,
    errors: allErrors
  };
}