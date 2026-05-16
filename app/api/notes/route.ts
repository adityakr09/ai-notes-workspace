import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createNote, getNotesByUser, upsertTag, setNoteTags } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const tag = searchParams.get('tag') || undefined;
  const archived = searchParams.get('archived') === 'true';
  const sort = searchParams.get('sort') || 'updated_at';

  const notes = getNotesByUser(user.sub, { search, tag, archived, sort });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title = 'Untitled Note', content = '', tags = [], category } = await req.json();

  const noteId = `NOTE_${nanoid(12)}`;
  const note = createNote(noteId, user.sub, title, content, category);

  // Handle tags
  if (tags.length > 0) {
    const tagIds = tags.map((name: string) => {
      const tag = upsertTag(`TAG_${nanoid(8)}`, name.toLowerCase().trim(), user.sub);
      return tag.id;
    });
    setNoteTags(noteId, tagIds);
  }

  return NextResponse.json({ note }, { status: 201 });
}
