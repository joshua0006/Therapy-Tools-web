import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { auth, loginWithEmail, registerWithEmail, logoutUser, updateUserMembership } from '../lib/firebase/auth';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { saveUserProfile, getUserProfile, recordPurchase, getUserPurchases, saveBillingInformation, getUserBillingInformation, saveShippingInformation, getUserShippingInformation } from '../lib/firebase/firestore';

// Define user types
export interface UserProfile {
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
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  billingAddresses?: BillingAddress[];
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
  recordUserPurchase: (purchaseData: any) => Promise<any>;
  getUserPurchaseHistory: () => Promise<any[]>;
  updateMembership: (membershipData: any) => Promise<void>;
  testLogin: () => Promise<void>;
  saveBillingInfo: (billingData: any, isDefault: boolean) => Promise<any>;
  getBillingInfo: () => Promise<BillingAddress[]>;
  saveShippingInfo: (shippingData: any, isDefault: boolean) => Promise<any>;
  getShippingInfo: () => Promise<ShippingAddress[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

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
      console.log('Test user logged in:', testUser);
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
    if (!user) throw new Error('User not authenticated');
    
    const purchase = await recordPurchase(user.id, purchaseData);
    
    // Update local user state with new purchase
    setUser(prevUser => {
      if (!prevUser) return null;
      
      const purchases = prevUser.purchases || [];
      return {
        ...prevUser,
        purchases: [...purchases, purchase]
      };
    });
    
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

  return (
    <AuthContext.Provider 
      value={{ 
        isLoggedIn, 
        user, 
        login, 
        register,
        logout, 
        loading,
        recordUserPurchase,
        getUserPurchaseHistory,
        updateMembership,
        testLogin,
        saveBillingInfo,
        getBillingInfo,
        saveShippingInfo,
        getShippingInfo
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