// WooCommerce API types
export interface WooProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  categories: {
    id: number;
    name: string;
    slug: string;
  }[];
  images: {
    id: number;
    src: string;
    alt: string;
  }[];
  attributes: {
    id: number;
    name: string;
    options: string[];
  }[];
  status: string;
  featured: boolean;
  on_sale: boolean;
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  parent: number;
}

// App's internal product types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  pdfUrl: string;
  thumbnail: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
} 