import { NextRequest, NextResponse } from 'next/server';

import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    console.log('🌐 POST /users/me/checkout/preview - Connecting to real backend API...');
    console.log('📥 PREVIEW API - Received preview data:', {
      cart_ids: body.cart_ids,
      location: body.location,
      timestamp: new Date().toISOString()
    });
    console.log('📥 PREVIEW API - Full request body:', JSON.stringify(body, null, 2));

    const response = await fetch(`${API_BASE_URL}/users/me/checkout/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`❌ External API error: ${response.status} ${response.statusText}`);
      console.log('❌ Error details:', JSON.stringify(errorData, null, 2));
      console.log('❌ Request that failed:', JSON.stringify(body, null, 2));
      console.log('❌ Backend URL:', `${API_BASE_URL}/users/me/checkout/preview`);
      return NextResponse.json(
        { error: 'Failed to preview order', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ PREVIEW API - External API response received');
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error previewing order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}