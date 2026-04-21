import { NextRequest, NextResponse } from 'next/server';
import { getEauSureSensorData } from '@/lib/eausure-server';
import { getRequestAuthContext } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  const auth = await getRequestAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = new URLSearchParams(request.nextUrl.searchParams);
    const data = await getEauSureSensorData(params);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[GET /api/eausure/sensor-data]', error);
    return NextResponse.json({ error: 'Failed to fetch sensor data' }, { status: 500 });
  }
}
