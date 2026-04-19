import { unlink } from 'fs/promises';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { releaseId } = await params;

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');

    const release = await db.collection('firmware_releases').findOne({ releaseId });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    await db.collection('firmware_releases').deleteOne({ releaseId });

    if (typeof release.filePath === 'string' && release.filePath.length > 0) {
      await unlink(release.filePath).catch(() => undefined);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/firmware/[releaseId]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
