/**
 * Firestore Module
 * 
 * Handles all Firestore database operations:
 * - User profiles
 * - Purchase tracking
 * - Membership management
 */

import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { app } from './index';

// Initialize Firestore using the existing app instance
const db = getFirestore(app);

// Collection references
const usersCollection = collection(db, 'users');
const purchasesCollection = collection(db, 'purchases');

/**
 * Save user profile data to Firestore
 */
export async function saveUserProfile(userId: string, userData: any) {
  const userRef = doc(usersCollection, userId);
  await setDoc(userRef, {
    ...userData,
    updatedAt: new Date()
  }, { merge: true });
  return userData;
}

/**
 * Get user profile data from Firestore
 */
export async function getUserProfile(userId: string) {
  const userRef = doc(usersCollection, userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  
  return null;
}

/**
 * Record a new purchase for a user
 */
export async function recordPurchase(userId: string, purchaseData: any) {
  // Create a new purchase record
  const newPurchase = {
    userId,
    ...purchaseData,
    createdAt: new Date(),
    status: 'completed'
  };
  
  // Add to purchases collection
  const purchaseRef = await addDoc(purchasesCollection, newPurchase);
  
  // Update user's purchase history
  const userRef = doc(usersCollection, userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data();
    const purchases = userData.purchases || [];
    
    await updateDoc(userRef, {
      purchases: [...purchases, { id: purchaseRef.id, ...newPurchase }]
    });
  }
  
  return { id: purchaseRef.id, ...newPurchase };
}

/**
 * Get all purchases for a user
 */
export async function getUserPurchases(userId: string) {
  const q = query(purchasesCollection, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  
  const purchases: any[] = [];
  querySnapshot.forEach((docSnapshot) => {
    purchases.push({ id: docSnapshot.id, ...docSnapshot.data() });
  });
  
  return purchases;
}

/**
 * Get a specific purchase by ID
 */
export async function getPurchase(purchaseId: string) {
  const purchaseRef = doc(purchasesCollection, purchaseId);
  const purchaseSnap = await getDoc(purchaseRef);
  
  if (purchaseSnap.exists()) {
    return { id: purchaseSnap.id, ...purchaseSnap.data() };
  }
  
  return null;
} 