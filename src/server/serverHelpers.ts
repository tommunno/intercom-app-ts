import { CHUNK_SIZE } from "./constants/serverConstants.js";

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ILogger, IOutputPort, IPartyline } from "./contracts/index.js";

const SAMPLE_RATE = 48000;
const NUM_CH = 3;
const HZ = 1000;
const AMP = 0.15; // 0..1

export function startSineTest(pushAudio: (buf: Buffer) => void): () => void {
  const totalSamples = NUM_CH * CHUNK_SIZE;
  const i16 = new Int16Array(totalSamples);

  let phase = 0;
  const phaseInc = (2 * Math.PI * HZ) / SAMPLE_RATE;

  const id = setInterval(
    () => {
      // fill one CHUNK_SIZE block, copy it to all 3 channels
      for (let n = 0; n < CHUNK_SIZE; n++) {
        const s = Math.sin(phase) * AMP;
        const v = (s * 32767) | 0;
        i16[n] = v; // ch0
        i16[CHUNK_SIZE + n] = v; // ch1
        i16[2 * CHUNK_SIZE + n] = v; // ch2
        phase += phaseInc;
        if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
      }

      // push without copying
      pushAudio(Buffer.from(i16.buffer));
    },
    Math.round((CHUNK_SIZE / SAMPLE_RATE) * 1000),
  );

  return () => clearInterval(id); // stop()
}

export function startSweepTest(
  pushAudio: (buf: Buffer) => void,
  { startHz = 200, endHz = 4000, sweepSeconds = 6, amp = 0.05 } = {},
): () => void {
  const totalSamples = NUM_CH * CHUNK_SIZE;
  const i16 = new Int16Array(totalSamples);

  let phase = 0;
  let t = 0; // seconds into sweep
  const dt = 1 / SAMPLE_RATE;

  const id = setInterval(
    () => {
      for (let n = 0; n < CHUNK_SIZE; n++) {
        // 0..1 sweep position
        const u = t / sweepSeconds;

        // exponential sweep (log-like to our ears)
        const hz = startHz * Math.pow(endHz / startHz, u);

        const phaseInc = (2 * Math.PI * hz) / SAMPLE_RATE;

        const s = Math.sin(phase) * amp;
        const v = (s * 32767) | 0;

        // same sample to all channels
        i16[n] = v;
        i16[CHUNK_SIZE + n] = v;
        i16[2 * CHUNK_SIZE + n] = v;

        phase += phaseInc;
        if (phase > 2 * Math.PI) phase -= 2 * Math.PI;

        t += dt;
        if (t >= sweepSeconds) t = 0; // loop
      }

      pushAudio(Buffer.from(i16.buffer));
    },
    Math.round((CHUNK_SIZE / SAMPLE_RATE) * 1000),
  );

  return () => clearInterval(id);
}

//Dev only matrix crosspoint logger.
//Set ENABLE_DEV_MATRIX_VIEW to true in ServerConstants and run 'tail -f dev_matrix_view.txt' in terminal to view
export const devLogCrosspoints = (
  partylines: IPartyline[],
  outputPorts: IOutputPort[],
  logger: ILogger,
): void => {
  const RESET = "\x1b[0m";
  const CYAN = "\x1b[36m";
  const YELLOW = "\x1b[33m";
  const RED = "\x1b[31m";
  const GREEN = "\x1b[32m";
  const BOLD = "\x1b[1m";
  const DIM = "\x1b[2m";

  let outputPortLines: string = "";
  outputPorts.forEach((p) => {
    const s = p.state;
    const sources = [...s.currentState].sort((a, b) => a - b).join(" , ");
    outputPortLines += `${CYAN}DEST ${p.id}  ${DIM}[${s.type}]${RESET}    ◄─ SRC { ${YELLOW}${sources}${RESET} }\n`;
  });

  let partylineLines: string = "";
  partylines.forEach((pl) => {
    const s = pl.state;
    const talks = [...s.portsTalking].sort((a, b) => a - b).join(" , ");
    const listens = [...s.portsListening].sort((a, b) => a - b).join(" , ");
    partylineLines += `${BOLD}PL ${pl.id} ${CYAN}${s.name}  ${DIM}│${RESET} TALK: [${RED}${talks}${RESET}]      ${DIM}│${RESET} LISTEN: [${GREEN}${listens}${RESET}]\n`;
  });

  const log = `
\x1B[2J\x1B[H${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}
${BOLD}║             AUDIO MATRIX REAL-TIME CROSSPOINT MAP            ║${RESET}
${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}

${BOLD}─── OUTPUT PORTS (DESTINATIONS) ──────────────────────────────${RESET}
${outputPortLines}


${BOLD}─── PARTYLINES ───────────────────────────────────────────────${RESET}
${partylineLines}

${DIM}Last Updated: ${new Date().toLocaleTimeString()} ${RESET}
`;
  try {
    const filePath = join(process.cwd(), "dev_matrix_view.txt");
    writeFileSync(filePath, log, "utf8");
  } catch (err) {
    logger.error("Failed to write dev crosspoint log", err);
  }
};
