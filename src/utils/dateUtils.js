// dateUtils.js
// Utility functions for date formatting and manipulation
// This module provides functions to get all dates in a year and format a date object

// Example: Format a date string as YYYY-MM-DD
export function formatDate(date) {
  // Converts a JS Date object to a string in YYYY-MM-DD format
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Example: Get the day of week for a date
export function getDayOfWeek(date) {
  // Returns the day of week (e.g., 'Mon', 'Tue') for a given date
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

// Get all dates in a given year
export function getAllDates(year) {
  // Initializes an empty array to store date objects
  const dates = [];
  // Sets the start date to January 1st of the given year
  const start = new Date(year, 0, 1);
  // Sets the end date to December 31st of the given year
  const end = new Date(year, 11, 31);
  // Loops through each day of the year, from start to end
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Formats the current date as MM/DD/YYYY
    const dateStr = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
    // Gets the abbreviated day of the week (e.g., 'Mon', 'Tue')
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    // Adds an object with the date and day to the dates array
    dates.push({ date: dateStr, day: dayStr });
  }
  // Returns the array of date objects
  return dates;
}
