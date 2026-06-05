export type AiProvider = 'anthropic' | 'google' | 'openai';

export const AI_PROVIDERS: AiProvider[] = ['anthropic', 'google', 'openai'];

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o-mini',
  google: 'gemini-1.5-flash',
};

export function isProvider(v: string): v is AiProvider {
  return (AI_PROVIDERS as string[]).includes(v);
}

/**
 * Calls the given provider's chat/completions endpoint with a system + user
 * prompt and returns the text. Uses global fetch (Node 18+). Throws a readable
 * error on non-2xx so the caller can surface it.
 */
export async function callProvider(
  provider: AiProvider,
  model: string,
  apiKey: string,
  system: string,
  prompt: string,
): Promise<string> {
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? `Anthropic error ${res.status}`);
    return (data?.content ?? []).map((b: any) => b?.text ?? '').join('').trim();
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? `OpenAI error ${res.status}`);
    return (data?.choices?.[0]?.message?.content ?? '').trim();
  }

  // google (gemini)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Gemini error ${res.status}`);
  return (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? '').join('').trim();
}
