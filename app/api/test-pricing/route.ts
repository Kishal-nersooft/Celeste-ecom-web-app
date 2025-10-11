import { NextResponse } from 'next/server';
import { getProductsWithPricing } from '../../../lib/api';

export async function GET() {
  try {
    console.log('🧪 Test API: Starting to fetch discounted products...');
    
    // Test the getProductsWithPricing function directly
    console.log('🧪 Test API: Calling getProductsWithPricing...');
    const products = await getProductsWithPricing(null, 1, 100, true, true, 1); // onlyDiscounted=true, tierId=1
    console.log('🧪 Test API: getProductsWithPricing response:', products);
    console.log('🧪 Test API: Products count:', Array.isArray(products) ? products.length : 0);
    
    if (Array.isArray(products) && products.length > 0) {
      console.log('🧪 Test API: First product:', {
        id: products[0].id,
        name: products[0].name,
        pricing: products[0].pricing
      });
    } else {
      console.log('🧪 Test API: No products returned, checking if it\'s an empty array or null/undefined');
      console.log('🧪 Test API: Products type:', typeof products);
      console.log('🧪 Test API: Products is array:', Array.isArray(products));
      console.log('🧪 Test API: Products length:', products?.length);
    }
    
    return NextResponse.json({
      success: true,
      count: Array.isArray(products) ? products.length : 0,
      products: products
    });
  } catch (error) {
    console.error('🧪 Test API: Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
