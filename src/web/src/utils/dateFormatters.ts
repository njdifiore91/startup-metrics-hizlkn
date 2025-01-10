import { format, formatDistance, parseISO, isValid } from 'date-fns'; // v2.30.0

/**
 * Formats a date for metric display using the standard application format.
 * Provides consistent date formatting across all metric visualizations.
 * 
 * @param date - The date to format (Date object, ISO string, or timestamp)
 * @returns Formatted date string in the format 'MMM DD, YYYY' or 'Invalid Date' if validation fails
 */
export const formatMetricDate = (date: Date | string | number): string => {
  try {
    if (!date) {
      return 'Invalid Date';
    }

    const parsedDate = date instanceof Date ? date : parseISO(date.toString());
    
    if (!isValid(parsedDate)) {
      return 'Invalid Date';
    }

    return format(parsedDate, 'MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting metric date:', error);
    return 'Invalid Date';
  }
};

/**
 * Formats a date for report headers and exports with full precision timestamp.
 * Includes hours, minutes, and seconds for audit accuracy.
 * 
 * @param date - The date to format (Date object, ISO string, or timestamp)
 * @returns Formatted date string in the format 'MMMM DD, YYYY HH:mm:ss' or 'Invalid Date' if validation fails
 */
export const formatReportDate = (date: Date | string | number): string => {
  try {
    if (!date) {
      return 'Invalid Date';
    }

    const parsedDate = date instanceof Date ? date : parseISO(date.toString());
    
    if (!isValid(parsedDate)) {
      return 'Invalid Date';
    }

    return format(parsedDate, 'MMMM dd, yyyy HH:mm:ss');
  } catch (error) {
    console.error('Error formatting report date:', error);
    return 'Invalid Date';
  }
};

/**
 * Formats a date range for benchmark period display.
 * Ensures consistent formatting of date ranges across the application.
 * 
 * @param startDate - The start date of the range
 * @param endDate - The end date of the range
 * @returns Formatted date range string in the format 'MMM YYYY - MMM YYYY' or 'Invalid Date Range' if validation fails
 */
export const formatBenchmarkPeriod = (
  startDate: Date | string | number,
  endDate: Date | string | number
): string => {
  try {
    if (!startDate || !endDate) {
      return 'Invalid Date Range';
    }

    const parsedStartDate = startDate instanceof Date ? startDate : parseISO(startDate.toString());
    const parsedEndDate = endDate instanceof Date ? endDate : parseISO(endDate.toString());

    if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
      return 'Invalid Date Range';
    }

    if (parsedStartDate > parsedEndDate) {
      return 'Invalid Date Range';
    }

    const formattedStartDate = format(parsedStartDate, 'MMM yyyy');
    const formattedEndDate = format(parsedEndDate, 'MMM yyyy');

    return `${formattedStartDate} - ${formattedEndDate}`;
  } catch (error) {
    console.error('Error formatting benchmark period:', error);
    return 'Invalid Date Range';
  }
};

/**
 * Generates human-readable relative time strings for displaying time differences.
 * Automatically handles past and future dates with appropriate suffixes.
 * 
 * @param date - The date to compare against current time
 * @returns Relative time string (e.g., '2 days ago', 'in 3 months') or 'Invalid Date' if validation fails
 */
export const getRelativeTimeString = (date: Date | string | number): string => {
  try {
    if (!date) {
      return 'Invalid Date';
    }

    const parsedDate = date instanceof Date ? date : parseISO(date.toString());
    
    if (!isValid(parsedDate)) {
      return 'Invalid Date';
    }

    const now = new Date();
    const isPast = parsedDate < now;
    const distance = formatDistance(parsedDate, now);

    return isPast ? `${distance} ago` : `in ${distance}`;
  } catch (error) {
    console.error('Error generating relative time string:', error);
    return 'Invalid Date';
  }
};

/**
 * Comprehensive date validation utility that handles multiple input types and edge cases.
 * Validates dates are within reasonable range and properly formatted.
 * 
 * @param value - The value to validate as a date
 * @returns boolean indicating if the value is a valid date
 */
export const isValidDate = (value: any): boolean => {
  try {
    if (!value) {
      return false;
    }

    // Handle Date objects
    if (value instanceof Date) {
      return isValid(value) && value.getFullYear() > 1900;
    }

    // Handle numeric timestamps
    if (typeof value === 'number') {
      const date = new Date(value);
      return isValid(date) && date.getFullYear() > 1900;
    }

    // Handle string dates
    if (typeof value === 'string') {
      const parsedDate = parseISO(value);
      return isValid(parsedDate) && parsedDate.getFullYear() > 1900;
    }

    return false;
  } catch (error) {
    console.error('Error validating date:', error);
    return false;
  }
};