import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import { getRequestAuthContext } from '@/lib/server-auth';
import { getUserByEmail } from '@/lib/user';
import type { Chat } from '@/lib/models/Chat';
import { chatTypingSchema } from '@/lib/models/Chat';

export async function POST(req: NextRequest) {
  const auth = await getRequestAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = auth.role;
  const email = auth.email;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const validation = chatTypingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const chats = db.collection<Chat>('chats');
    const now = new Date();

    if (role === 'admin') {
      const userId = validation.data.userId;
      if (!userId || !ObjectId.isValid(userId)) {
        return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
      }

      const result = await chats.updateOne(
        { userId: new ObjectId(userId) },
        {
          $set: {
            adminTyping: now,
            updatedAt: now,
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      return NextResponse.json({ ok: true });
    }

    const currentUser = await getUserByEmail(email as string);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await chats.updateOne(
      { userId: currentUser._id },
      {
        $set: {
          operatorTyping: now,
          updatedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/chat/typing]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}