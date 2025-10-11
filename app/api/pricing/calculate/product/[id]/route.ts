import { NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const productId = params.id;
  const { searchParams } = new URL(request.url);
  const tierId = searchParams.get('tier_id') || '1';
  const quantity = searchParams.get('quantity') || '1';

  try {
    const url = `${API_BASE_URL}/pricing/calculate/product/${productId}?tier_id=${tierId}&quantity=${quantity}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Proxy API Error for product ${productId}:`, errorText);
      return NextResponse.json({ error: `Failed to fetch pricing: ${response.status} ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy API encountered an error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
