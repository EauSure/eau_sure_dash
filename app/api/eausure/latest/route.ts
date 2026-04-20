import { NextRequest, NextResponse } from 'next/server';
import { getEauSureLatest } from '@/lib/eausure-server';
import { getRequestAuthContext } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  const auth = await getRequestAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deviceId = request.nextUrl.searchParams.get('deviceId');
    const data = await getEauSureLatest(deviceId);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch latest sensor data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
