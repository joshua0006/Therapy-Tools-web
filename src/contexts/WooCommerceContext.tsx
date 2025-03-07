import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { fetchProducts, fetchCategories } from '../lib/woocommerce/products';
import { Product, Category } from '../types';
import { clearCache, prefetchCriticalData } from '../lib/woocommerce/cache';

interface WooCommerceContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  featuredProducts: Product[];
  categories: Category[];
  refreshProducts: () => Promise<void>;
  clearProductCache: () => void;
}

const WooCommerceContext = createContext<WooCommerceContextType | undefined>(undefined);

interface WooCommerceProviderProps {
  children: ReactNode;
}

export const WooCommerceProvider: React.FC<WooCommerceProviderProps> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize and prefetch data on first load
  useEffect(() => {
    const initialize = async () => {
      try {
        // Attempt to prefetch critical data
        await prefetchCriticalData();
        setInitialized(true);
      } catch (err) {
        console.error("Failed to prefetch data:", err);
        // Continue anyway - we'll load data on demand
        setInitialized(true);
      }
    };
    
    initialize();
  }, []);

  // Load products data after initialization
  useEffect(() => {
    if (!initialized) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch products and categories in parallel
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(),
          fetchCategories()
        ]);
        
        setProducts(productsData);
        setCategories(categoriesData);
        
        // Select first 4 products as featured for now
        // In a real app, you would likely have a featured flag in the database
        // or a specific category for featured products
        const featured = productsData.slice(0, 4);
        setFeaturedProducts(featured);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching WooCommerce data:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [initialized]);

  const refreshProducts = async () => {
    setLoading(true);
    try {
      // Clear cache for products to ensure fresh data
      clearCache('products');
      
      const productsData = await fetchProducts();
      setProducts(productsData);
      
      // Update featured products
      const featured = productsData.slice(0, 4);
      setFeaturedProducts(featured);
      
      setError(null);
    } catch (err) {
      console.error('Error refreshing products:', err);
      setError('Failed to refresh products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const clearProductCache = () => {
    clearCache('products');
  };

  return (
    <WooCommerceContext.Provider
      value={{
        products,
        loading,
        error,
        featuredProducts,
        categories,
        refreshProducts,
        clearProductCache
      }}
    >
      {children}
    </WooCommerceContext.Provider>
  );
};

export const useWooCommerce = () => {
  const context = useContext(WooCommerceContext);
  if (context === undefined) {
    throw new Error('useWooCommerce must be used within a WooCommerceProvider');
  }
  return context;
}; 