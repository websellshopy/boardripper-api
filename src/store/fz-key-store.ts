import { Emitter } from './emitter';
import { validateFZKey } from '../parsers/fz-parser';
import { log } from './log-store';

/**
 * Node.js-compatible FZ key store for the API service.
 * Fetches the key from GitHub on demand instead of using localStorage.
 */

export const FZ_KEY_SOURCES: Array<{ url: string; label: string }> = [
  {
    url: 'https://raw.githubusercontent.com/cryptonek/illegal-numbers/main/FZkey.md',
    label: 'github.com/cryptonek/illegal-numbers',
  },
  {
    url: 'https://raw.githubusercontent.com/yliu-d/illegal-numbers/main/FZkey.md',
    label: 'github.com/yliu-d/illegal-numbers (mirror)',
  },
];

export function parseFzKeyText(text: string): Uint32Array | null {
  const tokens = text.match(/0x[0-9a-fA-F]{1,8}|[0-9a-fA-F]{8}/g) ?? [];
  if (tokens.length < 44) return null;
  const out = new Uint32Array(44);
  for (let i = 0; i < 44; i++) {
    const t = tokens[i].toLowerCase().startsWith('0x') ? tokens[i].slice(2) : tokens[i];
    out[i] = parseInt(t, 16) >>> 0;
  }
  return out;
}

export function formatFzKey(key: Uint32Array): string {
  const lines: string[] = [];
  for (let i = 0; i < key.length; i += 4) {
    const row: string[] = [];
    for (let j = 0; j < 4 && i + j < key.length; j++) {
      row.push('0x' + key[i + j].toString(16).padStart(8, '0'));
    }
    lines.push(row.join('  '));
  }
  return lines.join('\n');
}

class FZKeyStore extends Emitter {
  key: Uint32Array | null = null;
  private _fetching: Promise<Uint32Array | null> | null = null;

  hasKey(): boolean {
    return this.key !== null;
  }

  async fetchKey(): Promise<Uint32Array | null> {
    if (this.key) return this.key;
    if (this._fetching) return this._fetching;

    this._fetching = this._doFetch();
    const result = await this._fetching;
    this._fetching = null;
    return result;
  }

  private async _doFetch(): Promise<Uint32Array | null> {
    for (const src of FZ_KEY_SOURCES) {
      try {
        const res = await fetch(src.url);
        if (!res.ok) {
          log.parser.warn('FZ key fetch failed:', src.label, `HTTP ${res.status}`);
          continue;
        }
        const body = await res.text();
        const key = parseFzKeyText(body);
        if (key && validateFZKey(key)) {
          this.key = key;
          log.parser.log('FZ key loaded from:', src.label);
          return key;
        }
        log.parser.warn('FZ key parity check failed:', src.label);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log.parser.warn('FZ key fetch error:', src.label, msg);
      }
    }
    log.parser.error('Could not fetch FZ key from any source');
    return null;
  }
}

export const fzKeyStore = new FZKeyStore();

export function getFzKey(): Uint32Array | null {
  return fzKeyStore.key;
}
