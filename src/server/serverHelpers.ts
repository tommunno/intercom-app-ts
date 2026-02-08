import { CHUNK_SIZE } from "./constants/serverConstants.js";

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
