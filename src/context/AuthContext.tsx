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
        // User is logged in
        setIsLoggedIn(true);
        
        // Get user profile from Firestore
        const userProfile = await getUserProfile(firebaseUser.uid);
        
        if (userProfile) {
          setUser(userProfile as UserProfile);
        } else {
          // Create default user profile if none exists
          const defaultProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            subscription: {
              status: 'inactive',
              plan: 'none',
              endDate: new Date().toISOString(),
            },
            purchases: [],
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            membershipInfo: {
              joinDate: new Date().toISOString(),
              status: 'free',
              expiryDate: null
            }
          };
          await saveUserProfile(firebaseUser.uid, defaultProfile);
          setUser(defaultProfile);
        }
      } else {
        // User is logged out
        setIsLoggedIn(false);
        setUser(null);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Enhanced login function
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
        updateMembership
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