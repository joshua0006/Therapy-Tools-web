import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { auth, loginWithEmail, registerWithEmail, logoutUser, updateUserMembership, checkSessionValidity } from '../lib/firebase/auth';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { saveUserProfile, getUserProfile, recordPurchase, getUserPurchases, saveBillingInformation, getUserBillingInformation, saveShippingInformation, getUserShippingInformation } from '../lib/firebase/firestore';
import { toast } from 'react-hot-toast';
import { calculateStackedEndDate, formatSubscriptionDuration } from '../utils/subscriptionUtils';

// Add Purchase interface definition
interface PurchaseItem {
  id: number | string;
  type: 'product' | 'plan';
  name: string;
  description?: string;
  category?: string;
  price: string | number;
  quantity: number;
  imageUrl?: string;
  pdfUrl?: string;
  fileUrl?: string;
}

interface Purchase {
  id: string;
  items: PurchaseItem[];
  total: string | number;
  transactionId: string;
  paymentMethod: string;
  purchaseDate: string;
  status: string;
  createdAt?: any;
  billingInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  subscription?: {
    plan: string;
    billingCycle: string;
    endDate: string;
    token?: string;
    status?: string;
  };
}

// Define user types
export interface UserProfile {
  id: string;
  name?: string;
  email: string;
  photoURL?: string;
  role?: string;
  createdAt?: string;
  lastLogin?: string;
  subscription?: {
    status: string;
    plan: string;
    endDate: string;
    token?: string;
    billingCycle?: 'monthly' | 'yearly';
    stackedCount?: number; // Number of times subscriptions have been stacked
  };
  purchases?: Purchase[];
  billingAddresses?: BillingAddress[];
  membershipInfo?: {
    joinDate: string;
    status: string;
    expiryDate: string | null;
    updatedAt?: string;
    token?: string;
    billingCycle?: 'monthly' | 'yearly';
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
    isStacked?: boolean; // Whether this subscription was stacked on previous one
  }>;
  totalSubscriptionSpend?: number;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  shippingAddresses?: ShippingAddress[];
}

export interface BillingAddress {
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

// NOTE: Shipping addresses are no longer used in the UI as the website only offers PDF files.
// This interface is kept for backward compatibility with existing user data.
export interface ShippingAddress {
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

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string, 
    password: string, 
    name: string, 
    shippingAddress?: Partial<ShippingAddress>
  ) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  sessionRestored: boolean;
  recordUserPurchase: (purchaseData: any) => Promise<any>;
  getUserPurchaseHistory: () => Promise<any[]>;
  updateMembership: (membershipData: any) => Promise<void>;
  testLogin: () => Promise<void>;
  saveBillingInfo: (billingData: any, isDefault: boolean) => Promise<any>;
  getBillingInfo: () => Promise<BillingAddress[]>;
  saveShippingInfo: (shippingData: any, isDefault: boolean) => Promise<any>;
  getShippingInfo: () => Promise<ShippingAddress[]>;
  isSubscriptionActive: () => boolean;
  getSubscriptionRemainingDays: () => number;
  saveLastVisitedPath: (path: string) => void;
  getLastVisitedPath: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Check for existing session on initial load
  useEffect(() => {
    // Check if we have a valid session in localStorage
    checkSessionValidity();
  }, []);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          let userProfile = await getUserProfile(firebaseUser.uid);
          
