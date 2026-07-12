import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const GATEWAY_URL = process.env.NEXT_GATEWAY_URL || 'http://localhost:5000';
    const gatewayRes = await fetch(`${GATEWAY_URL}/api/search/products?${searchParams.toString()}`);
    const products = await gatewayRes.json();
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
