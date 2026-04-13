import { NextRequest, NextResponse } from 'next/server';
import { getEauSureSensorData } from '@/lib/eausure-server';

export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams(request.nextUrl.searchParams);
    const data = await getEauSureSensorData(params);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sensor data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
