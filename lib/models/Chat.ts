import type { ObjectId } from 'mongodb';
import { z } from 'zod';

export const chatRoleSchema = z.enum(['user', 'admin']);

export type ChatRole = z.infer<typeof chatRoleSchema>;

export interface ChatMessage {
  role: ChatRole;
  text: string;
  timestamp: Date;
}

export interface Chat {
  _id: ObjectId;
  ticketId?: string;
  userId: ObjectId;
  userEmail: string;
  messages: ChatMessage[];
  createdAt: Date;
}

export const chatSendSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});