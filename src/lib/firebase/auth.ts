/**
 * Firebase Authentication Module
 * 
 * Handles all Firebase authentication operations:
 * - User registration
 * - Login functionality
 * - Session management
 * - Logout operations
 */

import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { app } from './index';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore directly in auth module to avoid circular dependencies
const db = getFirestore(app);
const usersCollection = collection(db, 'users');

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

// Internal helper function to get user profile
async function _getUserProfile(userId: string) {
  try {
    console.log('Getting user profile from Firestore:', userId);
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = { id: userSnap.id, ...userSnap.data() } as {
        id: string;
        email: string;
        name: string;
        subscription?: {
          status: string;
          plan: string;
          endDate: string;
        };
        purchases?: any[];
        createdAt?: string;
        lastLogin?: string;
        membershipInfo?: {
          joinDate: string;
          status: string;
          expiryDate: string | null;
          updatedAt?: string;
        };
      };
      console.log('User profile retrieved successfully');
      return userData;
    }
    
    console.log('User profile not found');
    return null;
  } catch (error: any) {
    console.error('Error getting user profile from Firestore:', error);
    
    // Check if it's a permission error
    if (error.code === 'permission-denied') {
      console.warn('FIREBASE PERMISSION ERROR: You need to update your Firebase security rules for read access');
      // For development, create a fake profile based on the uid
      return {
        id: userId,
        email: 'temp@example.com',
        name: 'Temporary User',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        subscription: {
          status: 'inactive',
          plan: 'none',
          endDate: new Date().toISOString(),
        },
        purchases: [],
        membershipInfo: {
          joinDate: new Date().toISOString(),
          status: 'free',
          expiryDate: null
        }
      };
    }
    
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string) {
  try {
    console.log('Attempting login with email:', email);
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
    
    // Create a user profile in Firestore
    const userProfile = {
      id: result.user.uid,
      email: result.user.email || '',
      name: name.trim(),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      subscription: {
        status: 'inactive',
        plan: 'none',
        endDate: new Date().toISOString(),
      },
      purchases: [],
      membershipInfo: {
        joinDate: new Date().toISOString(),
        status: 'free',
        expiryDate: null
      }
    };
    
    // Save to Firestore
    console.log('Saving new user profile to Firestore');
    await _saveUserProfile(result.user.uid, userProfile);
    console.log('User profile saved successfully');
    
    return { user: userProfile };
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle specific Firebase auth errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already in use. Try logging in instead.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please provide a valid email address.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. It must be at least 6 characters.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to register. Please try again later.');
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

export async function updateUserMembership(userId: string, membershipData: any) {
  try {
    // Get the current user profile
    const userProfile = await _getUserProfile(userId);
    
    if (!userProfile) {
      throw new Error('User profile not found');
    }
    
    // Update the membership information
    const updatedProfile = {
      ...userProfile,
      subscription: {
        status: membershipData.status || 'inactive',
        plan: membershipData.plan || 'none',
        endDate: membershipData.endDate || new Date().toISOString(),
      },
      membershipInfo: {
        // Check if existing membershipInfo exists, otherwise create new object
        ...(userProfile.membershipInfo || {
          joinDate: new Date().toISOString(),
          status: 'free',
          expiryDate: null
        }),
        status: membershipData.status || 'free',
        expiryDate: membershipData.endDate || null,
        updatedAt: new Date().toISOString()
      }
    };
    
    // Save the updated profile to Firestore
    await _saveUserProfile(userId, updatedProfile);
    
    return updatedProfile;
  } catch (error) {
    console.error('Update membership error:', error);
    throw new Error('Failed to update membership');
  }
} 