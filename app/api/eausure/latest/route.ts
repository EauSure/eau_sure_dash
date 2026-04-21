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
    console.error('[GET /api/eausure/latest]', error);
    return NextResponse.json({ error: 'Failed to fetch latest sensor data' }, { status: 500 });
  }
}
