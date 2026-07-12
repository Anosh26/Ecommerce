import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, customerName, email, address, city, postalCode } = body;

    // Basic request validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item.' }, { status: 400 });
    }
    if (!customerName || !email || !address || !city || !postalCode) {
      return NextResponse.json({ error: 'All shipping information fields are required.' }, { status: 400 });
    }

    // Call our monolithic database order creator
    // This will perform stock validation, update stock levels, and write the order
    const completedOrder = await createOrder({
      items,
      customerName,
      email,
      address,
      city,
      postalCode,
    });

    // Simulating instant payment gateway success and returning order details
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully! Your order has been placed.',
      order: completedOrder
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred during checkout.' }, { status: 400 });
  }
}
