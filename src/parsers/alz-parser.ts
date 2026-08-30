import { inflate } from 'pako';
import type { BoardData } from './types.js';

function isALZHeader(buf: Uint8Array): boolean {
  return buf.length >= 3 && buf[0] === 0x41 && buf[1] === 0x4c && buf[2] === 0x5a;
}

function tryInflate(data: Uint8Array): Uint8Array | null {
  try {
    return inflate(data);
  } catch {}
  try {
    return inflate(data, { windowBits: 15 });
  } catch {}
  try {
    return inflate(data, { windowBits: -15 });
  } catch {}
  return null;
}

function findBoardMagic(buf: Uint8Array): number {
  const magics: Uint8Array[] = [
    new Uint8Array([0x23, 0xE2, 0x63, 0x28]),
    new Uint8Array([0x42, 0x52, 0x44, 0x5F, 0x56, 0x31]),
    new Uint8Array([0x58, 0x5a, 0x5a, 0x50, 0x43, 0x42]),
  ];
  const texts = ['BRDOUT:', 'dd:1.3', '<<format.asc>>'];
  for (let i = 0; i < buf.length - 512; i++) {
    for (const m of magics) {
      let match = true;
      for (let j = 0; j < m.length; j++) if (buf[i + j] !== m[j]) { match = false; break; }
      if (match) return i;
    }
    const slice = new TextDecoder('ascii').decode(buf.subarray(i, i + 32));
    for (const t of texts) if (slice.startsWith(t)) return i;
  }
  return -1;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

export async function parseALZ(buffer: ArrayBuffer): Promise<BoardData> {
  const bytes = new Uint8Array(buffer);
  const { parseBoardFile } = await import('./index.js');

  if (!isALZHeader(bytes)) {
    const inflated = tryInflate(bytes);
    if (inflated) {
      return parseBoardFile(toArrayBuffer(inflated), 'inner.brd');
    }
    throw new Error('Not a valid ALZ file: missing ALZ magic and not deflate-compressed');
  }

  let headerSize = 0;
  if (bytes.length >= 8) {
    headerSize = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
    if (headerSize > bytes.length || headerSize < 12 || headerSize > 10240) {
      headerSize = 0;
    }
  }

  const tryOffsets: number[] = headerSize ? [headerSize] : [];
  for (let off = 12; off < Math.min(bytes.length, 2048); off++) {
    if (bytes[off] === 0x78 && (bytes[off + 1] === 0x9C || bytes[off + 1] === 0xDA || bytes[off + 1] === 0x01 || bytes[off + 1] === 0x5E)) {
      if (!tryOffsets.includes(off)) tryOffsets.push(off);
    }
  }
  if (headerSize === 0) {
    for (let off = 16; off < 256; off += 16) tryOffsets.push(off);
  }

  for (const off of tryOffsets) {
    const slice = bytes.subarray(off);
    const inflated = tryInflate(slice);
    if (inflated && inflated.length > 512) {
      try {
        return await parseBoardFile(toArrayBuffer(inflated), 'inner_from_alz.brd');
      } catch {}
    }
  }

  const magicOff = findBoardMagic(bytes);
  if (magicOff >= 0) {
    const slice = bytes.subarray(magicOff);
    return parseBoardFile(toArrayBuffer(slice), 'inner_from_alz.brd');
  }

  if (bytes.length > 4) {
    const payload = bytes.subarray(4);
    const inflated = tryInflate(payload);
    if (inflated) {
      return parseBoardFile(toArrayBuffer(inflated), 'inner_from_alz.brd');
    }
  }

  throw new Error('Failed to extract boardview from ALZ archive: no inner file found or decompression failed');
}
