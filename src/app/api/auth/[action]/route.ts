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
    
    const gatewayRes = await fetch(`http://localhost:5000/api/auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await gatewayRes.json();
    return NextResponse.json(data, { status: gatewayRes.status });
  } catch (error: any) {
    console.error(`Auth proxy error for action ${action}:`, error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
