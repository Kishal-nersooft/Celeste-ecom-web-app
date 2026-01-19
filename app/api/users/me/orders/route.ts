import { NextRequest, NextResponse } from 'next/server';

import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable caching for real-time updates

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const includeProducts = searchParams.get('include_products') || 'true';
    const includeStores = searchParams.get('include_stores') || 'true';
    const includeAddresses = searchParams.get('include_addresses') || 'true';
    
    // Build query parameters for the backend API
    const backendParams = new URLSearchParams({
      page,
      limit,
      include_products: includeProducts,
      include_stores: includeStores,
      include_addresses: includeAddresses
    });
    
    // Use the general orders endpoint with all parameters
    const response = await fetch(`${API_BASE_URL}/orders/?${backendParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      cache: 'no-store' // Disable caching for real-time updates
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { 
            statusCode: 200,
            message: 'Success',
            data: { 
              orders: [], 
              pagination: { page: 1, limit: parseInt(limit), offset: 0, total_results: 0 } 
            } 
          },
          { 
            status: 200,
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: errorText },
        { status: response.status }
      );
    }

    const backendData = await response.json();
    
    // Handle the new backend response structure: { statusCode, message, data: { orders, pagination } }
    let responseData = backendData;
    
    // If the response has the new structure with statusCode and data wrapper, extract it
    if (backendData.statusCode && backendData.data) {
      responseData = {
        statusCode: backendData.statusCode,
        message: backendData.message || 'Success',
        data: {
          orders: backendData.data.orders || [],
          pagination: backendData.data.pagination || {
            page: parseInt(page),
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            total_results: backendData.data.orders?.length || 0
          }
        }
      };
    } else if (backendData.orders) {
      // Handle old structure with direct orders array
      responseData = {
        statusCode: 200,
        message: 'Success',
        data: {
          orders: backendData.orders,
          pagination: backendData.pagination || {
            page: parseInt(page),
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            total_results: backendData.orders.length
          }
        }
      };
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        statusCode: 500,
        message: 'Internal server error',
        data: { orders: [], pagination: { page: 1, limit: 20, offset: 0, total_results: 0 } },
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
