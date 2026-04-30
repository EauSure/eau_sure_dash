import { NextRequest, NextResponse } from 'next/server';
import { unpairNode } from '@/lib/api/gateways';
import { toRouteError } from '@/lib/api/client';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ gatewayId: string; nodeId: string }> }) {
  try {
    const { gatewayId, nodeId } = await params;
    const data = await unpairNode(gatewayId, nodeId);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/eausure/gateways/:gatewayId/nodes/:nodeId]', error);
    const routeError = toRouteError(error);
    return NextResponse.json(routeError.body, { status: routeError.status });
  }
}
