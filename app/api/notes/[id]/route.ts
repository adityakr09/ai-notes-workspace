import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getNoteById, updateNote, deleteNote, upsertTag, setNoteTags } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const note = getNoteById(params.id, user.sub);
  if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

  return NextResponse.json({ note });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { tags, ...noteData } = body;

  // Filter to allowed fields only
  const allowedFields = ['title', 'content', 'is_archived', 'is_public', 'share_id', 'category'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in noteData) updates[key] = noteData[key];
  }

  // Auto-generate share_id when making public
  if (updates.is_public === 1 || updates.is_public === true) {
    const existing = getNoteById(params.id, user.sub);
    if (!existing?.share_id) {
      updates.share_id = nanoid(16);
    }
  }

  if (Object.keys(updates).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateNote(params.id, user.sub, updates as any);
  }

  // Handle tags update
  if (Array.isArray(tags)) {
    const tagIds = tags.map((name: string) => {
      const tag = upsertTag(`TAG_${nanoid(8)}`, name.toLowerCase().trim(), user.sub);
      return tag.id;
    });
    setNoteTags(params.id, tagIds);
  }

  const note = getNoteById(params.id, user.sub);
  if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

  return NextResponse.json({ note });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  deleteNote(params.id, user.sub);
  return NextResponse.json({ deleted: true });
}
