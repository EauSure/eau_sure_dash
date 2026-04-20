import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import { requireAdminContext } from '@/lib/server-auth';
import type { Chat } from '@/lib/models/Chat';
import type { User } from '@/lib/user';

type ConversationSummary = {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageAt: string | null;
  messageCount: number;
};

function resolveObjectId(value: string): ObjectId | null {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function messageTimeValue(value: Date | string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const chats = db.collection<Chat>('chats');
    const users = db.collection<User>('users');

    const chatDocs = await chats.find({}).toArray();

    const userIds = Array.from(
      new Set(
        chatDocs
          .map((chat) => chat.userId)
          .filter((id): id is ObjectId => id instanceof ObjectId)
          .map((id) => id.toString())
      )
    );

    const userDocs = userIds.length
      ? await users
          .find(
            { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
            { projection: { _id: 1, name: 1, email: 1 } }
          )
          .toArray()
      : [];

    const userById = new Map(userDocs.map((user) => [user._id.toString(), user]));

    const conversations: ConversationSummary[] = chatDocs.map((chat) => {
      const userId = chat.userId.toString();
      const user = userById.get(userId);
      const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;

      return {
        userId,
        userName: user?.name || chat.userEmail || 'Unknown User',
        userEmail: user?.email || chat.userEmail,
        lastMessage: lastMessage?.text || '',
        lastMessageAt: lastMessage ? new Date(lastMessage.timestamp).toISOString() : null,
        messageCount: chat.messages.length,
      };
    });

    conversations.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    const selectedUserId = req.nextUrl.searchParams.get('userId');
    if (!selectedUserId) {
      return NextResponse.json({ conversations });
    }

    const selectedObjectId = resolveObjectId(selectedUserId);
    if (!selectedObjectId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const selectedChat = await chats.findOne({ userId: selectedObjectId });

    const selectedUser = await users.findOne(
      { _id: selectedObjectId },
      { projection: { _id: 1, name: 1, email: 1 } }
    );

    const selectedConversation = {
      userId: selectedUserId,
      userName: selectedUser?.name || selectedChat?.userEmail || 'Unknown User',
      userEmail: selectedUser?.email || selectedChat?.userEmail || '',
      messages: (selectedChat?.messages || [])
        .slice()
        .sort((a, b) => messageTimeValue(a.timestamp) - messageTimeValue(b.timestamp))
        .map((message) => ({
          role: message.role,
          text: message.text,
          timestamp: new Date(message.timestamp).toISOString(),
        })),
    };

    return NextResponse.json({ conversations, selectedConversation });
  } catch (error) {
    console.error('[GET /api/chat/admin]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
