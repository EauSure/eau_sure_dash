import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import { requireAdminContext } from '@/lib/server-auth';

type PatchBody = {
  location?: string;
  firmwareVersion?: string;
};

function parseNodeObjectId(value: string): ObjectId | null {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const objectId = parseNodeObjectId(id);

    if (!objectId) {
      return NextResponse.json({ error: 'Invalid node id' }, { status: 400 });
    }

    const body = (await req.json()) as PatchBody;

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof body.location === 'string') {
      updates.location = body.location.trim();
    }

    if (typeof body.firmwareVersion === 'string') {
      const trimmed = body.firmwareVersion.trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Invalid firmware version' }, { status: 400 });
      }
      updates.firmwareVersion = trimmed;
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');

    const result = await db.collection('iot_nodes').findOneAndUpdate(
      { _id: objectId },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const node = result as {
      _id: ObjectId;
      ownerId: ObjectId;
      lastSeen?: Date | null;
      createdAt: Date;
      updatedAt: Date;
    } & Record<string, unknown>;

    return NextResponse.json({
      ...node,
      _id: node._id.toString(),
      ownerId: node.ownerId.toString(),
      lastSeen: node.lastSeen ? new Date(node.lastSeen).toISOString() : null,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[PATCH /api/admin/nodes/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
