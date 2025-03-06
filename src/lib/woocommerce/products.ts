/**
 * WooCommerce Products Module
 * 
 * Handles all product-related operations:
 * - Fetching products and categories
 * - Transforming WooCommerce data to our app format
 * - Error handling and data validation
 */

import { makeWooRequest } from './config';
import type { WooProduct, Product, Category, WooCategory } from '../../types';

/**
 * Transform WooCommerce product to our app format
 */
function transformProduct(wooProduct: WooProduct): Product {
  return {
    id: wooProduct.id.toString(),
    name: wooProduct.name,
    description: wooProduct.description.replace(/<[^>]*>/g, ''), // Strip HTML
    price: parseFloat(wooProduct.price),
    category: wooProduct.categories[0]?.id.toString() || '',
    pdfUrl: wooProduct.id.toString(), // Just pass the ID, the PDFViewer will handle the URL construction
    thumbnail: wooProduct.images[0]?.src || '',
  };
}

/**
 * Transform WooCommerce category to our app format
 */
function transformCategory(wooCategory: WooCategory): Category {
  return {
    id: wooCategory.id.toString(),
    name: wooCategory.name,
    description: wooCategory.description,
  };
}

/**
 * Fetch products with optional filtering
 */
export async function fetchProducts(categoryId?: string) {
  try {
    const params: Record<string, any> = {
      status: 'publish'
    };

    if (categoryId) {
      params.category = categoryId;
    }

    const products = await makeWooRequest<WooProduct[]>('products', params);
    return products.map(transformProduct);
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products');
  }
}

/**
 * Fetch a single product by ID
 */
export async function fetchProduct(productId: string) {
  try {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    const product = await makeWooRequest<WooProduct>(`products/${productId}`);
    
    if (!product) {
      throw new Error('Product not found');
    }

    return transformProduct(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    if (error instanceof Error) {
      throw new Error(
        error.message === 'Product not found'
          ? 'Product not found'
          : 'Failed to fetch product. Please try again later.'
      );
    }
    throw new Error('An unexpected error occurred');
  }
}

/**
 * Fetch all product categories
 */
export async function fetchCategories() {
  try {
    const categories = await makeWooRequest<WooCategory[]>('products/categories');
    return categories.map(transformCategory);
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error('Failed to fetch categories');
  }
}