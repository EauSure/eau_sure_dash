import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { serializeChat } from '@/lib/chat';
import { getClient } from '@/lib/mongodb';
import type { Chat } from '@/lib/models/Chat';
import { chatModerateSchema } from '@/lib/models/Chat';

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const validation = chatModerateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(validation.data.userId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const userObjectId = new ObjectId(validation.data.userId);
    const now = new Date();
    const moderatorName = typeof token?.name === 'string' && token.name.trim() ? token.name : 'Support Agent';
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const chats = db.collection<Chat>('chats');

    const chat = await chats.findOne({ userId: userObjectId });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const update: Partial<Chat> = { updatedAt: now } as Partial<Chat>;

    if (validation.data.action === 'suspend') {
      update.status = 'suspended';
      update.suspendedBy = moderatorName;
    }

    if (validation.data.action === 'resume') {
      update.status = 'active';
      update.suspendedBy = null;
      update.startedAt = chat.startedAt ?? now;
    }

    if (validation.data.action === 'end') {
      update.status = 'ended';
      update.endedAt = now;
      update.suspendedBy = null;
    }

    await chats.updateOne(
      { _id: chat._id },
      {
        $set: update,
      }
    );

    const updatedChat = await chats.findOne({ _id: chat._id });
    return NextResponse.json({ chat: serializeChat(updatedChat) });
  } catch (error) {
    console.error('[POST /api/chat/moderate]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}