// Backend API integration for authentication
import { getBaseUrl } from './api';

export interface RegisterUserRequest {
  idToken: string;
  name: string;
}

export interface RegisterUserResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Register a new user with the backend API
 */
export async function registerUser(data: RegisterUserRequest): Promise<RegisterUserResponse> {
  try {
    // Browser uses /api/backend proxy; server uses API_BASE_URL + secret.
    const response = await fetch(`${getBaseUrl()}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window === 'undefined' && process.env.BACKEND_CLIENT_SECRET
          ? { 'X-Client-Secret': process.env.BACKEND_CLIENT_SECRET }
          : {}),
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: 'Registration failed',
        error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const result = await response.json();
    return {
      success: true,
      message: 'User registered successfully',
      data: result
    };
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: 'Registration failed',
      error: errorMessage
    };
  }
}
