const PREFIX = "Program data: ";

/** 从单行日志解码 Anchor `emit!` / program data（optimized_matcher 一致的上限） */
export function decodeProgramDataLine(log: string): Uint8Array | null {
  const idx = log.indexOf(PREFIX);
  if (idx < 0) return null;
  const trimmed = log.slice(idx + PREFIX.length).trim();
  if (trimmed.length > 2700) return null;
  try {
    const b = Buffer.from(trimmed, "base64");
    if (b.length > 2048 || b.length < 8) return null;
    return new Uint8Array(b);
  } catch {
    return null;
  }
}
