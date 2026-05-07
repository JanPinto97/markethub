import 'dotenv/config';
import { Agent } from './agent.js';
import { loadAllAgents } from './state.js';
import { shuffle, sleep } from './utils.js';

interface Config {
  baseUrl: string;
  cycleSize: number;
  cycleDelayMs: number;
  perAgentDelayMs: number;
}

function loadConfig(): Config {
  return {
    baseUrl: process.env.MARKETHUB_API_URL || 'http://localhost:3000/api/v1',
    cycleSize: parseInt(process.env.SEEDER_CYCLE_SIZE ?? '5', 10),
    cycleDelayMs: parseInt(process.env.SEEDER_CYCLE_DELAY_MS ?? '60000', 10),
    perAgentDelayMs: parseInt(process.env.SEEDER_AGENT_DELAY_MS ?? '4000', 10),
  };
}

let stopping = false;
process.on('SIGINT', () => {
  console.log('\n[orchestrator] SIGINT received, finishing current agent and stopping');
  stopping = true;
});

async function runCycle(cfg: Config, cycleNo: number): Promise<void> {
  const states = await loadAllAgents();
  if (states.length === 0) {
    console.warn('[orchestrator] no agents on disk — run `npm run bootstrap <N>` first');
    return;
  }
  const subset = shuffle(states).slice(0, Math.min(cfg.cycleSize, states.length));
  console.log(`[orchestrator] cycle ${cycleNo}: ${subset.length}/${states.length} agents acting`);

  for (const s of subset) {
    if (stopping) return;
    try {
      const agent = new Agent(s, cfg.baseUrl);
      await agent.act();
    } catch (err) {
      console.error(`[orchestrator] agent ${s.username} crashed: ${(err as Error).message}`);
    }
    if (stopping) return;
    await sleep(cfg.perAgentDelayMs);
  }
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  console.log(`[orchestrator] base=${cfg.baseUrl} cycleSize=${cfg.cycleSize} cycleDelay=${cfg.cycleDelayMs}ms perAgentDelay=${cfg.perAgentDelayMs}ms`);
  let cycleNo = 1;
  while (!stopping) {
    await runCycle(cfg, cycleNo);
    if (stopping) break;
    console.log(`[orchestrator] cycle ${cycleNo} done, sleeping ${cfg.cycleDelayMs}ms`);
    await sleep(cfg.cycleDelayMs);
    cycleNo += 1;
  }
  console.log('[orchestrator] stopped');
}

main().catch((err) => {
  console.error('[orchestrator] fatal:', err);
  process.exit(1);
});
