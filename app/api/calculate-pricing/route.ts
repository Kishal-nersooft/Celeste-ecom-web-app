import { NextRequest, NextResponse } from 'next/server';

import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { productId, tierId, quantity = 1 } = await request.json();
    
    if (!productId || !tierId) {
      return NextResponse.json({ error: 'productId and tierId are required' }, { status: 400 });
    }

    // Call the pricing calculation API
    const response = await fetch(`${API_BASE_URL}/pricing/calculate/product/${productId}?tier_id=${tierId}&quantity=${quantity}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Pricing API error: ${response.status} - ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Calculate pricing API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
