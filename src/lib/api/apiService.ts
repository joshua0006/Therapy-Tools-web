/**
 * API Service Module
 * 
 * Centralizes all API-related functionality for the application.
 * This module re-exports functions from various API modules to provide
 * a single point of access for API operations.
 */

import { makeWooRequest, getWooConfig, getApiConfig } from '../woocommerce/config';

// Re-export API functions
export { makeWooRequest, getWooConfig, getApiConfig };

// Add any additional API utility functions here 