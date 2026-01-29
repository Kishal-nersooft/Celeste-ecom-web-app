import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📥 SAVED CARDS API - Received request');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/payments/saved-cards`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ SAVED CARDS API - Backend error: ${response.status} ${response.statusText} - ${errorText}`);
      
      // If 404, return empty array (user has no saved cards yet)
      if (response.status === 404) {
        return NextResponse.json([], { status: 200 });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch saved cards', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ SAVED CARDS API - Fetched ${Array.isArray(data) ? data.length : data?.data?.length || 0} saved cards`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ SAVED CARDS API - Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

