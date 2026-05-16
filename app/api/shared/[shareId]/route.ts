import { NextRequest, NextResponse } from 'next/server';
import { getNoteByShareId, getUserById } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { shareId: string } }) {
  const note = getNoteByShareId(params.shareId);
  if (!note) {
    return NextResponse.json({ error: 'Note not found or is not public.' }, { status: 404 });
  }

  const author = getUserById(note.user_id);

  return NextResponse.json({
    note: {
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      category: note.category,
      updated_at: note.updated_at,
      created_at: note.created_at,
      latest_summary: note.latest_summary,
    },
    author: author ? { name: author.name } : null,
  });
}
