import type { FormatDescriptor } from './registry.js';
import { parseASC } from './asc-parser.js';

/**
 * ASC — Plain-text boardview format with .asc extension.
 * Common in older boardview tools (e.g., Landrex, .asc files).
 * Structure similar to BDV but with ASC-specific headers:
 * - First line often "FORMAT: ..." or "BOARD: ..." or "ASC"
 * - Sections: PARTS, PINS, NETS, etc. in plain text
 * Detection: looks for ASC signatures within first 512 bytes
 */

export const ASCFormat: FormatDescriptor = {
  id: 'ASC',
  name: 'ASC (Plain-Text Boardview)',
  extensions: ['.asc'],
  description: 'Plain-text ASC boardview format (Landrex and compatible tools). Human-readable with PARTS/PINS/NETS sections.',
  docUrl: 'docs/formats/ASC_FORMAT.md',
  flipY: true,

  detect(header: Uint8Array): boolean {
    const text = new TextDecoder('ascii').decode(header);
    // Check for ASC signatures
    if (/^\s*FORMAT\s*:/im.test(text)) return true;
    if (/^\s*BOARD\s*:/im.test(text)) return true;
    if (/^\s*ASC\s*$/im.test(text)) return true;
    if (/PARTS\s*:/i.test(text) && /PINS\s*:/i.test(text)) return true;
    // Some .asc files start with component list like "C1, R1, U1"
    if (/^[A-Z]+\d+\s*,/m.test(text) && text.includes(',')) return true;
    return false;
  },

  parse(buffer: ArrayBuffer) {
    return parseASC(buffer);
  },
};
