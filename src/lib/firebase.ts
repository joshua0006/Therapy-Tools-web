/**
 * Firebase Module
 * 
 * This is a barrel file that re-exports all Firebase functionality.
 * It's maintained for backward compatibility with existing code.
 * 
 * For new code, import directly from the sub-modules:
 * - src/lib/firebase/index.ts - Core Firebase app
 * - src/lib/firebase/auth.ts - Authentication
 * - src/lib/firebase/firestore.ts - Firestore database
 */

// Re-export from core
export { app } from './firebase/index';

// Re-export from auth
export { 
  auth, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser,
  updateUserMembership
} from './firebase/auth';

// Re-export from firestore
export {
  saveUserProfile,
  getUserProfile,
  recordPurchase,
  getUserPurchases,
  getPurchase,
  getFeaturedProducts
} from './firebase/firestore';