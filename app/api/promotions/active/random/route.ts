import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const promotionType = searchParams.get('promotion_type');
    const productId = searchParams.get('product_id');
    const categoryId = searchParams.get('category_id');
    
    // Build query string for external API
    // Note: We intentionally do NOT send 'limit' parameter - backend uses its default
    const params = new URLSearchParams();
    if (promotionType) {
      params.append('promotion_type', promotionType);
    }
    if (productId) {
      params.append('product_id', productId);
    }
    if (categoryId) {
      params.append('category_id', categoryId);
    }
    // Explicitly do NOT include limit - backend will use its default
    
    // Add cache-busting timestamp to ensure fresh random promotions
    // (Remove _t from params if it exists, we'll add our own)
    params.delete('_t');
    params.append('_t', Date.now().toString());
    
    // Call external API with cache-busting
    const apiUrl = `${API_BASE_URL}/promotions/active/random?${params.toString()}`;
    console.log('🔄 Fetching fresh random promotion from backend:', apiUrl.split('&_t=')[0]);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Promotions API Error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch promotions', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in promotions API route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

