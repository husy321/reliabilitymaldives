'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentCategory } from '../../../types/document';

interface ManualCategorySelectorProps {
  filename: string;
  currentCategory: DocumentCategory;
  onCategoryChange: (filename: string, category: DocumentCategory) => void;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.DELIVERY_ORDER]: 'Delivery Order',
  [DocumentCategory.PURCHASE_ORDER]: 'Purchase Order',
  [DocumentCategory.INVOICE]: 'Invoice',
  [DocumentCategory.SALES_RECEIPT]: 'Sales Receipt',
  [DocumentCategory.OTHER]: 'Other'
};

const CATEGORY_DESCRIPTIONS: Record<DocumentCategory, string> = {
  [DocumentCategory.DELIVERY_ORDER]: 'Documents like DO.1234/23',
  [DocumentCategory.PURCHASE_ORDER]: 'Documents like PO.5678/24',
  [DocumentCategory.INVOICE]: 'Documents like INV.9012/25',
  [DocumentCategory.SALES_RECEIPT]: 'Sales receipts and payment confirmations',
  [DocumentCategory.OTHER]: 'Unrecognized or miscellaneous documents'
};

export function ManualCategorySelector({ 
  filename, 
  currentCategory, 
  onCategoryChange, 
  disabled = false 
}: ManualCategorySelectorProps) {
  const handleCategoryChange = (value: string) => {
    onCategoryChange(filename, value as DocumentCategory);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={`category-${filename}`} className="text-sm font-medium">
        Document Category
      </label>
      <Select
        value={currentCategory}
        onValueChange={handleCategoryChange}
        disabled={disabled}
      >
        <SelectTrigger id={`category-${filename}`}>
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(DocumentCategory).map((category) => (
            <SelectItem key={category} value={category}>
              <div className="flex flex-col">
                <span className="font-medium">{CATEGORY_LABELS[category]}</span>
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_DESCRIPTIONS[category]}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}