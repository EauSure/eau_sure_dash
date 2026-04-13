import type { ObjectId } from 'mongodb';
import { z } from 'zod';

export const ticketCategories = ['bug', 'device', 'gateway', 'alert', 'other'] as const;
export const ticketPriorities = ['low', 'medium', 'high', 'critical'] as const;
export const ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'] as const;

export type TicketCategory = (typeof ticketCategories)[number];
export type TicketPriority = (typeof ticketPriorities)[number];
export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketCategorySchema = z.enum(ticketCategories);
export const ticketPrioritySchema = z.enum(ticketPriorities);
export const ticketStatusSchema = z.enum(ticketStatuses);

export const ticketCreateSchema = z.object({
  title: z.string().trim().min(5).max(100),
  description: z.string().trim().min(20).max(2000),
  category: ticketCategorySchema,
  priority: ticketPrioritySchema,
});

export const ticketUpdateSchema = z.object({
  status: ticketStatusSchema.optional(),
  adminNote: z.string().trim().max(2000).optional(),
});

export interface Ticket {
  _id: ObjectId;
  ticketId: string;
  userId: ObjectId;
  userEmail: string;
  userName: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  description: string;
  adminNote?: string;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  count: number;
}

export interface TicketListResponse<TTicket> {
  tickets: TTicket[];
  meta: TicketListMeta;
}

export function buildTicketId(sequence: number): string {
  return `TKT-${String(sequence).padStart(5, '0')}`;
}