import { Readable } from 'stream';
import { GridFSBucket, ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';

export const runtime = 'nodejs';

const sessionCookieName =
  process.env.NODE_ENV === 'production'
    ? '__Host-eausure.session'
    : 'eausure.session';

type FirmwareReleaseRecord = {
  releaseId: string;
  filename: string;
  fileId?: ObjectId | string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: sessionCookieName,
  });

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { releaseId } = await params;

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');

    const release = await db.collection<FirmwareReleaseRecord>('firmware_releases').findOne({ releaseId });

    if (!release) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    const fileId =
      typeof release.fileId === 'string' && ObjectId.isValid(release.fileId)
        ? new ObjectId(release.fileId)
        : release.fileId;

    if (!(fileId instanceof ObjectId)) {
      return NextResponse.json({ error: 'Invalid release file' }, { status: 500 });
    }

    await db.collection('firmware_releases').updateOne(
      { releaseId },
      {
        $inc: { downloadCount: 1 },
      }
    );

    const bucket = new GridFSBucket(db, { bucketName: 'firmware_files' });
    const downloadStream = bucket.openDownloadStream(fileId);
    const webStream = Readable.toWeb(downloadStream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
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
