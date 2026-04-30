import { NextRequest, NextResponse } from 'next/server';
import { updateGatewayConfig } from '@/lib/api/gateways';
import { toRouteError } from '@/lib/api/client';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ gatewayId: string }> }) {
  try {
    const { gatewayId } = await params;
    const body = await request.json();
    const data = await updateGatewayConfig(gatewayId, body);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/eausure/gateways/:gatewayId/config]', error);
    const routeError = toRouteError(error);
    return NextResponse.json(routeError.body, { status: routeError.status });
  }
}
