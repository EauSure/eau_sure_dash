import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb';
import type { Ticket } from '@/lib/models/Ticket';
import { ticketUpdateSchema } from '@/lib/models/Ticket';

type PatchBody = {
  status?: Ticket['status'];
  adminNote?: string;
};

function parseObjectId(value: string): ObjectId | null {
  if (!ObjectId.isValid(value)) {
    return null;
  }

  return new ObjectId(value);
}

function toTicketResponse(ticket: Ticket) {
  return {
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
    adminNote: ticket.adminNote ?? '',
    resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt).toISOString() : null,
    createdAt: new Date(ticket.createdAt).toISOString(),
    updatedAt: new Date(ticket.updatedAt).toISOString(),
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const objectId = parseObjectId(id);

    if (!objectId) {
      return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
    }

    const body = (await req.json()) as PatchBody;
    const validation = ticketUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    if (!validation.data.status && validation.data.adminNote === undefined) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const tickets = db.collection<Ticket>('tickets');

    const target = await tickets.findOne({ _id: objectId });
    if (!target) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updates: Partial<Ticket> = {
      updatedAt: new Date(),
    };

    if (validation.data.status) {
      updates.status = validation.data.status;
      updates.resolvedAt = ['resolved', 'closed'].includes(validation.data.status)
        ? new Date()
        : null;
    }

    if (validation.data.adminNote !== undefined) {
      updates.adminNote = validation.data.adminNote;
    }

    await tickets.updateOne(
      { _id: objectId },
      {
        $set: updates,
      }
    );

    const updatedTicket = await tickets.findOne({ _id: objectId });

    if (!updatedTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json(toTicketResponse(updatedTicket));
  } catch (error) {
    console.error('[PATCH /api/tickets/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const objectId = parseObjectId(id);

    if (!objectId) {
      return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'water_quality');
    const tickets = db.collection<Ticket>('tickets');

    const result = await tickets.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/tickets/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}