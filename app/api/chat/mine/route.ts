import { NextRequest, NextResponse } from 'next/server';
import { serializeChat } from '@/lib/chat';
import { getClient } from '@/lib/mongodb';
import { requireOperatorContext } from '@/lib/server-auth';
import { getUserByEmail } from '@/lib/user';
import type { Chat } from '@/lib/models/Chat';

export async function GET(req: NextRequest) {
  const auth = await requireOperatorContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const currentUser = await getUserByEmail(auth.email);
  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const chats = db.collection<Chat>('chats');

    const chat = await chats.findOne({ userId: currentUser._id });

    return NextResponse.json(serializeChat(chat));
  } catch (error) {
    console.error('[GET /api/chat/mine]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
