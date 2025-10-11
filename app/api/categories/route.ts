import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = new URLSearchParams();
    
    // Add all query parameters from the request
    for (const [key, value] of searchParams.entries()) {
      params.append(key, value);
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/categories/?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (apiError) {
      console.error('External API error, using fallback data:', apiError);
      
      // Return mock data as fallback
      const mockData = {
        statusCode: 200,
        message: "Success",
        data: [
          {
            id: 71,
            name: "🧂🍝Pantry Staples🥫🍚",
            sort_order: 71,
            description: "🧂🍝Pantry Staples🥫🍚",
            image_url: null,
            parent_category_id: null,
            subcategories: [
              { id: 408, name: "Sugar", sort_order: 408, description: "Sugar", image_url: null, parent_category_id: 71, subcategories: null }
            ]
          },
          {
            id: 72,
            name: "🍪🍟 Snacks & Confectioneries 🍫🥜",
            sort_order: 72,
            description: "🍪🍟 Snacks & Confectioneries 🍫🥜",
            image_url: null,
            parent_category_id: null,
            subcategories: [
              { id: 409, name: "Chocolates", sort_order: 409, description: "Chocolates", image_url: null, parent_category_id: 72, subcategories: null }
            ]
          },
          {
            id: 73,
            name: "🥤Beverages 🧃",
            sort_order: 73,
            description: "🥤Beverages 🧃",
            image_url: null,
            parent_category_id: null,
            subcategories: [
              { id: 410, name: "Fruit Juice", sort_order: 410, description: "Fruit Juice", image_url: null, parent_category_id: 73, subcategories: null }
            ]
          }
        ]
      };
      
      return NextResponse.json(mockData);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
