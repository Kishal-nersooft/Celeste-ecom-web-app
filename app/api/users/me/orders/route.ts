import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    
    console.log('🔍 ORDERS API - Request details:', {
      url: `${API_BASE_URL}/users/me/orders?page=${page}&limit=${limit}`,
      page,
      limit,
      hasAuth: !!request.headers.get('authorization')
    });
    
    // Use the general orders endpoint as per API documentation
    const response = await fetch(`${API_BASE_URL}/orders/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      }
    });

    console.log('🔍 ORDERS API - Backend response status:', response.status);
    console.log('🔍 ORDERS API - Backend response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔍 ORDERS API - Backend error response:', errorText);
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.log('🔍 ORDERS API - Authentication error, returning empty array...');
        return NextResponse.json([]);
      }
      
      // If endpoint fails, return mock data for testing
      if (response.status === 404) {
        console.log('🔍 ORDERS API - Endpoint not found, returning mock data for testing...');
        const mockOrders = [
          {
            id: 76,
            user_id: "b5ehju3zyefQ5vhegtpWe02t1503",
            store_id: 1,
            total_amount: 1810.21,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            items: [
              {
                id: 1,
                order_id: 76,
                source_cart_id: 136,
                product_id: 6367,
                store_id: 1,
                quantity: 1,
                unit_price: 1720,
                total_price: 1720,
                created_at: new Date().toISOString()
              }
            ]
          }
        ];
        return NextResponse.json(mockOrders);
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('🔍 ORDERS API - Backend response:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
