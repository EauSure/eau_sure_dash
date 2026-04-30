import { NextRequest, NextResponse } from 'next/server';
import { getGatewayStatus } from '@/lib/api/gateways';
import { toRouteError } from '@/lib/api/client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ gatewayId: string }> }) {
  try {
    const { gatewayId } = await params;
    const data = await getGatewayStatus(gatewayId);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[GET /api/eausure/gateways/:gatewayId/status]', error);
    const routeError = toRouteError(error);
    return NextResponse.json(routeError.body, { status: routeError.status });
  }
}
