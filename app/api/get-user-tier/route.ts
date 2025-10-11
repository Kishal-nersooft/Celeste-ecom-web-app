import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://celeste-api-846811285865.us-central1.run.app';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 });
    }

    // Get user's tier from the tier evaluation
    const tierResponse = await fetch(`${API_BASE_URL}/tiers/users/me/evaluate-tier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!tierResponse.ok) {
      const errorText = await tierResponse.text();
      return NextResponse.json({ error: `Tier evaluation failed: ${tierResponse.status} - ${errorText}` }, { status: tierResponse.status });
    }

    const tierData = await tierResponse.json();
    return NextResponse.json(tierData);

  } catch (error: any) {
    console.error('Get user tier API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
