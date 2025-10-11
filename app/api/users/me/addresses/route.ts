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

    console.log('🌐 GET /users/me/addresses - Connecting to real backend API...');

    const response = await fetch(`${API_BASE_URL}/users/me/addresses`, {
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
        { error: 'Failed to get addresses', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ GET /users/me/addresses - External API response received');
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error getting addresses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    console.log('🌐 POST /users/me/addresses - Connecting to real backend API...');

    const response = await fetch(`${API_BASE_URL}/users/me/addresses`, {
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
      return NextResponse.json(
        { error: 'Failed to create address', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ POST /users/me/addresses - External API response received');
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}