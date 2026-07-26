// Client-side export generators for accepted cuts.
export type CutRow = {
  start_sec: number;
  end_sec: number;
  cut_type: string;
  reason: string;
};

const fmtTC = (sec: number) => {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

export function toCSV(cuts: CutRow[]): string {
  const rows = [["start", "end", "type", "reason"]];
  for (const c of cuts) rows.push([fmtTC(c.start_sec), fmtTC(c.end_sec), c.cut_type, c.reason.replace(/"/g, '""')]);
  return rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
}

export function toAudacityLabels(cuts: CutRow[]): string {
  // Audacity label track: start<TAB>end<TAB>label
  return cuts.map((c) => `${c.start_sec.toFixed(3)}\t${c.end_sec.toFixed(3)}\t[${c.cut_type}] ${c.reason.replace(/\t|\n/g, " ")}`).join("\n");
}

export function toPremiereMarkersXML(cuts: CutRow[], episodeName: string, fps = 30): string {
  // Adobe Premiere Pro FCP7-style XML with markers. Editors import as sequence markers.
  const secToFrames = (s: number) => Math.round(s * fps);
  const markers = cuts.map((c) => `
      <marker>
        <comment>[${escapeXml(c.cut_type)}] ${escapeXml(c.reason)}</comment>
        <name>${escapeXml(c.cut_type)}</name>
        <in>${secToFrames(c.start_sec)}</in>
        <out>${secToFrames(c.end_sec)}</out>
      </marker>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="${escapeXml(episodeName)}">
    <name>${escapeXml(episodeName)} — Cut Points</name>
    <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>${markers}
  </sequence>
</xmeml>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
