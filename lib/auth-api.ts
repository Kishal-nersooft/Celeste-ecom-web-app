// Backend API integration for authentication
const API_BASE_URL = "https://celeste-api-846811285865.us-central1.run.app";

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
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
  } catch (error: any) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'Registration failed',
      error: error.message
    };
  }
}
