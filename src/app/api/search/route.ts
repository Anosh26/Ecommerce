import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    // Call the Search microservice via the API Gateway on port 5000
    const gatewayRes = await fetch(`http://localhost:5000/api/search/products?${searchParams.toString()}`);
    const products = await gatewayRes.json();
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
