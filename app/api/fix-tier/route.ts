import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://celeste-api-846811285865.us-central1.run.app';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 });
    }

    const results: any = {};

    // Step 1: Check current tier status
    console.log('🔍 Step 1: Checking current tier status...');
    try {
      const tierResponse = await fetch(`${API_BASE_URL}/tiers/users/me/tier`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (tierResponse.ok) {
        const tierData = await tierResponse.json();
        results.currentTier = {
          status: 'success',
          data: tierData
        };
      } else {
        const errorText = await tierResponse.text();
        results.currentTier = {
          status: 'error',
          error: `${tierResponse.status}: ${tierResponse.statusText}`,
          details: errorText
        };
      }
    } catch (error: any) {
      results.currentTier = {
        status: 'error',
        error: error.message
      };
    }

    // Step 2: Evaluate tier eligibility
    console.log('🔍 Step 2: Evaluating tier eligibility...');
    try {
      const evaluateResponse = await fetch(`${API_BASE_URL}/tiers/users/me/evaluate-tier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (evaluateResponse.ok) {
        const evaluateData = await evaluateResponse.json();
        results.tierEvaluation = {
          status: 'success',
          data: evaluateData
        };
      } else {
        const errorText = await evaluateResponse.text();
        results.tierEvaluation = {
          status: 'error',
          error: `${evaluateResponse.status}: ${evaluateResponse.statusText}`,
          details: errorText
        };
      }
    } catch (error: any) {
      results.tierEvaluation = {
        status: 'error',
        error: error.message
      };
    }

    // Step 3: Auto-update tier
    console.log('🔍 Step 3: Auto-updating tier...');
    try {
      const autoUpdateResponse = await fetch(`${API_BASE_URL}/tiers/users/me/auto-update-tier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (autoUpdateResponse.ok) {
        const autoUpdateData = await autoUpdateResponse.json();
        results.autoUpdate = {
          status: 'success',
          data: autoUpdateData,
          tierChanged: autoUpdateData.tier_changed || false
        };
      } else {
        const errorText = await autoUpdateResponse.text();
        results.autoUpdate = {
          status: 'error',
          error: `${autoUpdateResponse.status}: ${autoUpdateResponse.statusText}`,
          details: errorText
        };
      }
    } catch (error: any) {
      results.autoUpdate = {
        status: 'error',
        error: error.message
      };
    }

    // Step 4: Check/Update user profile
    console.log('🔍 Step 4: Checking/Updating user profile...');
    try {
      // First, try to get user profile
      const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        results.userProfile = {
          status: 'success',
          data: userData,
          message: 'User profile exists'
        };
      } else {
        // If user doesn't exist, try to create/update profile
        const errorText = await userResponse.text();
        results.userProfile = {
          status: 'error',
          error: `${userResponse.status}: ${userResponse.statusText}`,
          details: errorText,
          message: 'User profile may not exist in main system'
        };
      }
    } catch (error: any) {
      results.userProfile = {
        status: 'error',
        error: error.message
      };
    }

    // Step 5: Test pricing after tier assignment
    console.log('🔍 Step 5: Testing pricing after tier assignment...');
    try {
      const productsResponse = await fetch(`${API_BASE_URL}/products?limit=3&only_discounted=true&include_pricing=true&include_inventory=true&store_id=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const products = productsData.data?.products || [];
        const productsWithPricing = products.filter((p: any) => p.pricing !== null).length;
        
        results.pricingTest = {
          status: 'success',
          totalProducts: products.length,
          productsWithPricing: productsWithPricing,
          success: productsWithPricing > 0,
          sampleProduct: products[0] || null
        };
      } else {
        const errorText = await productsResponse.text();
        results.pricingTest = {
          status: 'error',
          error: `${productsResponse.status}: ${productsResponse.statusText}`,
          details: errorText
        };
      }
    } catch (error: any) {
      results.pricingTest = {
        status: 'error',
        error: error.message
      };
    }

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Fix tier API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
