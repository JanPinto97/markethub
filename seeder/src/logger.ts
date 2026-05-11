import { promises as fsp, createWriteStream, type WriteStream, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let stream: WriteStream | null = null;
let currentPath: string | null = null;

function ts(): string {
  return new Date().toISOString();
}

function fileStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack ?? a.message;
      try { return JSON.stringify(a); } catch { return String(a); }
    })
    .join(' ');
}

export function initFileLogger(): string {
  if (stream) return currentPath!;

  const dir = process.env.SEEDER_LOG_DIR
    ? path.resolve(process.env.SEEDER_LOG_DIR)
    : path.resolve(__dirname, '..', 'logs');
  mkdirSync(dir, { recursive: true });

  const filename = process.env.SEEDER_LOG_FILE ?? `orchestrator_${fileStamp()}.log`;
  currentPath = path.join(dir, filename);
  stream = createWriteStream(currentPath, { flags: 'a' });

  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  const tee = (level: string, orig: (...a: unknown[]) => void) => (...args: unknown[]) => {
    orig(...args);
    if (stream) stream.write(`${ts()} ${level} ${formatArgs(args)}\n`);
  };

  console.log = tee('INFO ', origLog);
  console.warn = tee('WARN ', origWarn);
  console.error = tee('ERROR', origError);

  stream.write(`${ts()} INFO  [logger] file logger initialized at ${currentPath}\n`);
  return currentPath;
}

export async function closeFileLogger(): Promise<void> {
  if (!stream) return;
  await new Promise<void>((resolve) => {
    stream!.end(resolve);
  });
  stream = null;
  currentPath = null;
}

export function getLogPath(): string | null {
  return currentPath;
}

export async function tailLogs(lines = 50): Promise<string[]> {
  if (!currentPath) return [];
  try {
    const raw = await fsp.readFile(currentPath, 'utf8');
    return raw.split('\n').filter(Boolean).slice(-lines);
  } catch {
    return [];
  }
}
