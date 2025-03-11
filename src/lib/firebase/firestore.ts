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
const productsCollection = collection(db, 'products');

// Add BillingAddress interface
interface BillingAddress {
  firstName: string;
  lastName: string;
  organization: string;
  streetAddress: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  phoneCountryCode: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Add ShippingAddress interface
interface ShippingAddress {
  id?: string;
  firstName: string;
  lastName: string;
  company?: string;
  organization?: string;
  streetAddress: string;
  apartment?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  phoneCountryCode: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

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
export async function getUserProfile(userId: string): Promise<{
  id: string;
  billingAddresses?: BillingAddress[];
  shippingAddresses?: ShippingAddress[];
  [key: string]: any;
} | null> {
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
  
  // Basic validation of purchase data
  if (!purchaseData.items || !Array.isArray(purchaseData.items)) {
    console.error('Invalid purchase data: items is missing or not an array');
    purchaseData.items = [];
  }
  
  // Handle potential undefined values that cause Firestore errors
  if (purchaseData.subscription === undefined) {
    console.log('Converting undefined subscription to null before saving to Firestore');
    purchaseData.subscription = null;
  }
  
  // Clean the purchaseData to remove undefined values (Firestore doesn't accept undefined)
  const cleanedPurchaseData = cleanObjectForFirestore(purchaseData);
  
  // Double-check subscription field after cleaning
  if (!cleanedPurchaseData.subscription) {
    cleanedPurchaseData.subscription = null;
  }
  
  // Create a new purchase record
  const newPurchase = {
    userId,
    ...cleanedPurchaseData,
    createdAt: new Date(),
    status: cleanedPurchaseData.status || 'completed'
  };
  
  try {
    // Add to purchases collection
    console.log('Adding purchase to Firestore collection');
    const purchaseRef = await addDoc(purchasesCollection, newPurchase);
    console.log('Purchase added successfully with ID:', purchaseRef.id);
    
    // Return the purchase with the ID
    return { id: purchaseRef.id, ...newPurchase };
  } catch (error) {
    console.error('Error recording purchase in Firestore:', error);
    throw error;
  }
}

/**
 * Recursively removes undefined values from an object
 * Firestore doesn't accept undefined values
 */
function cleanObjectForFirestore(obj: any): any {
  // If not an object or null, return as is
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForFirestore(item));
  }
  
  // Process object properties
  const cleanedObj: any = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Skip undefined values
      if (obj[key] === undefined) {
        // For fields that should never be undefined, provide a default value
        if (key === 'subscription') {
          cleanedObj[key] = null; // Replace undefined subscription with null
        }
        continue;
      }
      
      // Recursively clean nested objects/arrays
      if (obj[key] !== null && typeof obj[key] === 'object') {
        cleanedObj[key] = cleanObjectForFirestore(obj[key]);
      } else {
        cleanedObj[key] = obj[key];
      }
    }
  }
  
  return cleanedObj;
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

/**
 * Save or update user's billing information
 */
export async function saveBillingInformation(userId: string, billingData: any, isDefault: boolean = false) {
  console.log('Saving billing information for user:', userId);
  
  try {
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      // Initialize billingAddresses array if it doesn't exist
      const billingAddresses: BillingAddress[] = userData.billingAddresses || [];
      
      // Clean billing data before storing
      const cleanBillingData: BillingAddress = {
        firstName: billingData.firstName || '',
        lastName: billingData.lastName || '',
        organization: billingData.organization || '',
        streetAddress: billingData.streetAddress || '',
        city: billingData.city || '',
        state: billingData.state || '',
        postcode: billingData.postcode || '',
        country: billingData.country || '',
        phone: billingData.phone || '',
        phoneCountryCode: billingData.phoneCountryCode || '',
        createdAt: new Date()
      };
      
      // If this is marked as the default address, remove default flag from other addresses
      if (isDefault) {
        billingAddresses.forEach((address: BillingAddress) => {
          if (address.isDefault) {
            address.isDefault = false;
          }
        });
        
        cleanBillingData.isDefault = true;
      }
      
      // Check if we need to update an existing address or add a new one
      const existingAddressIndex = billingAddresses.findIndex(
        (address: BillingAddress) => 
          address.streetAddress === cleanBillingData.streetAddress &&
          address.city === cleanBillingData.city &&
          address.postcode === cleanBillingData.postcode
      );
      
      if (existingAddressIndex >= 0) {
        // Update existing address
        billingAddresses[existingAddressIndex] = {
          ...billingAddresses[existingAddressIndex],
          ...cleanBillingData,
          updatedAt: new Date()
        };
      } else {
        // Add new address
        billingAddresses.push(cleanBillingData);
      }
      
      // Update user profile with billing addresses
      await updateDoc(userRef, {
        billingAddresses,
        updatedAt: new Date()
      });
      
      console.log('Billing information saved successfully');
      return billingAddresses;
    } else {
      console.error('User not found when saving billing information');
      return null;
    }
  } catch (error) {
    console.error('Error saving billing information:', error);
    throw error;
  }
}

