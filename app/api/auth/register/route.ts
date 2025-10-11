import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, name } = body;

    if (!idToken || !name) {
      return NextResponse.json(
        { error: 'idToken and name are required' },
        { status: 400 }
      );
    }

    console.log('🌐 POST /auth/register - Connecting to real backend API...');

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken, name }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`❌ External API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to register user', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ POST /auth/register - External API response received');
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
