import type { BoardData } from './types.js';
import { registerFormat, detectFormat, detectByExtension, getAllFormats } from './registry.js';
import { BVR1Format } from './bvr1-format.js';
import { BVR3Format } from './bvr3-format.js';
import { BRDFormat } from './brd-format.js';
import { FZFormat } from './fz-format.js';
import { CADFormat } from './cad-format.js';
import { MentorNeutralFormat } from './mentor-neutral-format.js';
import { XZZFormat } from './xzz-format.js';
import { TVWFormat } from './tvw-format.js';
import { AllegroBRDFormat } from './allegro-brd-format.js';
import { BDVFormat } from './bdv-format.js';
import { BDVAscFormat } from './bdv-asc-format.js';
import { ALZFormat } from './alz-format.js';
import { ASCFormat } from './asc-format.js';

// Register all known formats in detection-priority order.
// Content-based detection runs in this order; the first match wins.
registerFormat(ALZFormat);
registerFormat(BVR1Format);
registerFormat(BVR3Format);
registerFormat(BDVAscFormat);
registerFormat(BDVFormat);
registerFormat(ASCFormat);
registerFormat(AllegroBRDFormat);
registerFormat(BRDFormat);
registerFormat(FZFormat);
registerFormat(MentorNeutralFormat);
registerFormat(CADFormat);
registerFormat(XZZFormat);
registerFormat(TVWFormat);

export type { BoardData, BoardRevision, BomAlternateCluster, GhostComponent, Part, Pin, Net, Point, BBox, Pad, SilkscreenPath, Trace, Via } from './types.js';
export { computeBBox, buildNets, bomReasonLabel } from './types.js';
export type { FormatDescriptor, FormatId } from './registry.js';
export { getFormat, getAllFormats, getAllExtensions, getFileExtension } from './registry.js';
export { exportToBVR3 } from './export-bvr3.js';

export async function parseBoardFile(buffer: ArrayBuffer, fileName?: string): Promise<BoardData> {
  const header = new Uint8Array(buffer, 0, Math.min(512, buffer.byteLength));
  let fmt = detectFormat(header);
  if (!fmt && fileName) {
    fmt = detectByExtension(fileName);
  }
  if (!fmt) {
    const ids = getAllFormats().map(f => f.id).join(', ');
    throw new Error(`Unknown board file format. Supported: ${ids}`);
  }
  return fmt.parse(buffer);
}
