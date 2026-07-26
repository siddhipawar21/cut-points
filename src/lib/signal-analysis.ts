// Client-side audio signal analysis using Web Audio API.
export type Flag = {
  start: number;
  end: number;
  type: "dead_air" | "energy_dip";
  reason: string;
};

export type AnalysisResult = {
  duration: number;
  peaks: number[]; // normalized 0-1, ~2000 samples
  flags: Flag[];
};

export async function decodeAudio(file: File): Promise<AudioBuffer> {
  const arr = await file.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  const ctx = new AC();
  const buf = await ctx.decodeAudioData(arr.slice(0));
  await ctx.close();
  return buf;
}

export function analyzeBuffer(
  buf: AudioBuffer,
  opts: { silenceDb?: number; minSilenceMs?: number; energyDipDb?: number; peakBins?: number } = {},
): AnalysisResult {
  const silenceDb = opts.silenceDb ?? -40;
  const minSilenceMs = opts.minSilenceMs ?? 800;
  const energyDipDb = opts.energyDipDb ?? 10;
  const peakBins = opts.peakBins ?? 2000;

  const sr = buf.sampleRate;
  const ch0 = buf.getChannelData(0);
  const N = ch0.length;
  // Mixdown to mono
  const mono = new Float32Array(N);
  const chCount = buf.numberOfChannels;
  for (let c = 0; c < chCount; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < N; i++) mono[i] += ch[i];
  }
  for (let i = 0; i < N; i++) mono[i] /= chCount;

  // Windowed RMS every 50ms
  const winSize = Math.floor(sr * 0.05);
  const windows: { t: number; db: number }[] = [];
  for (let i = 0; i < N; i += winSize) {
    let sum = 0;
    const end = Math.min(N, i + winSize);
    for (let j = i; j < end; j++) sum += mono[j] * mono[j];
    const rms = Math.sqrt(sum / (end - i));
    const db = rms > 0 ? 20 * Math.log10(rms) : -100;
    windows.push({ t: i / sr, db });
  }

  // Peaks for waveform display
  const peaks: number[] = new Array(peakBins).fill(0);
  const bin = Math.max(1, Math.floor(N / peakBins));
  for (let b = 0; b < peakBins; b++) {
    let mx = 0;
    const s = b * bin;
    const e = Math.min(N, s + bin);
    for (let i = s; i < e; i++) {
      const v = Math.abs(mono[i]);
      if (v > mx) mx = v;
    }
    peaks[b] = mx;
  }
  // Normalize peaks
  const maxPeak = peaks.reduce((a, b) => (b > a ? b : a), 0.001);
  for (let i = 0; i < peaks.length; i++) peaks[i] = peaks[i] / maxPeak;

  // Dead air: consecutive windows below threshold, sustained >= minSilenceMs
  const flags: Flag[] = [];
  const minWins = Math.max(1, Math.ceil(minSilenceMs / 50));
  let runStart = -1;
  for (let i = 0; i <= windows.length; i++) {
    const isSilent = i < windows.length && windows[i].db < silenceDb;
    if (isSilent) {
      if (runStart < 0) runStart = i;
    } else if (runStart >= 0) {
      const len = i - runStart;
      if (len >= minWins) {
        flags.push({
          start: windows[runStart].t,
          end: (windows[i - 1]?.t ?? windows[runStart].t) + 0.05,
          type: "dead_air",
          reason: `Sustained silence below ${silenceDb} dB for ${(len * 0.05).toFixed(1)}s`,
        });
      }
      runStart = -1;
    }
  }

  // Energy dips: 3-sec rolling mean, flag windows ≥ energyDipDb below local mean, sustained ≥ 500ms
  const rollN = Math.floor(3 / 0.05);
  const rolling: number[] = new Array(windows.length).fill(-60);
  let sum = 0, count = 0;
  const q: number[] = [];
  for (let i = 0; i < windows.length; i++) {
    q.push(windows[i].db);
    sum += windows[i].db;
    count++;
    if (q.length > rollN) sum -= q.shift()!, count--;
    rolling[i] = sum / count;
  }
  const dipMinWins = Math.ceil(500 / 50);
  runStart = -1;
  for (let i = 0; i <= windows.length; i++) {
    const isDip = i < windows.length
      && windows[i].db >= silenceDb  // exclude pure silence (already flagged)
      && (rolling[i] - windows[i].db) >= energyDipDb;
    if (isDip) {
      if (runStart < 0) runStart = i;
    } else if (runStart >= 0) {
      const len = i - runStart;
      if (len >= dipMinWins) {
        flags.push({
          start: windows[runStart].t,
          end: (windows[i - 1]?.t ?? windows[runStart].t) + 0.05,
          type: "energy_dip",
          reason: `Energy dropped ~${energyDipDb}+ dB below the local average (trailing off)`,
        });
      }
      runStart = -1;
    }
  }

  flags.sort((a, b) => a.start - b.start);
  return { duration: buf.duration, peaks, flags };
}
