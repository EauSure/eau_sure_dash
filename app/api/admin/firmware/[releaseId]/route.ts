import { GridFSBucket, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import { requireAdminContext } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  const auth = await requireAdminContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { releaseId } = await params;

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');

    const release = await db.collection<{ fileId?: ObjectId | string }>('firmware_releases').findOne({ releaseId });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    await db.collection('firmware_releases').deleteOne({ releaseId });

    const fileId =
      typeof release.fileId === 'string' && ObjectId.isValid(release.fileId)
        ? new ObjectId(release.fileId)
        : release.fileId;
    if (fileId instanceof ObjectId) {
      const bucket = new GridFSBucket(db, { bucketName: 'firmware_files' });
      await bucket.delete(fileId).catch(() => undefined);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/firmware/[releaseId]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
