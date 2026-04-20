import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import { requireAdminContext } from '@/lib/server-auth';

export const runtime = 'nodejs';

const counterId = 'firmwareReleaseId';

type CounterDoc = {
  _id: string;
  seq: number;
};

type FirmwareRelease = {
  _id: ObjectId;
  releaseId: string;
  version: string;
  filename: string;
  fileSize: number;
  filePath: string;
  changelog: string;
  uploadedBy: string;
  downloadCount: number;
  createdAt: Date;
};

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function buildReleaseId(seq: number): string {
  return `FW-${String(seq).padStart(3, '0')}`;
}

function toReleaseDto(release: FirmwareRelease) {
  return {
    ...release,
    _id: release._id.toString(),
    createdAt: release.createdAt.toISOString(),
  };
}

async function requireAdmin(req: NextRequest) {
  const auth = await requireAdminContext(req);
  if (!auth) {
    return null;
  }
  return auth;
}

export async function GET(req: NextRequest) {
  const token = await requireAdmin(req);
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');

    const releases = await db
      .collection<FirmwareRelease>('firmware_releases')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(releases.map(toReleaseDto));
  } catch (error) {
    console.error('[GET /api/admin/firmware]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = await requireAdmin(req);
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const rawFile = formData.get('file');
    const version = String(formData.get('version') || '').trim();
    const changelog = String(formData.get('changelog') || '').trim();

    if (!(rawFile instanceof File)) {
      return NextResponse.json({ error: 'Firmware file is required' }, { status: 400 });
    }

    if (!rawFile.name.toLowerCase().endsWith('.bin')) {
      return NextResponse.json({ error: 'Only .bin files are allowed' }, { status: 400 });
    }

    if (!version) {
      return NextResponse.json({ error: 'Version is required' }, { status: 400 });
    }

    if (changelog.length > 2000) {
      return NextResponse.json({ error: 'Changelog must be 2000 characters or less' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const counters = db.collection<CounterDoc>('counters');

    const counter = await counters.findOneAndUpdate(
      { _id: counterId },
      [
        {
          $set: {
            seq: {
              $cond: {
                if: { $eq: [{ $type: '$seq' }, 'missing'] },
                then: 1,
                else: { $add: ['$seq', 1] },
              },
            },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' }
    );

    const releaseId = buildReleaseId(counter?.seq ?? 1);
    const firmwareDir = path.join(process.cwd(), 'public', 'firmware');
    await mkdir(firmwareDir, { recursive: true });

    const sanitizedOriginal = sanitizeFilename(rawFile.name);
    const storedFilename = `${releaseId}-${Date.now()}-${sanitizedOriginal}`;
    const absoluteFilePath = path.join(firmwareDir, storedFilename);

    const fileBuffer = Buffer.from(await rawFile.arrayBuffer());
    await writeFile(absoluteFilePath, fileBuffer);

    const now = new Date();
    const uploadedBy = token.email;

    const record: Omit<FirmwareRelease, '_id'> = {
      releaseId,
      version,
      filename: rawFile.name,
      fileSize: rawFile.size,
      filePath: absoluteFilePath,
      changelog,
      uploadedBy,
      downloadCount: 0,
      createdAt: now,
    };

    const result = await db.collection<Omit<FirmwareRelease, '_id'>>('firmware_releases').insertOne(record);
    const created = await db.collection<FirmwareRelease>('firmware_releases').findOne({ _id: result.insertedId });

    if (!created) {
      return NextResponse.json({ error: 'Failed to create firmware release' }, { status: 500 });
    }

    return NextResponse.json(toReleaseDto(created), { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/firmware]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
