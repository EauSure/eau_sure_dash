import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { serializeChat } from '@/lib/chat';
import { getClient } from '@/lib/mongodb';
import { getUserByEmail } from '@/lib/user';
import type { Chat } from '@/lib/models/Chat';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof token?.email === 'string' ? token.email : null;

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getUserByEmail(email);
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