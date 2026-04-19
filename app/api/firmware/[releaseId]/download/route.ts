import { readFileSync } from 'fs';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { releaseId } = await params;

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');

    const release = await db.collection('firmware_releases').findOne({ releaseId });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    if (typeof release.filePath !== 'string' || release.filePath.length === 0) {
      return NextResponse.json({ error: 'Invalid release file' }, { status: 500 });
    }

    await db.collection('firmware_releases').updateOne(
      { releaseId },
      {
        $inc: { downloadCount: 1 },
      }
    );

    const fileBuffer = readFileSync(release.filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${release.filename}"`,
      },
    });
  } catch (error) {
    console.error('[GET /api/firmware/[releaseId]/download]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
