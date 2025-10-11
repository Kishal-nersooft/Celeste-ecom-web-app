import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function GET(
  request: NextRequest,
  { params }: { params: { cartId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const cartId = params.cartId;
    console.log(`🌐 GET /users/me/carts/${cartId} - Connecting to real backend API...`);

    const response = await fetch(`${API_BASE_URL}/users/me/carts/${cartId}`, {
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
        { error: 'Failed to get cart details', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ GET /users/me/carts/${cartId} - External API response received`);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error getting cart details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { cartId: string } }
) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    const cartId = params.cartId;
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    console.log(`🌐 PUT /users/me/carts/${cartId} - Connecting to real backend API...`);

    const response = await fetch(`${API_BASE_URL}/users/me/carts/${cartId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`❌ External API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to update cart', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ PUT /users/me/carts/${cartId} - External API response received`);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { cartId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const cartId = params.cartId;
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    console.log(`🌐 DELETE /users/me/carts/${cartId} - Connecting to real backend API...`);

    const response = await fetch(`${API_BASE_URL}/users/me/carts/${cartId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`❌ External API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to delete cart', details: errorData },
        { status: response.status }
      );
    }

    console.log(`✅ DELETE /users/me/carts/${cartId} - External API response received`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
