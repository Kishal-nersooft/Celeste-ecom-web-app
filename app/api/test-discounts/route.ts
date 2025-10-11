import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";
    
    // Test 1: Get all products with pricing
    console.log('Testing all products with pricing...');
    const allProductsResponse = await fetch(
      `${API_BASE_URL}/products?include_pricing=true&include_categories=true&limit=5`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    const allProductsData = await allProductsResponse.json();
    console.log('All products response:', allProductsData);
    
    // Test 2: Get only discounted products
    console.log('Testing only discounted products...');
    const discountedResponse = await fetch(
      `${API_BASE_URL}/products?only_discounted=true&include_pricing=true&include_categories=true&limit=5`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    const discountedData = await discountedResponse.json();
    console.log('Discounted products response:', discountedData);
    
    // Analyze the data
    const allProducts = allProductsData.data?.products || [];
    const discountedProducts = discountedData.data?.products || [];
    
    const productsWithDiscounts = allProducts.filter((product: any) => 
      product.pricing && product.pricing.discount_applied > 0
    );
    
    return NextResponse.json({
      success: true,
      analysis: {
        totalProducts: allProducts.length,
        discountedFromAll: productsWithDiscounts.length,
        discountedFromAPI: discountedProducts.length,
        match: productsWithDiscounts.length === discountedProducts.length,
        allProductsSample: allProducts.slice(0, 2).map((p: any) => ({
          id: p.id,
          name: p.name,
          base_price: p.base_price,
          pricing: p.pricing
        })),
        discountedSample: discountedProducts.slice(0, 2).map((p: any) => ({
          id: p.id,
          name: p.name,
          base_price: p.base_price,
          pricing: p.pricing
        }))
      },
      rawResponses: {
        allProducts: allProductsData,
        discounted: discountedData
      }
    });
    
  } catch (error: any) {
    console.error('API test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