/**
 * Get user's billing information
 */
export async function getUserBillingInformation(userId: string): Promise<BillingAddress[]> {
  try {
    const userProfile = await getUserProfile(userId);
    
    if (userProfile && userProfile.billingAddresses) {
      return userProfile.billingAddresses as BillingAddress[];
    }
    
    return [];
  } catch (error) {
    console.error('Error retrieving billing information:', error);
    return [];
  }
}

// Add saveShippingInformation function
/**
 * Save or update user's shipping information
 */
export async function saveShippingInformation(userId: string, shippingData: any, isDefault: boolean = false) {
  console.log('Saving shipping information for user:', userId);
  
  try {
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      // Initialize shippingAddresses array if it doesn't exist
      const shippingAddresses: ShippingAddress[] = userData.shippingAddresses || [];
      
      // Clean shipping data before storing
      const cleanShippingData: ShippingAddress = {
        firstName: shippingData.firstName || '',
        lastName: shippingData.lastName || '',
        company: shippingData.company || '',
        organization: shippingData.organization || '',
        streetAddress: shippingData.streetAddress || '',
        apartment: shippingData.apartment || '',
        city: shippingData.city || '',
        state: shippingData.state || '',
        postcode: shippingData.postcode || '',
        country: shippingData.country || '',
        phone: shippingData.phone || '',
        phoneCountryCode: shippingData.phoneCountryCode || '',
        createdAt: shippingData.createdAt || new Date()
      };
      
      // If this is marked as the default address, remove default flag from other addresses
      if (isDefault) {
        shippingAddresses.forEach((address: ShippingAddress) => {
          if (address.isDefault) {
            address.isDefault = false;
          }
        });
        
        cleanShippingData.isDefault = true;
      }
      
      // Create a unique ID for the address if it doesn't have one
      if (!cleanShippingData.id) {
        cleanShippingData.id = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      }
      
      // Check if we need to update an existing address or add a new one
      const existingAddressIndex = shippingAddresses.findIndex(
        (address: ShippingAddress) => 
          address.id === cleanShippingData.id || (
            address.streetAddress === cleanShippingData.streetAddress &&
            address.city === cleanShippingData.city &&
            address.postcode === cleanShippingData.postcode &&
            address.firstName === cleanShippingData.firstName &&
            address.lastName === cleanShippingData.lastName
          )
      );
      
      if (existingAddressIndex >= 0) {
        // Update existing address
        shippingAddresses[existingAddressIndex] = {
          ...shippingAddresses[existingAddressIndex],
          ...cleanShippingData,
          updatedAt: new Date()
        };
      } else {
        // Add new address
        shippingAddresses.push(cleanShippingData);
      }
      
      // Update user profile with shipping addresses
      const updates: any = {
        shippingAddresses,
        updatedAt: new Date()
      };
      
      // Also save shipping info in the user profile for easier access
      if (cleanShippingData.isDefault) {
        updates.shippingProfile = {
          firstName: cleanShippingData.firstName,
          lastName: cleanShippingData.lastName,
          company: cleanShippingData.company,
          organization: cleanShippingData.organization,
          streetAddress: cleanShippingData.streetAddress,
          apartment: cleanShippingData.apartment,
          city: cleanShippingData.city,
          state: cleanShippingData.state,
          postcode: cleanShippingData.postcode,
          country: cleanShippingData.country,
          phone: cleanShippingData.phone,
          phoneCountryCode: cleanShippingData.phoneCountryCode,
          updatedAt: new Date()
        };
      }
      
      await updateDoc(userRef, updates);
      
      console.log('Shipping information saved successfully');
      return shippingAddresses;
    } else {
      console.error('User document does not exist');
      throw new Error('User document does not exist');
    }
  } catch (error) {
    console.error('Error saving shipping information:', error);
    throw error;
  }
}

