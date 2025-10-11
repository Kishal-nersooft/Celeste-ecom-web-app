import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyDiscounted = searchParams.get('only_discounted') === 'true';
    const includePricing = searchParams.get('include_pricing') === 'true';
    
    // Build the API URL
    const params = new URLSearchParams();
    params.append('limit', '50'); // Limit to 50 for easier viewing
    params.append('include_categories', 'true');
    if (includePricing) {
      params.append('include_pricing', 'true');
    }
    if (onlyDiscounted) {
      params.append('only_discounted', 'true');
    }
    
    const url = `${API_BASE_URL}/products?${params.toString()}`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return NextResponse.json(
        { 
          success: false, 
          error: `API Error: ${response.status} ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Analyze the products
    const products = data.data?.products || data.data || [];
    const discountedProducts = products.filter((product: any) => 
      product.pricing && 
      product.pricing.discount_applied && 
      product.pricing.discount_applied > 0
    );
    
    const analysis = {
      totalProducts: products.length,
      discountedProducts: discountedProducts.length,
      discountRate: products.length > 0 ? (discountedProducts.length / products.length * 100).toFixed(2) : 0,
      productsWithPricing: products.filter((p: any) => p.pricing).length,
      productsWithoutPricing: products.filter((p: any) => !p.pricing).length,
    };
    
    return NextResponse.json({
      success: true,
      analysis,
      products: products.map((product: any) => ({
        id: product.id,
        name: product.name,
        base_price: product.base_price,
        pricing: product.pricing,
        hasDiscount: product.pricing && product.pricing.discount_applied > 0,
        discountAmount: product.pricing?.discount_applied || 0,
        discountPercentage: product.pricing?.discount_percentage || 0,
        finalPrice: product.pricing?.final_price || product.base_price,
        priceLists: product.pricing?.applied_price_lists || []
      }))
    });
    
  } catch (error: any) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
