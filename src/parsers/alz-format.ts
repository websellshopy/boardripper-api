import type { FormatDescriptor } from './registry.js';
import { parseALZ } from './alz-parser.js';

// ALZ is a Korean archive format (ESTsoft) often used to distribute boardview files.
// In boardview context, .alz files are typically containers holding a single inner board file
// (e.g., .brd, .bvr, .fz) compressed with deflate. Some .alz files are simply renamed zip/deflate streams.
// Detection: header starts with "ALZ\x01" (ALZ v1) or "ALZ" magic, or file extension .alz
const ALZ_MAGIC = [0x41, 0x4c, 0x5a, 0x01]; // "ALZ\x01"
const ALZ_MAGIC_ALT = [0x41, 0x4c, 0x5a]; // "ALZ"

export const ALZFormat: FormatDescriptor = {
  id: 'ALZ',
  name: 'ALZ (ESTsoft Archive)',
  extensions: ['.alz'],
  description: 'ALZ archive container holding boardview files. Decompressed and delegated to inner format parser.',
  docUrl: 'docs/formats/ALZ_FORMAT.md',
  flipY: false,

  detect(header) {
    if (header.length < 3) return false;
    if (header[0] === ALZ_MAGIC[0] && header[1] === ALZ_MAGIC[1] && header[2] === ALZ_MAGIC[2]) return true;
    // Also detect as ALZ if it looks like a deflate stream but has .alz extension fallback will handle
    return false;
  },

  parse(buffer) {
    return parseALZ(buffer);
  },
};
