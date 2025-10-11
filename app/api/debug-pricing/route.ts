import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";
    
    // Test different parameter combinations to find what's missing
    const testCases = [
      {
        name: "Basic with pricing",
        url: `${API_BASE_URL}/products?include_pricing=true&limit=2`
      },
      {
        name: "With categories and pricing",
        url: `${API_BASE_URL}/products?include_pricing=true&include_categories=true&limit=2`
      },
      {
        name: "Only discounted with pricing",
        url: `${API_BASE_URL}/products?only_discounted=true&include_pricing=true&limit=2`
      },
      {
        name: "Only discounted with all params",
        url: `${API_BASE_URL}/products?only_discounted=true&include_pricing=true&include_categories=true&limit=2`
      },
      {
        name: "With tier_id parameter",
        url: `${API_BASE_URL}/products?only_discounted=true&include_pricing=true&include_categories=true&tier_id=1&limit=2`
      },
      {
        name: "With store_id parameter",
        url: `${API_BASE_URL}/products?only_discounted=true&include_pricing=true&include_categories=true&store_id=1&limit=2`
      },
      {
        name: "With inventory parameter",
        url: `${API_BASE_URL}/products?only_discounted=true&include_pricing=true&include_categories=true&include_inventory=true&limit=2`
      }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      try {
        console.log(`Testing: ${testCase.name}`);
        const response = await fetch(testCase.url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const products = data.data?.products || [];
          const firstProduct = products[0];
          
          results.push({
            testCase: testCase.name,
            url: testCase.url,
            status: response.status,
            success: true,
            productCount: products.length,
            firstProduct: firstProduct ? {
              id: firstProduct.id,
              name: firstProduct.name,
              base_price: firstProduct.base_price,
              pricing: firstProduct.pricing,
              hasPricing: !!firstProduct.pricing,
              pricingKeys: firstProduct.pricing ? Object.keys(firstProduct.pricing) : []
            } : null
          });
        } else {
          results.push({
            testCase: testCase.name,
            url: testCase.url,
            status: response.status,
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`
          });
        }
      } catch (error: any) {
        results.push({
          testCase: testCase.name,
          url: testCase.url,
          success: false,
          error: error.message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Pricing parameter testing completed",
      results,
      summary: {
        totalTests: results.length,
        successfulTests: results.filter(r => r.success).length,
        testsWithPricing: results.filter(r => r.success && r.firstProduct?.hasPricing).length,
        testsWithoutPricing: results.filter(r => r.success && !r.firstProduct?.hasPricing).length
      }
    });
    
  } catch (error: any) {
    console.error('Debug pricing error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
