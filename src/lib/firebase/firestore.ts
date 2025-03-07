/**
 * Firestore Database Module
 * 
 * Handles all interactions with Firestore:
 * - User profiles
 * - Purchase history
 * - Membership data
 * - Usage statistics
 */

import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc 
} from 'firebase/firestore';
import { app } from './index';

// Initialize Firestore
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
  console.log('Recording purchase for user:', userId);
  console.log('Purchase data to record:', JSON.stringify(purchaseData, null, 2));
  
  // Validate purchase data
  if (!purchaseData.items || !Array.isArray(purchaseData.items)) {
    console.error('Invalid purchase data: items is missing or not an array');
    purchaseData.items = [];
  }
  
  // Create a new purchase record
  const newPurchase = {
    userId,
    ...purchaseData,
    createdAt: new Date(),
    status: purchaseData.status || 'completed'
  };
  
  try {
    // Add to purchases collection
    console.log('Adding purchase to Firestore collection');
    const purchaseRef = await addDoc(purchasesCollection, newPurchase);
    console.log('Purchase added successfully with ID:', purchaseRef.id);
    
    // Update user's purchase history
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      console.log('User exists, updating purchase history');
      const userData = userSnap.data();
      const purchases = userData.purchases || [];
      
      await updateDoc(userRef, {
        purchases: [...purchases, { id: purchaseRef.id, ...newPurchase }]
      });
      console.log('User purchase history updated successfully');
    } else {
      console.error('User document not found for user ID:', userId);
    }
    
    return { id: purchaseRef.id, ...newPurchase };
  } catch (error) {
    console.error('Error recording purchase in Firestore:', error);
    throw error;
  }
}

/**
 * Get all purchases for a user
 */
export async function getUserPurchases(userId: string) {
  console.log('Fetching purchases for user:', userId);
  
  try {
    const q = query(purchasesCollection, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const purchases: any[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const purchaseData = docSnapshot.data();
      
      // Ensure expected structure for purchases
      const formattedPurchase = {
        id: docSnapshot.id,
        ...purchaseData,
        // Ensure items are properly formatted
        items: Array.isArray(purchaseData.items) ? purchaseData.items.map((item: any) => ({
          id: item.id || 0,
          type: item.type || 'product',
          name: item.name || 'Unknown Product',
          description: item.description || '',
          category: item.category || 'Resource',
          price: typeof item.price === 'string' ? item.price : String(item.price || 0),
          quantity: item.quantity || 1,
          imageUrl: item.imageUrl || ''
        })) : [],
        // Ensure other fields are properly formatted
        total: typeof purchaseData.total === 'string' ? purchaseData.total : String(purchaseData.total || 0),
        transactionId: purchaseData.transactionId || 'unknown',
        purchaseDate: purchaseData.purchaseDate || (purchaseData.createdAt ? purchaseData.createdAt.toDate?.().toISOString() : new Date().toISOString()),
        paymentMethod: purchaseData.paymentMethod || 'unknown',
        status: purchaseData.status || 'completed'
      };
      
      purchases.push(formattedPurchase);
    });
    
    console.log(`Found ${purchases.length} purchases for user ${userId}`);
    
    if (purchases.length > 0) {
      console.log('Sample purchase data:', JSON.stringify(purchases[0], null, 2));
    }
    
    return purchases;
  } catch (error) {
    console.error('Error fetching user purchases:', error);
    return [];
  }
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