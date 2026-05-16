import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getNoteById, createAiSummary } from '@/lib/db';
import { generateNoteSummary } from '@/lib/ai';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const note = getNoteById(params.id, user.sub);
  if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

  if (!note.content.trim()) {
    return NextResponse.json(
      { error: 'Note content is empty. Add some text before generating a summary.' },
      { status: 400 }
    );
  }

  try {
    const result = await generateNoteSummary(note.title, note.content);

    const summary = createAiSummary(
      `AI_${nanoid(12)}`,
      params.id,
      user.sub,
      result.summary,
      result.action_items,
      result.suggested_title
    );

    return NextResponse.json({
      summary: result.summary,
      action_items: result.action_items,
      suggested_title: result.suggested_title,
      id: summary.id,
    });
  } catch (err) {
    console.error('[generate-summary]', err);
    return NextResponse.json(
      { error: 'AI generation failed. Check your API key and try again.' },
      { status: 500 }
    );
  }
}