/**
 * Get user's shipping information
 */
export async function getUserShippingInformation(userId: string): Promise<ShippingAddress[]> {
  try {
    const userProfile = await getUserProfile(userId);
    
    if (userProfile && userProfile.shippingAddresses) {
      return userProfile.shippingAddresses as ShippingAddress[];
    }
    
    return [];
  } catch (error) {
    console.error('Error retrieving shipping information:', error);
    return [];
  }
}

/**
 * Get featured products from Firebase
 */
export async function getFeaturedProducts(limit: number = 3) {
  try {
    console.log('Fetching featured products from Firebase...');
    
    // Get products collection and limit to the specified number
    const productsQuery = query(productsCollection);
    const productsSnapshot = await getDocs(productsQuery);
    
    if (productsSnapshot.empty) {
      console.log('No products found in the collection');
      return [];
    }
    
    console.log(`Found ${productsSnapshot.size} products`);
    
    const loadedProducts: any[] = [];
    
    productsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Product data for ${doc.id}:`, data);
      
      // Extract price, handling various formats
      let productPrice = 0;
      if (typeof data.price === 'number') {
        productPrice = data.price;
      } else if (typeof data.price === 'string') {
        // Remove currency symbols and convert to number
        productPrice = parseFloat(data.price.replace(/[^0-9.-]+/g, '')) || 0;
      }
      
      const product = {
        id: doc.id,
        name: data.name || data.title || 'Unnamed Product',
        description: data.description || data.content || '',
        price: productPrice,
        thumbnail: data.thumbnail || data.image || data.images?.[0]?.src || '',
        category: data.category || data.productCategory || 'Uncategorized',
        categories: Array.isArray(data.categories) ? data.categories : 
          (data.category ? [data.category] : ['Uncategorized']),
        downloads: data.downloads || [],
        pdfUrl: data.pdfUrl || data.fileUrl || '',
        featured: data.featured || false,
        // Include all original data
        ...data
      };
      
      // Only add featured products or all if there aren't enough featured ones
      if (data.featured) {
        loadedProducts.push(product);
      }
    });
    
    // If we don't have enough featured products, add non-featured ones
    if (loadedProducts.length < limit) {
      productsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.featured && loadedProducts.length < limit) {
          // Extract price, handling various formats
          let productPrice = 0;
          if (typeof data.price === 'number') {
            productPrice = data.price;
          } else if (typeof data.price === 'string') {
            // Remove currency symbols and convert to number
            productPrice = parseFloat(data.price.replace(/[^0-9.-]+/g, '')) || 0;
          }
          
          const product = {
            id: doc.id,
            name: data.name || data.title || 'Unnamed Product',
            description: data.description || data.content || '',
            price: productPrice,
            thumbnail: data.thumbnail || data.image || data.images?.[0]?.src || '',
            category: data.category || data.productCategory || 'Uncategorized',
            categories: Array.isArray(data.categories) ? data.categories : 
              (data.category ? [data.category] : ['Uncategorized']),
            downloads: data.downloads || [],
            pdfUrl: data.pdfUrl || data.fileUrl || '',
            featured: data.featured || false,
            // Include all original data
            ...data
          };
          
          loadedProducts.push(product);
        }
      });
    }
    
    // Return only the requested number of products
    return loadedProducts.slice(0, limit);
  } catch (err) {
    console.error('Error fetching featured products:', err);
    return [];
  }
} 