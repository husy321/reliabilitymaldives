'use client';

import React, { useState, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertTriangle, CheckCircle, Edit3 } from 'lucide-react';
import { DocumentCategory, CategoryDetection } from '../../../types/document';
import { ManualCategorySelector } from './ManualCategorySelector';
import { cn } from '@/lib/utils';

interface CategoryConfirmationDialogProps {
  files: File[];
  categoryDetections: CategoryDetection[];
  isOpen: boolean;
  onConfirm: (confirmedCategories: { filename: string; category: DocumentCategory }[]) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

interface FileWithCategory extends CategoryDetection {
  file: File;
  isManuallyOverridden: boolean;
}

const CONFIDENCE_COLORS = {
  HIGH: 'text-green-600 bg-green-50 border-green-200',
  MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  LOW: 'text-orange-600 bg-orange-50 border-orange-200'
};

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.DELIVERY_ORDER]: 'Delivery Order',
  [DocumentCategory.PURCHASE_ORDER]: 'Purchase Order',
  [DocumentCategory.INVOICE]: 'Invoice',
  [DocumentCategory.SALES_RECEIPT]: 'Sales Receipt',
  [DocumentCategory.OTHER]: 'Other'
};

export function CategoryConfirmationDialog({
  files,
  categoryDetections,
  isOpen,
  onConfirm,
  onCancel,
  isProcessing = false
}: CategoryConfirmationDialogProps) {
  // Combine files with their detection results
  const filesWithCategories: FileWithCategory[] = files.map(file => {
    const detection = categoryDetections.find(d => d.filename === file.name);
    return {
      file,
      filename: file.name,
      detectedCategory: detection?.detectedCategory || DocumentCategory.OTHER,
      confidence: detection?.confidence || 'LOW',
      isAmbiguous: detection?.isAmbiguous || false,
      pattern: detection?.pattern,
      alternativeCategories: detection?.alternativeCategories,
      isManuallyOverridden: false
    };
  });

  const [currentCategories, setCurrentCategories] = useState<FileWithCategory[]>(filesWithCategories);
  const [editingFile, setEditingFile] = useState<string | null>(null);

  const handleCategoryChange = useCallback((filename: string, newCategory: DocumentCategory) => {
    setCurrentCategories(prev => 
      prev.map(item => 
        item.filename === filename 
          ? { ...item, detectedCategory: newCategory, isManuallyOverridden: true }
          : item
      )
    );
  }, []);

  const handleEditClick = useCallback((filename: string) => {
    setEditingFile(editingFile === filename ? null : filename);
  }, [editingFile]);

  const handleConfirm = useCallback(() => {
    const confirmedCategories = currentCategories.map(item => ({
      filename: item.filename,
      category: item.detectedCategory
    }));
    onConfirm(confirmedCategories);
  }, [currentCategories, onConfirm]);

  const getConfidenceIcon = (confidence: 'HIGH' | 'MEDIUM' | 'LOW', isAmbiguous: boolean) => {
    if (isAmbiguous) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    
    switch (confidence) {
      case 'HIGH':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'MEDIUM':
        return <FileText className="h-4 w-4 text-yellow-600" />;
      case 'LOW':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    }
  };

  const getConfidenceBadge = (confidence: 'HIGH' | 'MEDIUM' | 'LOW', isAmbiguous: boolean) => {
    if (isAmbiguous) {
      return <Badge variant="outline" className="text-yellow-700 border-yellow-300">Ambiguous</Badge>;
    }
    
    return (
      <Badge 
        variant="outline" 
        className={cn(CONFIDENCE_COLORS[confidence], "border")}
      >
        {confidence}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const requiresAttention = currentCategories.some(item => 
    item.confidence === 'LOW' || 
    item.isAmbiguous || 
    item.detectedCategory === DocumentCategory.OTHER
  );

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Confirm Document Categories
          </DialogTitle>
          <DialogDescription>
            Please review and confirm the automatically detected categories for your documents.
            {requiresAttention && (
              <span className="block mt-2 text-yellow-700 font-medium">
                ⚠️ Some documents require your attention
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3">
              {currentCategories.map((item) => (
                <Card key={item.filename} className={cn(
                  "transition-all duration-200",
                  item.isAmbiguous || item.confidence === 'LOW' || item.detectedCategory === DocumentCategory.OTHER
                    ? "border-yellow-200 bg-yellow-50/50"
                    : "border-border"
                )}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* File Info Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm truncate">{item.filename}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(item.file.size)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getConfidenceBadge(item.confidence, item.isAmbiguous)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(item.filename)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Category Detection Info */}
                      <div className="flex items-center gap-3">
                        {getConfidenceIcon(item.confidence, item.isAmbiguous)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Detected as:</span>
                            <Badge variant="secondary" className="font-medium">
                              {CATEGORY_LABELS[item.detectedCategory]}
                            </Badge>
                            {item.isManuallyOverridden && (
                              <Badge variant="outline" className="text-xs">
                                Modified
                              </Badge>
                            )}
                          </div>
                          
                          {/* Additional info for ambiguous or low confidence */}
                          {item.isAmbiguous && item.alternativeCategories && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Also matches: {item.alternativeCategories.map(cat => CATEGORY_LABELS[cat]).join(', ')}
                            </div>
                          )}
                          
                          {item.confidence === 'LOW' && item.detectedCategory === DocumentCategory.OTHER && (
                            <div className="text-xs text-muted-foreground mt-1">
                              No pattern matches found - please select manually
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Manual Category Selector (shown when editing) */}
                      {editingFile === item.filename && (
                        <div className="pt-2 border-t">
                          <ManualCategorySelector
                            filename={item.filename}
                            currentCategory={item.detectedCategory}
                            onCategoryChange={handleCategoryChange}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Processing...
              </>
            ) : (
              `Confirm & Upload ${files.length} File${files.length > 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}