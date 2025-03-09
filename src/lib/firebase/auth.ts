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
  setPersistence 
} from 'firebase/auth';
import { app } from './index';
import { getFirestore, doc, setDoc, getDoc, collection, updateDoc } from 'firebase/firestore';

// Initialize Firebase Auth
export const auth = getAuth(app);

// Configure auth persistence to LOCAL to keep the user logged in
// even after browser refresh or closing the tab
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase Auth persistence set to LOCAL');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

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
  }>;
  totalSubscriptionSpend?: number;
}

// Internal helper function to save user profile
async function _saveUserProfile(userId: string, userData: any) {
  try {
    console.log('Saving user profile to Firestore:', { userId });
    
    // For development, let's print userData to console so we can see it 
    // even if Firestore write fails
    console.log('User data being saved:', JSON.stringify(userData, null, 2));
    
    const userRef = doc(usersCollection, userId);
    await setDoc(userRef, {
      ...userData,
      updatedAt: new Date()
    }, { merge: true });
    
    console.log('User profile saved successfully');
    return userData;
  } catch (error: any) {
    console.error('Error saving user profile to Firestore:', error);
    
    // Check if it's a permission error
    if (error.code === 'permission-denied') {
      console.warn('FIREBASE PERMISSION ERROR: You need to update your Firebase security rules');
      console.warn('Please go to the Firebase console and update your Firestore rules:');
      console.warn(`
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          // Allow read/write access for all users during development
          match /{document=**} {
            allow read, write: if true;
          }
        }
      }
      `);
      
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
      console.log('User profile retrieved successfully');
      return userData;
    }
    
    console.log('User profile not found');
    return null;
  } catch (error: any) {
    console.error('Error getting user profile from Firestore:', error);
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string) {
  try {
    console.log('Attempting login with email:', email);
    
    // Ensure persistence is set to LOCAL for this specific login
    await setPersistence(auth, browserLocalPersistence);
    
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Get the user profile from Firestore
    const userProfile = await _getUserProfile(result.user.uid);
    
    if (!userProfile) {
      console.log('Creating default profile for existing auth user');
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
    console.log('Registering new user with email:', email);
    
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
    console.log('User created in Firebase Auth, UID:', result.user.uid);
    
    // Set the display name
    await updateProfile(result.user, {
      displayName: name.trim()
    });
    console.log('Display name set for user');
    
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
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout');
  }
}

// Update the updateUserMembership function to use the correct type
export async function updateUserMembership(userId: string, membershipData: any): Promise<UserProfileData> {
  try {
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
    
    // Add the new subscription to history
    subscriptionHistory.push({
      purchaseDate: now.toISOString(),
      plan: membershipData.plan || 'none',
      billingCycle: membershipData.billingCycle || 'monthly',
      amount: purchaseAmount,
      expiryDate: membershipData.endDate || null,
      transactionId: membershipData.transactionId || `txn_${Date.now()}`
    });
    
    // Calculate the total amount spent on subscriptions
    let totalSubscriptionSpend = userProfile.totalSubscriptionSpend || 0;
    totalSubscriptionSpend += purchaseAmount;
    
    // Update the membership information
    const updatedProfile = {
      ...userProfile,
      // Update subscription info
      subscription: {
        status: membershipData.status || 'inactive',
        plan: membershipData.plan || 'none',
        endDate: membershipData.endDate || new Date().toISOString(),
        token: membershipData.subscriptionToken || null,
        billingCycle: membershipData.billingCycle || 'monthly',
        price: membershipData.price || 0
      },
      // Track subscription history
      subscriptionHistory: subscriptionHistory,
      // Update total spend on subscriptions
      totalSubscriptionSpend: totalSubscriptionSpend,
      // Update membership info
      membershipInfo: {
        // Check if existing membershipInfo exists, otherwise create new object
        ...(userProfile.membershipInfo || {
          joinDate: now.toISOString(),
          status: 'free',
          expiryDate: null,
          totalPurchases: 0,
          renewalCount: 0
        }),
        status: membershipData.status || 'free',
        expiryDate: membershipData.endDate || null,
        billingCycle: membershipData.billingCycle || 'monthly',
        token: membershipData.subscriptionToken || null,
        updatedAt: now.toISOString(),
        // Increment total purchases
        totalPurchases: (userProfile.membershipInfo?.totalPurchases || 0) + 1,
        // If this is a renewal (same plan), increment renewalCount
        renewalCount: userProfile.subscription?.plan === membershipData.plan 
          ? (userProfile.membershipInfo?.renewalCount || 0) + 1 
          : (userProfile.membershipInfo?.renewalCount || 0),
        // Track cumulative spending
        totalSpend: (userProfile.membershipInfo?.totalSpend || 0) + purchaseAmount,
        // Last purchase date
        lastPurchaseDate: now.toISOString()
      }
    };
    
    // Update the user document in Firestore
    const userRef = doc(usersCollection, userId);
    await updateDoc(userRef, updatedProfile);
    
    return updatedProfile;
  } catch (error) {
    console.error('Error updating user membership:', error);
    throw error;
  }
} 