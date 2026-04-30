import { NextRequest, NextResponse } from 'next/server';
import { updateNodeConfig } from '@/lib/api/gateways';
import { toRouteError } from '@/lib/api/client';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ gatewayId: string; nodeId: string }> }) {
  try {
    const { gatewayId, nodeId } = await params;
    const body = await request.json();
    const data = await updateNodeConfig(gatewayId, nodeId, body);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/eausure/gateways/:gatewayId/nodes/:nodeId/config]', error);
    const routeError = toRouteError(error);
    return NextResponse.json(routeError.body, { status: routeError.status });
  }
}
