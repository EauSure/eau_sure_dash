import { NextRequest, NextResponse } from 'next/server';
import { unlinkGateway } from '@/lib/api/gateways';
import { toRouteError } from '@/lib/api/client';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ gatewayId: string }> }) {
  try {
    const { gatewayId } = await params;
    const data = await unlinkGateway(gatewayId);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/eausure/gateways/:gatewayId]', error);
    const routeError = toRouteError(error);
    return NextResponse.json(routeError.body, { status: routeError.status });
  }
}
