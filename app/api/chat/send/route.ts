import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Filter } from 'bad-words';
import { serializeChat } from '@/lib/chat';
import { getClient } from '@/lib/mongodb';
import { getRequestAuthContext } from '@/lib/server-auth';
import { getUserByEmail } from '@/lib/user';
import type { Chat } from '@/lib/models/Chat';
import { chatSendSchema } from '@/lib/models/Chat';

const filter = new Filter();

export async function POST(req: NextRequest) {
  const auth = await getRequestAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = auth.email;
  const role = auth.role;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const validation = chatSendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const currentUser = role === 'admin' ? null : await getUserByEmail(email as string);
    if (role !== 'admin' && !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const chats = db.collection<Chat>('chats');

    const userId = role === 'admin' ? typeof body.userId === 'string' ? body.userId.trim() : '' : currentUser?._id.toString();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const chat = await chats.findOne({ userId: role === 'admin' ? new ObjectId(userId) : currentUser!._id });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (!['active', 'suspended'].includes(chat.status)) {
      return NextResponse.json({ error: 'Chat is not active' }, { status: 409 });
    }

    const safeText = filter.clean(validation.data.text);

    await chats.updateOne(
      { _id: chat._id },
      {
        $set: {
          updatedAt: now,
          ...(role === 'admin' ? { adminTyping: null } : { operatorTyping: null }),
        },
        $push: {
          messages: {
            role: role === 'admin' ? 'admin' : 'user',
            text: safeText,
            timestamp: now,
          },
        },
      },
    );

    const updatedChat = await chats.findOne({ _id: chat._id });

    return NextResponse.json(serializeChat(updatedChat));
  } catch (error) {
    console.error('[POST /api/chat/send]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}