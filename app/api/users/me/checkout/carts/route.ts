import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    console.log('🌐 GET /users/me/checkout/carts - Connecting to real backend API...');

    const response = await fetch(`${API_BASE_URL}/users/me/checkout/carts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`❌ External API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to get checkout carts', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ GET /users/me/checkout/carts - External API response received');
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error getting checkout carts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
