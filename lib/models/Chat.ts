import type { ObjectId } from 'mongodb';
import { z } from 'zod';

export const chatRoleSchema = z.enum(['user', 'admin']);
export const chatStatusSchema = z.enum(['waiting', 'active', 'suspended', 'ended']);

export type ChatRole = z.infer<typeof chatRoleSchema>;
export type ChatStatus = z.infer<typeof chatStatusSchema>;

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
  status: ChatStatus;
  reason: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
  suspendedBy?: string | null;
  operatorTyping?: Date | null;
  adminTyping?: Date | null;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt?: Date;
}

export const chatRequestSchema = z.object({
  reason: z.string().trim().min(3).max(200),
});

export const chatTypingSchema = z.object({
  userId: z.string().trim().min(1).optional(),
});

export const chatAcceptSchema = z.object({
  userId: z.string().trim().min(1),
});

export const chatModerateSchema = z.object({
  userId: z.string().trim().min(1),
  action: z.enum(['suspend', 'resume', 'end']),
  reason: z.string().trim().max(280).optional(),
});

export const chatSendSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export const chatReplySchema = z.object({
  userId: z.string().trim().min(1),
  text: z.string().trim().min(1).max(2000),
});