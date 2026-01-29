import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { ref: string } }) {
  try {
    const { ref } = params;
    console.log(`📥 PAYMENT STATUS API - Received request for ref: ${ref}`);

    if (!ref) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');

    // Add cache-busting to prevent stale responses
    const timestamp = Date.now();
    const response = await fetch(`${API_BASE_URL}/payments/status/${ref}?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...(authHeader && { 'Authorization': authHeader })
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ PAYMENT STATUS API - Backend error: ${response.status} ${response.statusText} - ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to fetch payment status', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ PAYMENT STATUS API - Status for ${ref}:`, data);
    
    // Return response with no-cache headers to prevent browser caching
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('❌ PAYMENT STATUS API - Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

