import { NextRequest, NextResponse } from 'next/server';
import { mockUserStorage } from '@/lib/mock-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Mock User registration request:', body);
    
    // Validate required fields
    if (!body.firebase_uid || !body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: firebase_uid, name' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = mockUserStorage.getById(body.firebase_uid);
    if (existingUser) {
      return NextResponse.json(existingUser, { status: 200 });
    }
    
    // Create new user in mock storage
    const newUser = mockUserStorage.add({
      id: body.firebase_uid,
      name: body.name,
      email: body.email || "",
      phone: body.phone || "",
      is_delivery: false
    });

    console.log('Mock registration response:', newUser);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error in mock user registration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
