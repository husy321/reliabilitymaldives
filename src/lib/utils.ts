import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency utilities
const MVR_NUMBER_FORMATTER = new Intl.NumberFormat('en-MV', {
  style: 'currency',
  currency: 'MVR',
  minimumFractionDigits: 2,
});

export function formatCurrencyMvr(amount: number): string {
  return MVR_NUMBER_FORMATTER.format(amount ?? 0);
}

// Date formatting utilities
export function formatDate(date: Date | string): string {
  if (!date) return '';
  const dateObj = date instanceof Date ? date : new Date(date);

  // Format as DD-MM-YYYY
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
}

export function formatDateTime(date: Date | string): string {
  if (!date) return '';
  const dateObj = date instanceof Date ? date : new Date(date);

  // Format as DD-MM-YYYY HH:MM
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
