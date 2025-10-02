import { DocumentCategory } from '../../../types/document';

export interface CategoryDetection {
  filename: string;
  detectedCategory: DocumentCategory;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isAmbiguous: boolean;
  pattern?: string;
  alternativeCategories?: DocumentCategory[];
}

export interface PatternMatch {
  category: DocumentCategory;
  pattern: RegExp;
  priority: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Pattern definitions for document categorization
 * Priority order: 1 = highest priority, 3 = lowest priority
 */
const DOCUMENT_PATTERNS: PatternMatch[] = [
  // High priority patterns - exact format matches (allows additional content after)
  {
    category: DocumentCategory.DELIVERY_ORDER,
    pattern: /^DO\.\d+\/\d{2}/i,
    priority: 1,
    confidence: 'HIGH'
  },
  {
    category: DocumentCategory.PURCHASE_ORDER,
    pattern: /^PO\.\d+\/\d{2}/i,
    priority: 1,
    confidence: 'HIGH'
  },
  {
    category: DocumentCategory.INVOICE,
    pattern: /^INV\.\d+\/\d{2}/i,
    priority: 1,
    confidence: 'HIGH'
  },
  
  // Medium priority patterns - partial matches with document content
  {
    category: DocumentCategory.DELIVERY_ORDER,
    pattern: /DO[\.\-_\s]\d+/i,
    priority: 2,
    confidence: 'MEDIUM'
  },
  {
    category: DocumentCategory.PURCHASE_ORDER,
    pattern: /PO[\.\-_\s]\d+/i,
    priority: 2,
    confidence: 'MEDIUM'
  },
  {
    category: DocumentCategory.INVOICE,
    pattern: /INV[\.\-_\s]\d+/i,
    priority: 2,
    confidence: 'MEDIUM'
  },
  
  // Low priority patterns - keyword matches
  {
    category: DocumentCategory.DELIVERY_ORDER,
    pattern: /delivery[\-_\s]?order/i,
    priority: 3,
    confidence: 'LOW'
  },
  {
    category: DocumentCategory.PURCHASE_ORDER,
    pattern: /purchase[\-_\s]?order/i,
    priority: 3,
    confidence: 'LOW'
  },
  {
    category: DocumentCategory.INVOICE,
    pattern: /invoice/i,
    priority: 3,
    confidence: 'LOW'
  },
  {
    category: DocumentCategory.SALES_RECEIPT,
    pattern: /receipt/i,
    priority: 3,
    confidence: 'LOW'
  }
];

/**
 * Extract the base filename without extension for pattern matching
 */
function extractBasename(filename: string): string {
  // Common file extensions for documents
  const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.tiff', '.xls', '.xlsx'];
  
  // Check if filename ends with a known file extension
  const lowerFilename = filename.toLowerCase();
  for (const ext of documentExtensions) {
    if (lowerFilename.endsWith(ext)) {
      return filename.substring(0, filename.length - ext.length);
    }
  }
  
  // If no known extension found, return the filename as-is
  return filename;
}

/**
 * Find all pattern matches for a given filename
 */
function findPatternMatches(filename: string): PatternMatch[] {
  const basename = extractBasename(filename);
  const matches: PatternMatch[] = [];
  
  for (const pattern of DOCUMENT_PATTERNS) {
    if (pattern.pattern.test(basename)) {
      matches.push(pattern);
    }
  }
  
  // Sort by priority first (1 = highest priority), then by confidence (HIGH > MEDIUM > LOW)
  const confidenceOrder = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
  return matches.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });
}

/**
 * Detect document category based on filename patterns
 */
export function detectDocumentCategory(filename: string): CategoryDetection {
  const matches = findPatternMatches(filename);
  
  if (matches.length === 0) {
    // No patterns matched, return OTHER category
    return {
      filename,
      detectedCategory: DocumentCategory.OTHER,
      confidence: 'LOW',
      isAmbiguous: false
    };
  }
  
  const primaryMatch = matches[0];
  const sameConfidenceMatches = matches.filter(
    match => match.confidence === primaryMatch.confidence && match.priority === primaryMatch.priority
  );
  
  // Check for ambiguous cases (multiple matches with same priority and confidence)
  const isAmbiguous = sameConfidenceMatches.length > 1;
  const alternativeCategories = isAmbiguous 
    ? sameConfidenceMatches
        .filter(match => match.category !== primaryMatch.category)
        .map(match => match.category)
    : undefined;
  
  return {
    filename,
    detectedCategory: primaryMatch.category,
    confidence: primaryMatch.confidence,
    isAmbiguous,
    pattern: primaryMatch.pattern.source,
    alternativeCategories
  };
}

/**
 * Batch process multiple files for category detection
 */
export function detectCategoriesForFiles(files: File[]): CategoryDetection[] {
  return files.map(file => detectDocumentCategory(file.name));
}

/**
 * Validate a detected category against known patterns
 */
export function validateCategoryDetection(detection: CategoryDetection): boolean {
  if (detection.detectedCategory === DocumentCategory.OTHER) {
    return true; // OTHER is always valid as fallback
  }
  
  if (!detection.pattern) {
    return false; // Non-OTHER categories should have a pattern
  }
  
  // Verify the pattern still matches (additional validation)
  const patternMatch = DOCUMENT_PATTERNS.find(
    p => p.pattern.source === detection.pattern && p.category === detection.detectedCategory
  );
  
  return !!patternMatch;
}

/**
 * Get category priority score for sorting/ranking
 */
export function getCategoryPriority(detection: CategoryDetection): number {
  const confidenceScore = {
    'HIGH': 100,
    'MEDIUM': 50,
    'LOW': 10
  }[detection.confidence];
  
  const ambiguityPenalty = detection.isAmbiguous ? 0.5 : 1;
  
  return confidenceScore * ambiguityPenalty;
}

/**
 * Format category detection results for user display
 */
export function formatDetectionForDisplay(detection: CategoryDetection): string {
  const categoryName = detection.detectedCategory.replace('_', ' ').toLowerCase();
  const confidenceText = detection.confidence.toLowerCase();
  
  if (detection.detectedCategory === DocumentCategory.OTHER) {
    return `Unable to detect category (${confidenceText} confidence)`;
  }
  
  const ambiguousText = detection.isAmbiguous ? ' - needs confirmation' : '';
  return `Detected as ${categoryName} (${confidenceText} confidence)${ambiguousText}`;
}
