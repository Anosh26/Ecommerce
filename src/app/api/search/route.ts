import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || undefined;
  const category = searchParams.get('category') || undefined;
  
  const minPriceStr = searchParams.get('minPrice');
  const minPrice = minPriceStr && !isNaN(parseFloat(minPriceStr)) ? parseFloat(minPriceStr) : undefined;
  
  const maxPriceStr = searchParams.get('maxPrice');
  const maxPrice = maxPriceStr && !isNaN(parseFloat(maxPriceStr)) ? parseFloat(maxPriceStr) : undefined;
  
  const sortBy = (searchParams.get('sortBy') as any) || undefined;

  try {
    const products = await searchProducts({
      query,
      category,
      minPrice,
      maxPrice,
      sortBy,
    });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
