import { NextRequest, NextResponse } from 'next/server';

import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Forward all query parameters to the backend
    const params_ = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      params_.append(key, value);
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
    
    const url = `${API_BASE_URL}/products/${id}/similar${params_.toString() ? '?' + params_.toString() : ''}`;
    console.log('🔍 Similar Products API - Requesting URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Similar Products API Error:', errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Similar Products API - Response received');
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching similar products:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch similar products',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: error instanceof Error && error.message.includes('404') ? 404 : 500 }
    );
  }
}

