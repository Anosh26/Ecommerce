import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{
    action: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { action } = await params;
  
  try {
    const body = await request.json();

    if (process.env.IS_MONOLITH === 'true' || !process.env.NEXT_GATEWAY_URL) {
      return NextResponse.json({ success: true, action, items: body.items || [] });
    }

    const GATEWAY_URL = process.env.NEXT_GATEWAY_URL || 'http://localhost:5000';
    const gatewayRes = await fetch(`${GATEWAY_URL}/api/cart/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await gatewayRes.json();
    return NextResponse.json(data, { status: gatewayRes.status });
  } catch (error: any) {
    console.error(`Cart POST proxy error for action ${action}:`, error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
