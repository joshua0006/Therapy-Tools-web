import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchProducts, fetchCategories } from '../lib/woocommerce/products';
import { Product, Category } from '../types';
import { testOAuthImports } from '../lib/woocommerce/test-oauth';

interface WooCommerceContextType {
  products: Product[];
  categories: Category[];
  featuredProducts: Product[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  getProductsByCategory: (categoryId: string) => Product[];
}

const WooCommerceContext = createContext<WooCommerceContextType | undefined>(undefined);

interface WooCommerceProviderProps {
  children: ReactNode;
}

export const WooCommerceProvider: React.FC<WooCommerceProviderProps> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch all products
  const fetchAllProducts = async () => {
    setLoading(true);
    setError(null);
    try {
     
      
      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(),
        fetchCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading WooCommerce data:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAllProducts();
  }, []);

  // Get featured products (assuming first 3 are featured)
  const featuredProducts = products.slice(0, 3);

  // Get products by category
  const getProductsByCategory = (categoryId: string) => {
    return products.filter(product => product.category === categoryId);
  };

  const value = {
    products,
    categories,
    featuredProducts,
    loading,
    error,
    refreshProducts: fetchAllProducts,
    getProductsByCategory
  };

  return (
    <WooCommerceContext.Provider value={value}>
      {children}
    </WooCommerceContext.Provider>
  );
};

export const useWooCommerce = (): WooCommerceContextType => {
  const context = useContext(WooCommerceContext);
  if (context === undefined) {
    throw new Error('useWooCommerce must be used within a WooCommerceProvider');
  }
  return context;
}; 