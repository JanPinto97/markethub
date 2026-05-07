import { Ollama } from 'ollama';
import 'dotenv/config';

const host = process.env.OLLAMA_URL || 'http://localhost:11434';
const model = process.env.OLLAMA_MODEL || 'gemma3:4b';

const client = new Ollama({ host });

export interface GenerateOptions {
  maxTokens?: number;
  json?: boolean;
  system?: string;
}

export async function generateText(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });

  const res = await client.chat({
    model,
    messages,
    format: opts.json ? 'json' : undefined,
    options: {
      num_predict: opts.maxTokens ?? 256,
      temperature: 0.9,
    },
  });

  return (res.message?.content ?? '').trim();
}
