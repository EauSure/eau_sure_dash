import { NextRequest, NextResponse } from 'next/server';
import { getEauSureStats } from '@/lib/eausure-server';
import { getRequestAuthContext } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  const auth = await getRequestAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const hours = request.nextUrl.searchParams.get('hours');
    const data = await getEauSureStats(hours);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[GET /api/eausure/stats]', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
