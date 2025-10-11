import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function PUT(
  request: NextRequest,
  { params }: { params: { address_id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const addressId = params.address_id;
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    console.log(`🌐 PUT /users/me/addresses/${addressId}/set_default - Connecting to real backend API...`);

    const response = await fetch(`${API_BASE_URL}/users/me/addresses/${addressId}/set_default`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`❌ External API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to set default address', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ PUT /users/me/addresses/${addressId}/set_default - External API response received`);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error setting default address:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
