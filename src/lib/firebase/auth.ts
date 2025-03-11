/**
 * Firebase Authentication Module
 * 
 * Handles all Firebase authentication operations:
 * - User registration
 * - Login functionality
 * - Session management
 * - Logout operations
 */

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  setPersistence,
  onAuthStateChanged
} from 'firebase/auth';
import { app } from './index';
import { getFirestore, doc, setDoc, getDoc, collection, updateDoc } from 'firebase/firestore';

// Initialize Firebase Auth
export const auth = getAuth(app);

// Configure auth persistence to LOCAL to keep the user logged in
// even after browser refresh or closing the tab
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    // Set up a listener to detect auth state changes and store in localStorage
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, store a flag in localStorage
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('lastAuthCheck', new Date().toISOString());
      } else {
        // User is signed out, remove the flag
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('lastAuthCheck');
      }
    });
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

// Function to check if session is still valid
export const checkSessionValidity = () => {
  const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
  const lastCheck = localStorage.getItem('lastAuthCheck');
  
  if (isLoggedIn && lastCheck) {
    // Update the last check time
    localStorage.setItem('lastAuthCheck', new Date().toISOString());
    return true;
  }
  
  return false;
};

// Initialize Firestore directly in auth module to avoid circular dependencies
const db = getFirestore(app);
const usersCollection = collection(db, 'users');

// Add or update the user profile type definition to include new fields
interface UserProfileData {
  id: string;
  email: string;
  name: string;
  subscription?: {
    status: string;
    plan: string;
    endDate: string;
    token?: string | null;
    billingCycle?: string;
    price?: number;
    stackedCount?: number;
  };
  purchases?: any[];
  createdAt?: string;
  lastLogin?: string;
  membershipInfo?: {
    joinDate: string;
    status: string;
    expiryDate: string | null;
    updatedAt?: string;
    totalPurchases?: number;
    renewalCount?: number;
    totalSpend?: number;
    lastPurchaseDate?: string;
  };
  subscriptionHistory?: Array<{
    purchaseDate: string;
    plan: string;
    billingCycle: string;
    amount: number;
    expiryDate: string | null;
    transactionId: string;
    isStacked: boolean;
  }>;
  totalSubscriptionSpend?: number;
}

// Internal helper function to save user profile
async function _saveUserProfile(userId: string, userData: any) {
  try {
    const userRef = doc(usersCollection, userId);
    await setDoc(userRef, {
      ...userData,
      updatedAt: new Date()
    }, { merge: true });
    
    return userData;
  } catch (error: any) {
    console.error('Error saving user profile to Firestore:', error);
    
    // Check if it's a permission error
    if (error.code === 'permission-denied') {
      // Return the data anyway for development purposes
      return userData;
    }
    
    throw error;
  }
}

// Update the _getUserProfile function to use the new type
async function _getUserProfile(userId: string): Promise<UserProfileData | null> {
  try {
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = { id: userSnap.id, ...userSnap.data() } as UserProfileData;
      return userData;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error getting user profile from Firestore:', error);
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string) {
  try {
    // Ensure persistence is set to LOCAL for this specific login
    await setPersistence(auth, browserLocalPersistence);
    
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Store session data in localStorage for additional persistence
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('lastAuthCheck', new Date().toISOString());
    localStorage.setItem('userEmail', email);
    
    // Get the user profile from Firestore
    const userProfile = await _getUserProfile(result.user.uid);
    
    if (!userProfile) {
      // If for some reason the profile doesn't exist, create it
      const defaultProfile = {
        id: result.user.uid,
        email: result.user.email || '',
        name: result.user.displayName || 'User',
        subscription: {
          status: 'inactive',
          plan: 'none',
          endDate: new Date().toISOString(),
        },
        purchases: [],
        lastLogin: new Date().toISOString()
      };
      
      await _saveUserProfile(result.user.uid, defaultProfile);
      return { user: defaultProfile };
    }
    
    // Update last login date
    await _saveUserProfile(result.user.uid, {
      ...userProfile,
      lastLogin: new Date().toISOString()
    });
    
    return { user: userProfile };
  } catch (error) {
    console.error('Login error:', error);
    throw new Error('Failed to login. Please check your email and password.');
  }
}

export async function registerWithEmail(email: string, password: string, name: string = 'User') {
  try {
    // Validate inputs
    if (!email || !email.includes('@')) {
      throw new Error('Please provide a valid email address');
    }
    
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    if (!name || name.trim().length === 0) {
      name = 'User'; // Default name if empty
    }
    
    // Create the user in Firebase Auth
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Set the display name
    await updateProfile(result.user, {
      displayName: name.trim()
    });
    
    // Return the user credential (the profile creation will happen in AuthContext)
    return result;
  } catch (error: any) {
    console.error('Registration error:', error.message);
    
    // Translate Firebase auth errors to user-friendly messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please provide a valid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password must be at least 6 characters');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection');
    } else {
      throw error;
    }
  }
}

