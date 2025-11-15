/**
 * Utility functions for formatting and display
 */

/**
 * Format date/time for display
 */
export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format time duration (in seconds) for display
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculate time elapsed between two dates (in seconds)
 */
export const calculateElapsedTime = (startDate: string | Date): number => {
  const start = new Date(startDate).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
};

/**
 * Format points with commas
 */
export const formatPoints = (points: number): string => {
  return points.toLocaleString();
};

/**
 * Get time remaining until a date (in seconds)
 */
export const getTimeRemaining = (targetDate: string | Date): number => {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = Math.floor((target - now) / 1000);
  return Math.max(0, diff);
};

/**
 * Truncate long text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};
