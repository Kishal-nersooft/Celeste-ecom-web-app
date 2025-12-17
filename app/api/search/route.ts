import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract search parameters
    const query = searchParams.get('q');
    const mode = searchParams.get('mode') || 'full';
    const limit = searchParams.get('limit');
    const includePricing = searchParams.get('include_pricing') || 'true';
    const includeCategories = searchParams.get('include_categories') || 'false';
    const includeTags = searchParams.get('include_tags') || 'false';
    const includeInventory = searchParams.get('include_inventory') || 'true';
    const categoryIds = searchParams.get('category_ids');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const storeIds = searchParams.get('store_id');
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    
    // Validate required parameters
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      );
    }
    
    // Build query parameters for backend
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('mode', mode);
    
    if (limit) params.append('limit', limit);
    if (includePricing) params.append('include_pricing', includePricing);
    if (includeCategories) params.append('include_categories', includeCategories);
    if (includeTags) params.append('include_tags', includeTags);
    if (includeInventory) params.append('include_inventory', includeInventory);
    if (categoryIds) params.append('category_ids', categoryIds);
    if (minPrice) params.append('min_price', minPrice);
    if (maxPrice) params.append('max_price', maxPrice);
    if (storeIds) params.append('store_id', storeIds);
    if (latitude) params.append('latitude', latitude);
    if (longitude) params.append('longitude', longitude);
    
    // Get authentication headers from the request
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if present
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/products/search?${params.toString()}`, {
        method: 'GET',
        headers,
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Search API responded with status: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (apiError) {
      console.error('Search API error:', apiError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch search results from backend API',
          details: apiError instanceof Error ? apiError.message : 'Unknown error occurred'
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      { error: 'Failed to process search request' },
      { status: 500 }
    );
  }
}
