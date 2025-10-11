import { Product } from "../../../../store";
import CategoriesPageClient from "./CategoriesPageClient";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

// Function to fetch products by category from the backend API
async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/products/?categoryId=${categoryId}&include_pricing=true`, {
      cache: 'no-store', // Disable Next.js caching
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        return []; // No products found for this category
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonResponse = await response.json();
    return jsonResponse.data.products.products; // Access data from the 'data.products' key
  } catch (error) {
    console.error(`Error fetching products for category ${categoryId}:`, error);
    return [];
  }
}

// Function to fetch all categories from the backend API
async function getAllCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/categories/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonResponse = await response.json();
    return jsonResponse.data.categories; // Access data from the 'data' key
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

const CategoriesPage = async ({ params }: Props) => {
  const { slug } = await params;

  return (
    <CategoriesPageClient 
      categoryId={slug} 
      fallbackProducts={await getProductsByCategory(slug)}
    />
  );
};

export default CategoriesPage;
