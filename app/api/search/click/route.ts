import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, product_id } = body;
    
    // Validate required fields
    if (!query || !product_id) {
      return NextResponse.json(
        { error: 'query and product_id are required' },
        { status: 400 }
      );
    }
    
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
      const response = await fetch(`${API_BASE_URL}/products/search/click`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          product_id: parseInt(product_id)
        }),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Search click API responded with status: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (apiError) {
      console.error('Search click API error:', apiError);
      return NextResponse.json(
        { 
          error: 'Failed to track search click',
          details: apiError instanceof Error ? apiError.message : 'Unknown error occurred'
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Error in search click API:', error);
    return NextResponse.json(
      { error: 'Failed to process search click request' },
      { status: 500 }
    );
  }
}
