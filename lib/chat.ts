import type { Chat } from '@/lib/models/Chat';

export type SerializedChatMessage = {
  role: Chat['messages'][number]['role'];
  text: string;
  timestamp: string;
};

export type SerializedChatStatus = 'active' | 'suspended' | 'waiting' | 'ended' | null;

export type SerializedChat = {
  chatId: string | null;
  status: SerializedChatStatus;
  reason: string | null;
  startedAt: string | null;
  endedAt: string | null;
  suspendedBy: string | null;
  operatorTyping: string | null;
  adminTyping: string | null;
  messages: SerializedChatMessage[];
  createdAt: string | null;
  updatedAt: string | null;
};

export function toIsoString(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function serializeChat(chat: Chat | null): SerializedChat {
  if (!chat) {
    return {
      chatId: null,
      status: null,
      reason: null,
      startedAt: null,
      endedAt: null,
      suspendedBy: null,
      operatorTyping: null,
      adminTyping: null,
      messages: [],
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    chatId: chat._id.toString(),
    status: chat.status,
    reason: chat.reason,
    startedAt: toIsoString(chat.startedAt ?? null),
    endedAt: toIsoString(chat.endedAt ?? null),
    suspendedBy: chat.suspendedBy ?? null,
    operatorTyping: toIsoString(chat.operatorTyping ?? null),
    adminTyping: toIsoString(chat.adminTyping ?? null),
    messages: chat.messages.map((message) => ({
      role: message.role,
      text: message.text,
      timestamp: toIsoString(message.timestamp) ?? new Date(message.timestamp).toISOString(),
    })),
    createdAt: toIsoString(chat.createdAt),
    updatedAt: toIsoString(chat.updatedAt ?? null),
  };
}

export function isRecentTimestamp(value?: string | Date | null, windowMs = 3000) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= windowMs;
}