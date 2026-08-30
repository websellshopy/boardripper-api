import type { BoardData, Part, Pin, Net, Point, BBox } from './types.js';
import { computeBBox, buildNets } from './types.js';

function parsePoint(str: string): Point | null {
  const parts = str.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  if (parts.length >= 2) return { x: parts[0], y: parts[1] };
  return null;
}

export function parseASC(buffer: ArrayBuffer): BoardData {
  const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
  const lines = text.split(/\r?\n/);
  
  const parts: Part[] = [];
  const nets = new Map<string, Net>();
  const partMap = new Map<string, number>();

  let section: 'none' | 'parts' | 'pins' | 'nets' = 'none';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    const upper = line.toUpperCase();
    if (upper.startsWith('FORMAT:') || upper.startsWith('BOARD:') || upper === 'ASC') {
      continue;
    }
    if (/^PARTS\s*:?/i.test(line)) { section = 'parts'; continue; }
    if (/^PINS\s*:?/i.test(line)) { section = 'pins'; continue; }
    if (/^NETS\s*:?/i.test(line)) { section = 'nets'; continue; }
    if (/^NAILS\s*:?/i.test(line)) { section = 'none'; continue; }
    if (/^-+$/.test(line)) continue;

    if (section === 'parts' || section === 'none') {
      const m = line.match(/^([A-Z]+\d+)[\s,]+(.+)$/i);
      if (m) {
        const name = m[1].toUpperCase();
        const rest = m[2];
        const nums = rest.match(/-?\d+(\.\d+)?/g);
        let origin: Point = { x: 0, y: 0 };
        if (nums && nums.length >= 2) {
          origin = { x: parseFloat(nums[0]), y: parseFloat(nums[1]) };
        }
        if (line.includes(':') && line.includes(',')) {
          section = 'nets';
        } else {
          const part: Part = {
            name,
            side: 'top',
            type: 'smd',
            origin,
            pins: [],
            bounds: { minX: origin.x - 10, minY: origin.y - 10, maxX: origin.x + 10, maxY: origin.y + 10 },
            meta: { partType: 'unknown' },
          };
          partMap.set(name, parts.length);
          parts.push(part);
          continue;
        }
      }
    }

    if (section === 'nets' || line.includes(':')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const netName = line.substring(0, colonIdx).trim();
        const pinList = line.substring(colonIdx + 1).split(',').map(s => s.trim()).filter(Boolean);
        const pinIndices: Array<{ partIndex: number; pinIndex: number }> = [];
        for (const pinStr of pinList) {
          const pm = pinStr.match(/^([A-Z]+\d+)[-.:](\d+)$/i);
          if (pm) {
            const partName = pm[1].toUpperCase();
            const pinNum = pm[2];
            const partIdx = partMap.get(partName);
            if (partIdx !== undefined) {
              const part = parts[partIdx];
              let pinIdx = part.pins.findIndex(p => p.number === pinNum);
              if (pinIdx === -1) {
                const newPin: Pin = {
                  name: `P${pinNum}`,
                  number: pinNum,
                  position: { ...part.origin },
                  radius: 2,
                  side: part.side === 'both' ? 'top' : part.side as 'top' | 'bottom',
                  net: netName,
                };
                part.pins.push(newPin);
                pinIdx = part.pins.length - 1;
              } else {
                part.pins[pinIdx].net = netName;
              }
              pinIndices.push({ partIndex: partIdx, pinIndex: pinIdx });
            }
          }
        }
        if (netName && pinIndices.length > 0) {
          nets.set(netName, { name: netName, pinIndices });
        }
      }
    }
  }

  if (parts.length === 0) {
    const refdesRegex = /\b([A-Z]+\d+)\b/g;
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = refdesRegex.exec(text)) !== null) {
      const name = match[1].toUpperCase();
      if (!seen.has(name) && partMap.get(name) === undefined) {
        seen.add(name);
        const part: Part = {
          name,
          side: 'top',
          type: 'smd',
          origin: { x: Math.random() * 1000, y: Math.random() * 1000 },
          pins: [],
          bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        };
        partMap.set(name, parts.length);
        parts.push(part);
      }
    }
    if (parts.length === 0) {
      throw new Error('ASC parse failed: no components found');
    }
  }

  if (nets.size === 0) {
    for (let i = 0; i < parts.length; i++) {
      for (let j = 0; j < parts[i].pins.length; j++) {
        const pin = parts[i].pins[j];
        if (!pin.net) pin.net = '';
        if (pin.net && !nets.has(pin.net)) {
          nets.set(pin.net, { name: pin.net, pinIndices: [] });
        }
        if (pin.net) nets.get(pin.net)!.pinIndices.push({ partIndex: i, pinIndex: j });
      }
    }
  }

  const bounds = computeBBox(parts.map(p => p.origin));

  const boardData: BoardData = {
    format: 'ASC',
    parts,
    nets,
    bounds,
    outline: [
      { x: bounds.minX - 10, y: bounds.minY - 10 },
      { x: bounds.maxX + 10, y: bounds.minY - 10 },
      { x: bounds.maxX + 10, y: bounds.maxY + 10 },
      { x: bounds.minX - 10, y: bounds.maxY + 10 },
    ],
    nails: [],
  };

  return boardData;
}
