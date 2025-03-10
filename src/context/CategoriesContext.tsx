import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../lib/firebase';

// Define the Category interface
export interface Category {
  id: string | number;
  name: string;
  slug?: string;
  count?: number;
}

// Define the context value interface
interface CategoriesContextValue {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

// Create the context with a default value
const CategoriesContext = createContext<CategoriesContextValue>({
  categories: [],
  loading: true,
  error: null
});

// Hook to use the categories context
export const useCategories = () => useContext(CategoriesContext);

// Provider component
interface CategoriesProviderProps {
  children: ReactNode;
}

export const CategoriesProvider: React.FC<CategoriesProviderProps> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const db = getFirestore(app);
      if (!db) {
        setError('Firebase Firestore instance not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get products collection to extract categories
        const productsRef = collection(db, 'products');
        
        try {
          const productsSnapshot = await getDocs(productsRef);
          
          if (productsSnapshot.empty) {
            setCategories([]);
            setLoading(false);
            return;
          }
          
          const categorySet = new Set<string>();
          const categoryMap: Record<string, string> = {}; // Map category IDs to names
          const categoryCounts: Record<string, number> = {}; // Count products per category
          
          productsSnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Check for categories array
            if (data.categories && Array.isArray(data.categories)) {
              data.categories.forEach((cat: any) => {
                if (typeof cat === 'object' && cat !== null && 'name' in cat) {
                  categorySet.add(cat.name);
                  categoryMap[cat.name] = cat.name;
                  categoryCounts[cat.name] = (categoryCounts[cat.name] || 0) + 1;
                } else if (typeof cat === 'string') {
                  categorySet.add(cat);
                  categoryMap[cat] = cat;
                  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                }
              });
            }
            
            // Fallback to single category field
            if ((!data.categories || data.categories.length === 0) && data.category) {
              const category = data.category || 'Uncategorized';
              categorySet.add(category);
              categoryMap[category] = category;
              categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
          });
          
          // Convert category set to array of objects
          const categoryList: Category[] = Array.from(categorySet).map(categoryId => ({
            id: categoryId,
            name: categoryMap[categoryId] || categoryId,
            count: categoryCounts[categoryId] || 0
          }));
          
          // Sort categories by name
          categoryList.sort((a, b) => a.name.localeCompare(b.name));
          
          setCategories(categoryList);
          setLoading(false);
        } catch (firestoreError: unknown) {
          console.error('Firebase error:', firestoreError);
          setError(`Failed to load categories: ${firestoreError}`);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories from Firebase');
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  return (
    <CategoriesContext.Provider value={{ categories, loading, error }}>
      {children}
    </CategoriesContext.Provider>
  );
};

export default CategoriesContext; 