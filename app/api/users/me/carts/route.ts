import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function GET(request: NextRequest) {
  try {
    // Check authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Connect to real backend API
    console.log('🌐 Connecting to real backend API for cart data...');

    const response = await fetch(`${API_BASE_URL}/users/me/carts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      // Handle different error status codes
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid or missing authentication' },
          { status: 401 }
        );
      } else if (response.status === 500) {
        return NextResponse.json(
          { error: 'Internal server error - Backend service unavailable' },
          { status: 500 }
        );
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch carts' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    
    // Ensure the response follows the expected format
    // The backend should return: { owned_carts: [], shared_carts: [] }
    const formattedResponse = {
      owned_carts: data.owned_carts || data.data?.owned_carts || [],
      shared_carts: data.shared_carts || data.data?.shared_carts || []
    };
    
    return NextResponse.json(formattedResponse, { status: 200 });
  } catch (error) {
    console.error('Error fetching carts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body according to API specification
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        {
          detail: [
            {
              loc: ['body', 'name'],
              msg: 'name is required and must be a string',
              type: 'missing'
            }
          ]
        },
        { status: 422 }
      );
    }

    // Validate description if provided
    if (body.description && typeof body.description !== 'string') {
      return NextResponse.json(
        {
          detail: [
            {
              loc: ['body', 'description'],
              msg: 'description must be a string',
              type: 'type_error'
            }
          ]
        },
        { status: 422 }
      );
    }

    // Check authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Connect to real backend API
    console.log('🌐 Connecting to real backend API for cart creation...');
    
    const response = await fetch(`${API_BASE_URL}/users/me/carts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      // Handle different error status codes
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid or missing authentication' },
          { status: 401 }
        );
      } else if (response.status === 422) {
        // Forward validation errors from backend
        const errorData = await response.json();
        return NextResponse.json(errorData, { status: 422 });
      } else if (response.status === 500) {
        return NextResponse.json(
          { error: 'Internal server error - Backend service unavailable' },
          { status: 500 }
        );
      } else {
        return NextResponse.json(
          { error: 'Failed to create cart' },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    
    // Return the cart data in the expected format
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating cart:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          detail: [
            {
              loc: ['body'],
              msg: 'Invalid JSON format',
              type: 'json_invalid'
            }
          ]
        },
        { status: 422 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
