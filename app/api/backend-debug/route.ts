import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";
    
    // Test the exact API call that should work according to documentation
    const testUrl = `${API_BASE_URL}/products?only_discounted=true&include_pricing=true&include_categories=true&limit=3`;
    
    console.log('Testing backend API:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Try with common auth headers
        'Authorization': 'Bearer test-token',
        'X-API-Key': 'test-key'
      }
    });
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse JSON response',
        responseText: responseText.substring(0, 500),
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
    }
    
    const products = data.data?.products || [];
    const firstProduct = products[0];
    
    // Analyze the response
    const analysis = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      responseStructure: {
        hasData: !!data.data,
        hasProducts: !!data.data?.products,
        productCount: products.length,
        hasPagination: !!data.data?.pagination
      },
      firstProduct: firstProduct ? {
        id: firstProduct.id,
        name: firstProduct.name,
        base_price: firstProduct.base_price,
        hasPricing: !!firstProduct.pricing,
        pricing: firstProduct.pricing,
        allKeys: Object.keys(firstProduct)
      } : null,
      allProducts: products.map(p => ({
        id: p.id,
        name: p.name,
        base_price: p.base_price,
        hasPricing: !!p.pricing,
        pricing: p.pricing
      }))
    };
    
    return NextResponse.json({
      success: true,
      message: "Backend API analysis completed",
      testUrl,
      analysis,
      recommendations: [
        "Check if authentication is required (Bearer token, API key, etc.)",
        "Verify that price lists are active and have valid date ranges",
        "Ensure products are assigned to correct customer tiers",
        "Check if pricing calculation service is running",
        "Verify that discount rules are properly configured",
        "Check if there are any required headers or parameters missing"
      ],
      expectedVsActual: {
        expected: {
          pricing: {
            base_price: "number",
            final_price: "number", 
            discount_applied: "number",
            discount_percentage: "number",
            applied_price_lists: "array"
          }
        },
        actual: {
          pricing: firstProduct?.pricing || "null"
        }
      }
    });
    
  } catch (error: any) {
    console.error('Backend debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
