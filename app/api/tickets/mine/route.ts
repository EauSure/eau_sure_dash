import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import { getUserByEmail } from '@/lib/user';
import type { Ticket } from '@/lib/models/Ticket';
import {
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/models/Ticket';

type TicketResponse = {
  _id: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  userName: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  description: string;
  adminNote?: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toTicketResponse(ticket: Ticket): TicketResponse {
  const response: TicketResponse = {
    _id: ticket._id.toString(),
    ticketId: ticket.ticketId,
    userId: ticket.userId.toString(),
    userEmail: ticket.userEmail,
    userName: ticket.userName,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    title: ticket.title,
    description: ticket.description,
    resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt).toISOString() : null,
    createdAt: new Date(ticket.createdAt).toISOString(),
    updatedAt: new Date(ticket.updatedAt).toISOString(),
  };

  if (typeof ticket.adminNote === 'string' && ticket.adminNote.trim()) {
    response.adminNote = ticket.adminNote;
  }

  return response;
}

function parseFilterValue<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | undefined | null {
  if (value === null || value === '') {
    return undefined;
  }

  return allowed.includes(value as T) ? (value as T) : null;
}

function parsePagination(searchParams: URLSearchParams) {
  const pageValue = Number(searchParams.get('page') ?? '1');
  const limitValue = Number(searchParams.get('limit') ?? '20');

  const page = Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
  const limitRaw = Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : 20;
  const limit = Math.min(limitRaw, 100);

  return { page, limit };
}

function buildTextSearch(search: string | null) {
  const normalized = search?.trim() ?? '';
  if (!normalized) {
    return undefined;
  }

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    $or: [
      { title: { $regex: escaped, $options: 'i' } },
      { ticketId: { $regex: escaped, $options: 'i' } },
    ],
  };
}

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

  const status = parseFilterValue(req.nextUrl.searchParams.get('status'), ticketStatuses);
  const category = parseFilterValue(req.nextUrl.searchParams.get('category'), ticketCategories);
  const priority = parseFilterValue(req.nextUrl.searchParams.get('priority'), ticketPriorities);

  if (status === null) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  if (category === null) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  if (priority === null) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });

  const { page, limit } = parsePagination(req.nextUrl.searchParams);
  const search = buildTextSearch(req.nextUrl.searchParams.get('search'));

  try {
    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const tickets = db.collection<Ticket>('tickets');

    const query: Record<string, unknown> = { userId: currentUser._id };

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) Object.assign(query, search);

    const total = await tickets.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const records = await tickets
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      tickets: records.map((ticket) => toTicketResponse(ticket)),
      meta: {
        page: currentPage,
        limit,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
        count: records.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/tickets/mine]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}