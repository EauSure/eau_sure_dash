import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getClient } from '@/lib/mongodb';

const NODE_ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;

type IotNode = {
  _id: ObjectId;
  nodeId: string;
  deviceId: string;
  ownerId: ObjectId;
  ownerEmail: string;
  ownerName: string;
  firmwareVersion: string;
  isActive?: boolean;
  lastSeen: Date | null;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');

    const nodes = await db
      .collection<IotNode>('iot_nodes')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const now = Date.now();
    const result = nodes.map((node) => {
      const lastSeenMs = node.lastSeen ? new Date(node.lastSeen).getTime() : null;
      const isActive = typeof lastSeenMs === 'number'
        ? now - lastSeenMs < NODE_ACTIVE_THRESHOLD_MS
        : false;

      return {
        ...node,
        _id: node._id.toString(),
        ownerId: node.ownerId.toString(),
        isActive,
        lastSeen: node.lastSeen?.toISOString() ?? null,
        createdAt: node.createdAt.toISOString(),
        updatedAt: node.updatedAt.toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/admin/nodes]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
