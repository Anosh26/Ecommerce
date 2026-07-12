import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const GATEWAY_URL = process.env.NEXT_GATEWAY_URL || 'http://localhost:5000';
    const gatewayRes = await fetch(`${GATEWAY_URL}/api/buy/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await gatewayRes.json();

    if (!gatewayRes.ok) {
      return NextResponse.json({ error: data.error || 'Checkout failed.' }, { status: gatewayRes.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully! Your order has been placed.',
      order: data.order
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred during checkout.' }, { status: 500 });
  }
}
