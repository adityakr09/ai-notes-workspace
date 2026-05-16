import Groq from 'groq-sdk';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface AiResult {
  summary: string;
  action_items: string[];
  suggested_title: string;
}

export async function generateNoteSummary(title: string, content: string): Promise<AiResult> {
  const prompt = `You are a smart note assistant. Analyze this note and respond ONLY with a valid JSON object, no markdown, no extra text. Note title: ${title}. Note content: ${content}. Respond with exactly: {"summary": "2-4 sentence summary", "action_items": ["action 1", "action 2"], "suggested_title": "concise title"}`;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices[0]?.message?.content || '{}';
  const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as AiResult;

  return {
    summary: parsed.summary || '',
    action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
    suggested_title: parsed.suggested_title || title,
  };
}