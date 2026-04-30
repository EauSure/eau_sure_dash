import { NextRequest, NextResponse } from 'next/server';
import { confirmPairingCandidate } from '@/lib/api/gateways';
import { toRouteError } from '@/lib/api/client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ gatewayId: string }> }) {
  try {
    const { gatewayId } = await params;
    const body = await request.json();
    const data = await confirmPairingCandidate(gatewayId, body);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[POST /api/eausure/gateways/:gatewayId/pairing/confirm-candidate]', error);
    const routeError = toRouteError(error);
    return NextResponse.json(routeError.body, { status: routeError.status });
  }
}
