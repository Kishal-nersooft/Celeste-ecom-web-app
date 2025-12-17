import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';
    
    // Validate limit parameter
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 422 }
      );
    }
    
    // Get authentication headers from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    };
    
    try {
      // Add cache-busting to ensure fresh data from backend
      const cacheBuster = `_t=${Date.now()}`;
      const response = await fetch(`${API_BASE_URL}/users/me/search-history?limit=${limitNum}&${cacheBuster}`, {
        method: 'GET',
        cache: 'no-store', // Disable Next.js caching
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Unauthorized - Invalid or missing authentication' },
            { status: 401 }
          );
        }
        throw new Error(`Search history API responded with status: ${response.status}`);
      }

      const data = await response.json();
      // Filter out invalid entries before returning
      if (data && data.data && Array.isArray(data.data)) {
        const filtered = data.data.filter((item: any) => {
          if (!item || typeof item !== 'string') return false;
          const trimmed = item.trim();
          if (trimmed.length < 1) return false;
          const lowerItem = trimmed.toLowerCase();
          if (
            lowerItem.includes('get /') || 
            lowerItem.includes('post /') || 
            lowerItem.includes('users/me/search-history') ||
            lowerItem.includes('search-history') ||
            lowerItem.includes('current user') ||
            lowerItem.startsWith('get ') ||
            lowerItem.startsWith('post ') ||
            trimmed.includes('GET /') ||
            trimmed.includes('POST /') ||
            trimmed.includes('/users/me/')
          ) {
            return false;
          }
          return true;
        });
        data.data = filtered;
      }
      console.log('🔍 Search History API - Filtered response:', JSON.stringify(data).substring(0, 200));
      // Return with no-cache headers to prevent browser/Next.js caching
      return NextResponse.json(data, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (apiError) {
      console.error('Search history API error:', apiError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch search history from backend API',
          details: apiError instanceof Error ? apiError.message : 'Unknown error occurred'
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Error in search history API:', error);
    return NextResponse.json(
      { error: 'Failed to process search history request' },
      { status: 500 }
    );
  }
}

