import {
  detectDocumentCategory,
  detectCategoriesForFiles,
  validateCategoryDetection,
  getCategoryPriority,
  formatDetectionForDisplay,
  CategoryDetection
} from '../../lib/services/documentCategorization';
import { DocumentCategory } from '../../../types/document';

describe('documentCategorization', () => {
  describe('detectDocumentCategory', () => {
    describe('High Priority Pattern Matching', () => {
      test('detects Delivery Order with exact DO.xxxx/xx format', () => {
        const result = detectDocumentCategory('DO.1234/23');
        
        expect(result.detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
        expect(result.confidence).toBe('HIGH');
        expect(result.isAmbiguous).toBe(false);
        expect(result.pattern).toBeDefined();
        expect(result.filename).toBe('DO.1234/23');
      });

      test('detects Purchase Order with exact PO.xxxx/xx format', () => {
        const result = detectDocumentCategory('PO.5678/24');
        
        expect(result.detectedCategory).toBe(DocumentCategory.PURCHASE_ORDER);
        expect(result.confidence).toBe('HIGH');
        expect(result.isAmbiguous).toBe(false);
        expect(result.pattern).toBeDefined();
      });

      test('detects Invoice with exact INV.xxxx/xx format', () => {
        const result = detectDocumentCategory('INV.9012/25');
        
        expect(result.detectedCategory).toBe(DocumentCategory.INVOICE);
        expect(result.confidence).toBe('HIGH');
        expect(result.isAmbiguous).toBe(false);
        expect(result.pattern).toBeDefined();
      });

      test('handles case insensitive matching for exact patterns', () => {
        const testCases = [
          'do.1234/23',
          'Do.1234/23',
          'DO.1234/23',
          'dO.1234/23'
        ];

        testCases.forEach(filename => {
          const result = detectDocumentCategory(filename);
          expect(result.detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
          expect(result.confidence).toBe('HIGH');
        });
      });

      test('works with file extensions', () => {
        const result = detectDocumentCategory('DO.1234/23.pdf');
        
        expect(result.detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
        expect(result.confidence).toBe('HIGH');
        expect(result.filename).toBe('DO.1234/23.pdf');
      });
    });

    describe('Medium Priority Pattern Matching', () => {
      test('detects patterns with various separators', () => {
        const testCases = [
          { filename: 'DO-1234', expected: DocumentCategory.DELIVERY_ORDER },
          { filename: 'PO_5678', expected: DocumentCategory.PURCHASE_ORDER },
          { filename: 'INV 9012', expected: DocumentCategory.INVOICE },
          { filename: 'DO.1234', expected: DocumentCategory.DELIVERY_ORDER }
        ];

        testCases.forEach(({ filename, expected }) => {
          const result = detectDocumentCategory(filename);
          expect(result.detectedCategory).toBe(expected);
          expect(result.confidence).toBe('MEDIUM');
        });
      });

      test('handles partial format matches', () => {
        const result = detectDocumentCategory('DO-1234-additional-text.pdf');
        
        expect(result.detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
        expect(result.confidence).toBe('MEDIUM');
      });
    });

    describe('Low Priority Pattern Matching', () => {
      test('detects keyword-based patterns', () => {
        const testCases = [
          { filename: 'delivery_order.pdf', expected: DocumentCategory.DELIVERY_ORDER },
          { filename: 'purchase-order.pdf', expected: DocumentCategory.PURCHASE_ORDER },
          { filename: 'invoice.pdf', expected: DocumentCategory.INVOICE },
          { filename: 'receipt.pdf', expected: DocumentCategory.SALES_RECEIPT }
        ];

        testCases.forEach(({ filename, expected }) => {
          const result = detectDocumentCategory(filename);
          expect(result.detectedCategory).toBe(expected);
          expect(result.confidence).toBe('LOW');
        });
      });

      test('handles keyword variations', () => {
        const testCases = [
          'deliveryorder.pdf',
          'delivery order.pdf',
          'delivery-order.pdf',
          'delivery_order.pdf'
        ];

        testCases.forEach(filename => {
          const result = detectDocumentCategory(filename);
          expect(result.detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
          expect(result.confidence).toBe('LOW');
        });
      });
    });

    describe('Fallback to OTHER Category', () => {
      test('returns OTHER for unrecognized patterns', () => {
        const testCases = [
          'random-document.pdf',
          'unknown-file.docx',
          'no-pattern-here.txt',
          'file.pdf',
          '123456.pdf'
        ];

        testCases.forEach(filename => {
          const result = detectDocumentCategory(filename);
          expect(result.detectedCategory).toBe(DocumentCategory.OTHER);
          expect(result.confidence).toBe('LOW');
          expect(result.isAmbiguous).toBe(false);
          expect(result.pattern).toBeUndefined();
        });
      });

      test('handles empty filename gracefully', () => {
        const result = detectDocumentCategory('');
        
        expect(result.detectedCategory).toBe(DocumentCategory.OTHER);
        expect(result.confidence).toBe('LOW');
        expect(result.isAmbiguous).toBe(false);
      });

      test('handles filename with only extension', () => {
        const result = detectDocumentCategory('.pdf');
        
        expect(result.detectedCategory).toBe(DocumentCategory.OTHER);
        expect(result.confidence).toBe('LOW');
      });
    });

    describe('Ambiguous Pattern Detection', () => {
      test('detects ambiguous cases when multiple patterns match with same priority', () => {
        // This would be a custom filename that could match multiple patterns
        // Note: Current patterns are designed to avoid ambiguity, but testing the logic
        const result = detectDocumentCategory('DO.1234/23.pdf');
        
        // Should not be ambiguous for well-designed patterns
        expect(result.isAmbiguous).toBe(false);
      });

      test('prioritizes high confidence patterns over low confidence', () => {
        // A filename that could match both exact pattern (HIGH) and keyword (LOW)
        const result = detectDocumentCategory('DO.1234/23-delivery-order.pdf');
        
        expect(result.detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
        expect(result.confidence).toBe('HIGH'); // Should pick the high confidence match
        expect(result.isAmbiguous).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      test('handles malformed patterns', () => {
        const testCases = [
          'DO.12/23', // Wrong number format
          'DO.12345/23', // Too many digits
          'DO.1234/234', // Wrong year format
          'DO1234/23', // Missing dot
          'DO./23' // Missing number
        ];

        testCases.forEach(filename => {
          const result = detectDocumentCategory(filename);
          // Should fall back to medium or low priority patterns, or OTHER
          expect([
            DocumentCategory.DELIVERY_ORDER, 
            DocumentCategory.OTHER
          ]).toContain(result.detectedCategory);
        });
      });

      test('handles special characters in filename', () => {
        const testCases = [
          'DO.1234/23-[copy].pdf',
          'DO.1234/23_(1).pdf',
          'DO.1234/23 - final.pdf'
        ];

        testCases.forEach(filename => {
          const result = detectDocumentCategory(filename);
          expect(result.detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
        });
      });

      test('handles very long filenames', () => {
        const longFilename = 'DO.1234/23-' + 'a'.repeat(200) + '.pdf';
        const result = detectDocumentCategory(longFilename);
        
        expect(result.detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
        expect(result.confidence).toBe('HIGH');
      });
    });
  });

  describe('detectCategoriesForFiles', () => {
    test('processes multiple files correctly', () => {
      const mockFiles = [
        new File(['content1'], 'DO.1234/23.pdf'),
        new File(['content2'], 'PO.5678/24.pdf'),
        new File(['content3'], 'INV.9012/25.pdf'),
        new File(['content4'], 'unknown.pdf')
      ];

      const results = detectCategoriesForFiles(mockFiles);

      expect(results).toHaveLength(4);
      expect(results[0].detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
      expect(results[1].detectedCategory).toBe(DocumentCategory.PURCHASE_ORDER);
      expect(results[2].detectedCategory).toBe(DocumentCategory.INVOICE);
      expect(results[3].detectedCategory).toBe(DocumentCategory.OTHER);
    });

    test('handles empty file array', () => {
      const results = detectCategoriesForFiles([]);
      expect(results).toEqual([]);
    });

    test('maintains filename association', () => {
      const mockFiles = [
        new File(['content'], 'test-file.pdf')
      ];

      const results = detectCategoriesForFiles(mockFiles);
      expect(results[0].filename).toBe('test-file.pdf');
    });
  });

  describe('validateCategoryDetection', () => {
    test('validates correct detection with pattern', () => {
      const detection: CategoryDetection = {
        filename: 'DO.1234/23.pdf',
        detectedCategory: DocumentCategory.DELIVERY_ORDER,
        confidence: 'HIGH',
        isAmbiguous: false,
        pattern: '^DO\\.\\d+\\/\\d{2}'
      };

      expect(validateCategoryDetection(detection)).toBe(true);
    });

    test('validates OTHER category without pattern', () => {
      const detection: CategoryDetection = {
        filename: 'unknown.pdf',
        detectedCategory: DocumentCategory.OTHER,
        confidence: 'LOW',
        isAmbiguous: false
      };

      expect(validateCategoryDetection(detection)).toBe(true);
    });

    test('invalidates non-OTHER category without pattern', () => {
      const detection: CategoryDetection = {
        filename: 'DO.1234/23.pdf',
        detectedCategory: DocumentCategory.DELIVERY_ORDER,
        confidence: 'HIGH',
        isAmbiguous: false
        // Missing pattern
      };

      expect(validateCategoryDetection(detection)).toBe(false);
    });

    test('invalidates detection with wrong pattern', () => {
      const detection: CategoryDetection = {
        filename: 'DO.1234/23.pdf',
        detectedCategory: DocumentCategory.DELIVERY_ORDER,
        confidence: 'HIGH',
        isAmbiguous: false,
        pattern: 'wrong-pattern'
      };

      expect(validateCategoryDetection(detection)).toBe(false);
    });
  });

  describe('getCategoryPriority', () => {
    test('calculates priority scores correctly', () => {
      const highConfidence: CategoryDetection = {
        filename: 'test.pdf',
        detectedCategory: DocumentCategory.INVOICE,
        confidence: 'HIGH',
        isAmbiguous: false
      };

      const mediumConfidence: CategoryDetection = {
        filename: 'test.pdf',
        detectedCategory: DocumentCategory.INVOICE,
        confidence: 'MEDIUM',
        isAmbiguous: false
      };

      const lowConfidence: CategoryDetection = {
        filename: 'test.pdf',
        detectedCategory: DocumentCategory.INVOICE,
        confidence: 'LOW',
        isAmbiguous: false
      };

      expect(getCategoryPriority(highConfidence)).toBe(100);
      expect(getCategoryPriority(mediumConfidence)).toBe(50);
      expect(getCategoryPriority(lowConfidence)).toBe(10);
    });

    test('applies ambiguity penalty', () => {
      const ambiguousDetection: CategoryDetection = {
        filename: 'test.pdf',
        detectedCategory: DocumentCategory.INVOICE,
        confidence: 'HIGH',
        isAmbiguous: true
      };

      expect(getCategoryPriority(ambiguousDetection)).toBe(50); // 100 * 0.5
    });
  });

  describe('formatDetectionForDisplay', () => {
    test('formats normal detection correctly', () => {
      const detection: CategoryDetection = {
        filename: 'DO.1234/23.pdf',
        detectedCategory: DocumentCategory.DELIVERY_ORDER,
        confidence: 'HIGH',
        isAmbiguous: false
      };

      const result = formatDetectionForDisplay(detection);
      expect(result).toBe('Detected as delivery order (high confidence)');
    });

    test('formats ambiguous detection correctly', () => {
      const detection: CategoryDetection = {
        filename: 'test.pdf',
        detectedCategory: DocumentCategory.INVOICE,
        confidence: 'MEDIUM',
        isAmbiguous: true
      };

      const result = formatDetectionForDisplay(detection);
      expect(result).toBe('Detected as invoice (medium confidence) - needs confirmation');
    });

    test('formats OTHER category correctly', () => {
      const detection: CategoryDetection = {
        filename: 'unknown.pdf',
        detectedCategory: DocumentCategory.OTHER,
        confidence: 'LOW',
        isAmbiguous: false
      };

      const result = formatDetectionForDisplay(detection);
      expect(result).toBe('Unable to detect category (low confidence)');
    });

    test('handles underscore in category names', () => {
      const detection: CategoryDetection = {
        filename: 'PO.1234/23.pdf',
        detectedCategory: DocumentCategory.PURCHASE_ORDER,
        confidence: 'HIGH',
        isAmbiguous: false
      };

      const result = formatDetectionForDisplay(detection);
      expect(result).toBe('Detected as purchase order (high confidence)');
    });
  });

  describe('Integration Scenarios', () => {
    test('real-world filename examples', () => {
      const realWorldFiles = [
        { filename: 'DO.eticket-Mr-MOHAMED-Yaseen_Ibrahim.pdf', expected: DocumentCategory.OTHER },
        { filename: 'INV.eticket-Mr-DIDI-Ibrahim_Mohamed.pdf', expected: DocumentCategory.OTHER },
        { filename: 'DO.1234/23.pdf', expected: DocumentCategory.DELIVERY_ORDER },
        { filename: 'Invoice_2023_001.pdf', expected: DocumentCategory.INVOICE },
        { filename: 'purchase-order-456.pdf', expected: DocumentCategory.PURCHASE_ORDER },
        { filename: 'receipt-789.pdf', expected: DocumentCategory.SALES_RECEIPT }
      ];

      realWorldFiles.forEach(({ filename, expected }) => {
        const result = detectDocumentCategory(filename);
        expect(result.detectedCategory).toBe(expected);
      });
    });

    test('performance with many files', () => {
      const manyFiles = Array.from({ length: 1000 }, (_, i) => 
        new File(['content'], `DO.${String(i).padStart(4, '0')}/23.pdf`)
      );

      const startTime = Date.now();
      const results = detectCategoriesForFiles(manyFiles);
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      
      // All should be detected as delivery orders
      results.forEach(result => {
        expect(result.detectedCategory).toBe(DocumentCategory.DELIVERY_ORDER);
        expect(result.confidence).toBe('HIGH');
      });
    });
  });
});


