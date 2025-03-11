/**
 * Utility functions for handling subscription operations
 */

/**
 * Calculates the new end date when stacking a new subscription on top of an existing one
 * 
 * @param currentEndDate - The end date of the current subscription
 * @param billingCycle - The billing cycle of the new subscription ('monthly' or 'yearly')
 * @returns The new end date after stacking subscriptions
 */
export const calculateStackedEndDate = (
  currentEndDate: string | Date,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): Date => {
  // Parse the date ensuring proper handling of UTC conversion issues
  const endDate = typeof currentEndDate === 'string' 
    ? new Date(currentEndDate) 
    : new Date(currentEndDate);
  
  // If the current subscription has already expired, start from now
  const now = new Date();
  
  // Use the later of the two dates as our base date
  const baseDate = endDate > now ? new Date(endDate) : new Date(now);
  
  // Make a clean clone of the date to avoid mutation issues
  const newEndDate = new Date(baseDate.getTime());
  
  // Add time based on billing cycle
  if (billingCycle === 'yearly') {
    // Add exactly one year
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
  } else {
    // Handle edge cases with months having different lengths:
    // Store current day of month
    const currentDay = newEndDate.getDate();
    
    // Add one month
    newEndDate.setMonth(newEndDate.getMonth() + 1);
    
    // Check if the day changed (e.g., Jan 31 + 1 month = Feb 28/29)
    const newDay = newEndDate.getDate();
    if (currentDay !== newDay) {
      // If day changed, it means we hit a month boundary issue
      // Set to last day of previous month
      newEndDate.setDate(0);
    }
  }
  

  return newEndDate;
};

/**
 * Formats a subscription duration for display
 * 
 * @param startDate - The start date of the subscription
 * @param endDate - The end date of the subscription
 * @returns Formatted string showing the duration
 */
export const formatSubscriptionDuration = (
  startDate: string | Date,
  endDate: string | Date
): string => {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);
  
  // Calculate total days
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 31) {
    return `${daysDiff} days`;
  } else if (daysDiff <= 365) {
    const months = Math.floor(daysDiff / 30);
    const remainingDays = daysDiff % 30;
    return `${months} month${months > 1 ? 's' : ''}${remainingDays > 0 ? ` and ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : ''}`;
  } else {
    const years = Math.floor(daysDiff / 365);
    const remainingDays = daysDiff % 365;
    const months = Math.floor(remainingDays / 30);
    return `${years} year${years > 1 ? 's' : ''}${months > 0 ? ` and ${months} month${months > 1 ? 's' : ''}` : ''}`;
  }
};

/**
 * Checks if a subscription is active based on its end date
 * 
 * @param endDate - The end date of the subscription
 * @returns Boolean indicating if the subscription is still active
 */
export const isSubscriptionActive = (endDate: string | Date): boolean => {
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);
  const now = new Date();
  return end > now;
};

/**
 * Calculates remaining days in a subscription
 * 
 * @param endDate - The end date of the subscription
 * @returns Number of days remaining in the subscription
 */
export const getSubscriptionRemainingDays = (endDate: string | Date): number => {
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);
  const now = new Date();
  
  if (end <= now) return 0;
  
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}; 