          if (!userProfile) {
            // Create new user profile with required fields
            const newUserProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
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
                status: 'inactive',
                expiryDate: null,
              },
            };
            
            // Save the new user profile
            userProfile = await saveUserProfile(firebaseUser.uid, newUserProfile);
          } else {
            // Update last login timestamp while preserving existing data
            await saveUserProfile(firebaseUser.uid, {
              ...userProfile,
              lastLogin: new Date().toISOString()
            });
          }
          
          setUser(userProfile as UserProfile);
          setIsLoggedIn(true);
          
          // If this was a session restore (not an initial login)
          if (localStorage.getItem('userLoggedIn') === 'true' && !sessionRestored) {
            setSessionRestored(true);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
        setSessionRestored(false);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [sessionRestored]);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      // Auth state change listener will handle the rest
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };
  
  // Test login function that bypasses Firebase authentication
  const testLogin = async () => {
    setLoading(true);
    try {
      // Create a mock test user
      const testUser: UserProfile = {
        id: 'test-user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        subscription: {
          status: 'active',
          plan: 'Professional Plan',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        },
        membershipInfo: {
          joinDate: new Date().toISOString(),
          status: 'active',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        purchases: [] // Empty purchases array
      };
      
      // Set the test user directly
      setUser(testUser);
      setIsLoggedIn(true);
      
      // Store session data in localStorage for test user
      localStorage.setItem('userLoggedIn', 'true');
      localStorage.setItem('lastAuthCheck', new Date().toISOString());
      localStorage.setItem('userEmail', 'test@example.com');
    } catch (error) {
      console.error('Error with test login:', error);
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (
    email: string, 
    password: string, 
    name: string, 
    shippingAddress?: Partial<ShippingAddress>
  ) => {
    setLoading(true);
    try {
      // Register with Firebase
      const userCredential = await registerWithEmail(email, password);
      const userId = userCredential.user.uid;
      
      // Create user profile object
      const now = new Date().toISOString();
      const userProfile: UserProfile = {
        id: userId,
        email,
        name,
        createdAt: now,
        lastLogin: now
      };
      
      // Add shipping address if provided
      if (shippingAddress && Object.keys(shippingAddress).length > 0) {
        const shippingData = {
          ...shippingAddress,
          isDefault: true,
          createdAt: new Date()
        };
        
        userProfile.shippingAddresses = [shippingData as ShippingAddress];
      }
      
      // Save profile to Firestore
      await saveUserProfile(userId, userProfile);
      
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Enhanced logout function
  const logout = async () => {
    try {
      await logoutUser();
      // Auth state change listener will handle the rest
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };
  
  // New function to record a purchase
  const recordUserPurchase = async (purchaseData: any) => {
    if (!user) return;
    
    if (!purchaseData.purchaseDate) purchaseData.purchaseDate = new Date().toISOString();
    
    // Record the purchase in the database
    const purchase = await recordPurchase(user.id, purchaseData);
    
    // Check if this is a subscription purchase
    if (purchaseData.subscription && typeof purchaseData.subscription === 'object') {
      // Generate expiration date based on billing cycle
      const now = new Date();
      let expirationDate;
      let isStacked = false;
      
      // Get billing cycle with fallback to monthly
      const billingCycle = purchaseData.subscription.billingCycle || 'monthly';
      
      // Check if there's an existing active subscription to stack onto
      if (user.subscription && 
          user.subscription.status === 'active' &&
          new Date(user.subscription.endDate) > now) {
        
        // This is a stacked subscription
        isStacked = true;
        
        // Calculate new end date by adding to the existing subscription end date
        expirationDate = calculateStackedEndDate(
          user.subscription.endDate,
          billingCycle as 'monthly' | 'yearly'
        );
        
        console.log(`Stacking subscription: Current end date: ${user.subscription.endDate}, New end date: ${expirationDate.toISOString()}`);
        
        // Calculate total subscription duration for a nice user message
        const totalDuration = formatSubscriptionDuration(now, expirationDate);
        
        // Show stacking message
        toast.success(
          `Your new subscription has been stacked! Your membership is now valid for ${totalDuration}.`,
          { duration: 5000 }
        );
      } else {
        // No active subscription or expired subscription, calculate new date
        expirationDate = new Date(now);
        
        if (billingCycle === 'yearly') {
          // Add 1 year to current date
          expirationDate.setFullYear(now.getFullYear() + 1);
        } else {
          // Default to monthly - add 1 month to current date
          expirationDate.setMonth(now.getMonth() + 1);
        }
        
        // Show standard message
        toast.success(`Your ${billingCycle} subscription has been activated!`);
      }
      
      // Generate a unique token if not provided
      const token = purchaseData.subscription.token || 
        `sub_${purchaseData.subscription.plan}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Extract price information
      let subscriptionPrice = 0;
      
      // Try to get price from subscription object
      if (purchaseData.subscription.price !== undefined) {
        if (typeof purchaseData.subscription.price === 'string') {
          const cleanPrice = purchaseData.subscription.price.replace(/[^0-9.-]+/g, '');
          subscriptionPrice = parseFloat(cleanPrice);
          if (isNaN(subscriptionPrice)) subscriptionPrice = 0;
        } else if (typeof purchaseData.subscription.price === 'number') {
          subscriptionPrice = purchaseData.subscription.price;
        }
      }
      // If no price in subscription, try to get from total
      else if (purchaseData.total) {
        if (typeof purchaseData.total === 'string') {
          const cleanTotal = purchaseData.total.replace(/[^0-9.-]+/g, '');
          subscriptionPrice = parseFloat(cleanTotal);
          if (isNaN(subscriptionPrice)) subscriptionPrice = 0;
        } else if (typeof purchaseData.total === 'number') {
          subscriptionPrice = purchaseData.total;
        }
      }
      
      // Save the end date string for consistency
      const endDateString = expirationDate.toISOString();
      
      // Update user membership with complete data
      await updateMembership({
        status: 'active',
        plan: purchaseData.subscription.plan,
        // Use the calculated end date with proper stacking
        endDate: endDateString,
        subscriptionToken: token,
        billingCycle: billingCycle,
        price: subscriptionPrice,
        transactionId: purchaseData.transactionId || purchase.id,
        isStacked: isStacked // Use the flag we set earlier
      });
      
      console.log(`Subscription ${token} activated, expires: ${expirationDate.toLocaleDateString()}`);
    } else {
      // Standard purchase without subscription
      toast.success("Your purchase was successful!");
    }
    
    return purchase;
  };
  
  // Get user purchase history
  const getUserPurchaseHistory = async () => {
    if (!user) return [];
    
    const purchases = await getUserPurchases(user.id);
    return purchases;
  };

  // Update user membership
  const updateMembership = async (membershipData: any) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const updatedProfile = await updateUserMembership(user.id, membershipData);
      setUser(updatedProfile as UserProfile);
    } catch (error) {
      console.error('Failed to update membership:', error);
      throw error;
    }
  };

  // Add the new saveBillingInfo method
  const saveBillingInfo = async (billingData: any, isDefault: boolean = false) => {
    if (!user) {
      throw new Error('User must be logged in to save billing information');
    }

    try {
      const billingAddresses = await saveBillingInformation(user.id, billingData, isDefault);
      
      // Update the local user object with the new billing addresses
      setUser(prevUser => {
        if (prevUser) {
          return {
            ...prevUser,
            billingAddresses: billingAddresses || [] // Ensure it's never null
          };
        }
        return prevUser;
      });
      
      return billingAddresses;
    } catch (error) {
      console.error('Error saving billing information:', error);
      throw error;
    }
  };

  // Add the new getBillingInfo method
  const getBillingInfo = async () => {
    if (!user) {
      throw new Error('User must be logged in to get billing information');
    }

    try {
      return await getUserBillingInformation(user.id);
    } catch (error) {
      console.error('Error getting billing information:', error);
      return [];
    }
  };

  // Add methods for managing shipping addresses
  const saveShippingInfo = async (shippingData: any, isDefault: boolean = false) => {
    if (!user) {
      throw new Error('User must be logged in to save shipping information');
    }

    try {
      const shippingAddresses = await saveShippingInformation(user.id, shippingData, isDefault);
      
      // Update the local user object with the new shipping addresses
      setUser(prevUser => {
        if (prevUser) {
          return {
            ...prevUser,
            shippingAddresses: shippingAddresses || [] // Ensure it's never null
          };
        }
        return prevUser;
      });
      
      return shippingAddresses;
    } catch (error) {
      console.error('Error saving shipping information:', error);
      throw error;
    }
  };

  const getShippingInfo = async () => {
    if (!user) {
      throw new Error('User must be logged in to get shipping information');
    }

    try {
      return await getUserShippingInformation(user.id);
    } catch (error) {
      console.error('Error getting shipping information:', error);
      return [];
    }
  };

  // Add utility functions for checking subscription status
  const isSubscriptionActive = (user: UserProfile | null): boolean => {
    if (!user || !user.subscription) return false;
    
    // Check if subscription is marked as active
    if (user.subscription.status !== 'active') return false;
    
    // Check if the subscription has expired
    const endDate = new Date(user.subscription.endDate);
    const now = new Date();
    
    return endDate > now;
  };

  const getSubscriptionRemainingDays = (user: UserProfile | null): number => {
    if (!user || !user.subscription || !user.subscription.endDate) return 0;
    
    const endDate = new Date(user.subscription.endDate);
    const now = new Date();
    
    // If already expired, return 0
    if (endDate <= now) return 0;
    
    // Calculate days remaining
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isLoggedIn, 
        user, 
        login, 
        register,
        logout, 
        loading,
        sessionRestored,
        recordUserPurchase,
        getUserPurchaseHistory,
        updateMembership,
        testLogin,
        saveBillingInfo,
        getBillingInfo,
        saveShippingInfo,
        getShippingInfo,
        isSubscriptionActive: () => isSubscriptionActive(user),
        getSubscriptionRemainingDays: () => getSubscriptionRemainingDays(user),
        saveLastVisitedPath: (path: string) => {
          if (path.includes('/checkout')) {
            sessionStorage.setItem('lastVisitedPath', path);
            console.log('Saved last visited checkout path for redirect after login:', path);
          }
        },
        getLastVisitedPath: () => {
          const path = sessionStorage.getItem('lastVisitedPath');
          if (path) {
            sessionStorage.removeItem('lastVisitedPath');
          }
          return path;
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 