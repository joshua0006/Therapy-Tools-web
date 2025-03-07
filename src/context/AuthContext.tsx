import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { auth, loginWithEmail, registerWithEmail, logoutUser, updateUserMembership } from '../lib/firebase/auth';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { saveUserProfile, getUserProfile, recordPurchase, getUserPurchases } from '../lib/firebase/firestore';

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
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  recordUserPurchase: (purchaseData: any) => Promise<any>;
  getUserPurchaseHistory: () => Promise<any[]>;
  updateMembership: (membershipData: any) => Promise<void>;
  testLogin: () => Promise<void>;
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
  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      await registerWithEmail(email, password, name);
      // Auth state change listener will handle the rest
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
        testLogin
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