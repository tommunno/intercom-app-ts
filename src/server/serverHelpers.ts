//Types:
import type { ILogger, IOutputPort, IPartyline } from "./contracts/index.js";
import type { PortAvailabilityResult } from "./types/index.js";
import type { SessionTokenInfo } from "../shared/types/SessionTokenInfo.js";
//Constants:
import { CHUNK_SIZE } from "./constants/serverConstants.js";
//External:
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import net from "node:net";
import dgram from "node:dgram";

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

export function validatePort(port: number | undefined): port is number {
  return (
    port !== undefined &&
    Number.isSafeInteger(port) &&
    (port >= 1025 || port === 80 || port === 443) &&
    port <= 65535
  );
}

//TCP by default, UDP if isUdp=true:
export async function findRandomAvailablePort(
  avoid: ReadonlySet<number> = new Set(),
  isUdp: boolean = false,
  host: string = "0.0.0.0",
  attempts = 5,
): Promise<number | null> {
  for (let i = 0; i < attempts; i++) {
    // 1025–65535 (since the validatePort logic allows >=1025, plus 80/443)
    const port = Math.floor(Math.random() * (65535 - 1025 + 1)) + 1025;
    if (avoid.has(port)) continue;

    const { isAvailable } = await isPortAvailable(port, isUdp, host);
    if (isAvailable) return port;
  }
  return null;
}

//TCP by default, UDP if isUdp=true:
export function isPortAvailable(
  port: number,
  isUdp: boolean = false,
  host: string = "0.0.0.0",
): Promise<PortAvailabilityResult> {
  return isUdp
    ? isUdpPortAvailable(port, host)
    : isTcpPortAvailable(port, host);
}

export function isTcpPortAvailable(
  port: number,
  host: string = "0.0.0.0",
): Promise<PortAvailabilityResult> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err) => {
      try {
        server.close();
      } catch {}
      resolve({ isAvailable: false, err });
    });

    server.once("listening", () => {
      server.close(() => resolve({ isAvailable: true }));
    });

    server.listen(port, host);
  });
}

export function isUdpPortAvailable(
  port: number,
  host: string = "0.0.0.0",
): Promise<PortAvailabilityResult> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");

    socket.once("error", (err) => {
      try {
        socket.close();
      } catch {}
      resolve({ isAvailable: false, err });
    });

    socket.once("listening", () => {
      socket.close();
      resolve({ isAvailable: true });
    });

    socket.bind(port, host);
  });
}

export function hasSessionTokenInfoExpired(
  sessionTokenInfo: SessionTokenInfo,
  now: number = Date.now(),
): boolean {
  return sessionTokenInfo.expiresAtMs < now;
}

export function sanitiseSessionTokenInfos(
  infos: SessionTokenInfo[],
  logger: ILogger,
  userId?: number,
): SessionTokenInfo[] {
  const result: SessionTokenInfo[] = [];
  const seen = new Set<string>();
  let duplicateToken = false;

  for (const info of infos) {
    if (hasSessionTokenInfoExpired(info)) continue;

    if (seen.has(info.token)) {
      duplicateToken = true;
      continue;
    }

    seen.add(info.token);
    result.push({ ...info });
  }

  if (duplicateToken) {
    logger.warn(
      `Duplicate sessionToken found in loaded sessionTokenInfos${userId === undefined ? "" : ` for userId ${userId}`} `,
    );
  }
  return result;
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

//Returns what elements have been REMOVED from A
export function getRemovedSetItems<T>(
  a: ReadonlySet<T>,
  b: ReadonlySet<T>,
): Set<T> {
  const removed = new Set<T>();

  for (const item of a) {
    if (!b.has(item)) {
      removed.add(item);
    }
  }

  return removed;
}
