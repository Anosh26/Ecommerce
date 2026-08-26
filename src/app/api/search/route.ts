import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    if (process.env.IS_MONOLITH === 'true' || !process.env.NEXT_GATEWAY_URL) {
      const { searchProducts } = await import('@/lib/search');
      const products = await searchProducts({
        query: searchParams.get('query') || undefined,
        category: searchParams.get('category') || undefined,
        minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
        maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
        sortBy: (searchParams.get('sortBy') as any) || undefined,
      });
      return NextResponse.json(products);
    }

    const GATEWAY_URL = process.env.NEXT_GATEWAY_URL || 'http://localhost:5000';
    const gatewayRes = await fetch(`${GATEWAY_URL}/api/search/products?${searchParams.toString()}`);
    const products = await gatewayRes.json();
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
