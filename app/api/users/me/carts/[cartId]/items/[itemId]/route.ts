import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function PUT(
  request: NextRequest,
  { params }: { params: { cartId: string; itemId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cartId, itemId } = params;

    console.log(`🌐 PUT /users/me/carts/${cartId}/items/${itemId} - Updating cart item quantity...`);

    const response = await fetch(`${API_BASE_URL}/users/me/carts/${cartId}/items/${itemId}`, {
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
        { error: 'Failed to update cart item', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Cart item updated successfully');
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { cartId: string; itemId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { cartId, itemId } = params;
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    console.log(`🌐 DELETE /users/me/carts/${cartId}/items/${itemId} - Connecting to real backend API...`);

    const response = await fetch(`${API_BASE_URL}/users/me/carts/${cartId}/items/${itemId}`, {
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
        { error: 'Failed to delete cart item', details: errorData },
        { status: response.status }
      );
    }

    console.log(`✅ DELETE /users/me/carts/${cartId}/items/${itemId} - External API response received`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting cart item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
