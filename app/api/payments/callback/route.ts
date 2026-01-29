import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ref = searchParams.get("ref");
    const resultIndicator = searchParams.get("resultIndicator");

    console.log('📥 PAYMENT CALLBACK - Received callback:', {
      ref,
      resultIndicator,
      timestamp: new Date().toISOString()
    });

    if (!ref) {
      console.error('❌ PAYMENT CALLBACK - Missing payment reference');
      return NextResponse.json(
        { error: 'Missing payment reference' },
        { status: 422 }
      );
    }

    const authHeader = request.headers.get('authorization');

    // Step 1: Forward the callback to backend
    const callbackUrl = new URL(`${API_BASE_URL}/payments/callback`);
    callbackUrl.searchParams.set('ref', ref);
    if (resultIndicator) {
      callbackUrl.searchParams.set('resultIndicator', resultIndicator);
    }

    const callbackResponse = await fetch(callbackUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && {
          'Authorization': authHeader
        })
      },
    });

    if (!callbackResponse.ok) {
      console.log(`❌ PAYMENT CALLBACK - Backend error: ${callbackResponse.status} ${callbackResponse.statusText}`);
      const errorText = await callbackResponse.text();
      return NextResponse.json(
        { error: 'Payment callback processing failed', details: errorText },
        { status: callbackResponse.status }
      );
    }

    console.log('✅ PAYMENT CALLBACK - Backend processed successfully');

    // Step 2: Check payment status using /payments/status/{ref}
    const statusUrl = `${API_BASE_URL}/payments/status/${ref}`;
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && {
          'Authorization': authHeader
        })
      },
    });

    if (!statusResponse.ok) {
      console.log(`❌ PAYMENT STATUS CHECK - Error: ${statusResponse.status} ${statusResponse.statusText}`);
      // Still redirect even if status check fails - backend has processed the callback
      const ordersUrl = new URL('/orders', request.nextUrl.origin);
      ordersUrl.searchParams.set('paymentSuccess', 'true');
      ordersUrl.searchParams.set('paymentRef', ref);
      return NextResponse.redirect(ordersUrl, 302);
    }

    const statusData = await statusResponse.json();
    console.log('📊 PAYMENT STATUS:', statusData);

    // Extract status from response
    const status = statusData?.data?.status || statusData?.status;
    const isSuccess = status === 'success' || status === 'SUCCESS';

    // Step 3: Redirect to orders page
    const ordersUrl = new URL('/orders', request.nextUrl.origin);
    ordersUrl.searchParams.set('paymentSuccess', isSuccess ? 'true' : 'false');
    ordersUrl.searchParams.set('paymentRef', ref);
    if (resultIndicator) {
      ordersUrl.searchParams.set('resultIndicator', resultIndicator);
    }

    // Use HTTP 302 redirect for immediate navigation
    return NextResponse.redirect(ordersUrl, 302);

  } catch (error) {
    console.error('❌ PAYMENT CALLBACK - Error:', error);

    // Even on error, try to redirect to orders page
    const searchParams = request.nextUrl.searchParams;
    const ref = searchParams.get("ref");
    if (ref) {
      const ordersUrl = new URL('/orders', request.nextUrl.origin);
      ordersUrl.searchParams.set('paymentSuccess', 'false');
      ordersUrl.searchParams.set('paymentRef', ref);
      return NextResponse.redirect(ordersUrl, 302);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