export async function logoutUser() {
  try {
    // Clear session data from localStorage
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('lastAuthCheck');
    localStorage.removeItem('userEmail');
    
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout');
  }
}

// Update the updateUserMembership function to use the correct type
export async function updateUserMembership(userId: string, membershipData: any): Promise<UserProfileData> {
  console.log('Updating user membership:', membershipData);
  
  // Get the current user profile
  const userProfile = await _getUserProfile(userId);
  
  if (!userProfile) {
    throw new Error('User profile not found');
  }
  
  // Get current date for tracking
  const now = new Date();
  
  // Track subscription history and total spend
  const purchaseAmount = membershipData.price || 0;
  const subscriptionHistory = userProfile.subscriptionHistory || [];
  
  // Ensure proper date handling for end date
  let endDate = membershipData.endDate;
  if (endDate && typeof endDate === 'object' && endDate instanceof Date) {
    endDate = endDate.toISOString();
  }
  
  // Add the new subscription to history
  subscriptionHistory.push({
    purchaseDate: now.toISOString(),
    plan: membershipData.plan || 'none',
    billingCycle: membershipData.billingCycle || 'monthly',
    amount: purchaseAmount,
    expiryDate: endDate || null,
    transactionId: membershipData.transactionId || `txn_${Date.now()}`,
    isStacked: membershipData.isStacked || false // Add stacking information
  });
  
  // Calculate the total amount spent on subscriptions
  let totalSubscriptionSpend = userProfile.totalSubscriptionSpend || 0;
  totalSubscriptionSpend += purchaseAmount;
  
  // For stacked subscriptions, log additional information
  if (membershipData.isStacked) {
    console.log(`Stacking subscription for user ${userId}:`);
    console.log(`- Old end date: ${userProfile.subscription?.endDate || 'none'}`);
    console.log(`- New end date: ${endDate}`);
    console.log(`- Billing cycle: ${membershipData.billingCycle}`);
  }
  
  // Update the membership information
  const updatedProfile = {
    ...userProfile,
    // Update subscription info
    subscription: {
      status: membershipData.status || 'inactive',
      plan: membershipData.plan || 'none',
      endDate: endDate || new Date().toISOString(),
      token: membershipData.subscriptionToken || null,
      billingCycle: membershipData.billingCycle || 'monthly',
      price: membershipData.price || 0,
      stackedCount: membershipData.isStacked ? 
        ((userProfile.subscription?.stackedCount || 0) + 1) : 0 // Track how many times subscriptions have been stacked
    },
    // Track subscription history
    subscriptionHistory: subscriptionHistory,
    // Update total spend on subscriptions
    totalSubscriptionSpend: totalSubscriptionSpend,
    // Update the lastUpdated field to ensure the user profile is refreshed in the UI
    lastUpdated: new Date().toISOString()
  };
  
  // Save the updated profile to Firestore
  await _saveUserProfile(userId, updatedProfile);
  
  return updatedProfile;
} 