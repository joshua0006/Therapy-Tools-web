/**
 * Formatters Utility
 * 
 * Provides formatting functions for various data types:
 * - Currency formatting
 * - Date formatting
 * - Number formatting
 */

/**
 * Format a number as currency
 * 
 * @param amount - The amount to format
 * @param currencyCode - The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string, currencyCode: string = 'USD'): string {
  // Ensure amount is a number
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle NaN or invalid inputs
  if (isNaN(numericAmount)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount);
}

/**
 * Format a date to a readable string
 * 
 * @param date - Date string or Date object
 * @param format - Format style (default: 'medium')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Format configurations
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'long', day: 'numeric' },
    long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  };
  
  return new Intl.DateTimeFormat('en-US', formatOptions[format]).format(dateObj);
}

/**
 * Format a number with thousands separators
 * 
 * @param number - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(number: number | string, decimals: number = 0): string {
  // Ensure number is a number
  const numericValue = typeof number === 'string' ? parseFloat(number) : number;
  
  // Handle NaN or invalid inputs
  if (isNaN(numericValue)) {
    return '0';
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numericValue);
} 