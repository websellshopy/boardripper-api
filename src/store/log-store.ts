import { Emitter } from './emitter';

export type LogLevel = 'log' | 'warn' | 'error';
export type LogScope = 'parser' | 'render' | 'pdf' | 'scan' | 'ui' | 'cache' | 'perf' | 'update' | 'obd' | 'cloud' | 'twoWindow';

export interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  scope: LogScope;
  message: string;
}

class LogStore extends Emitter {
  private _entries: LogEntry[] = [];
  private _nextId = 1;
  private _orig = {
    log:   console.log.bind(console),
    warn:  console.warn.bind(console),
    error: console.error.bind(console),
  };

  enabled = true;

  private _push!: (level: LogLevel, scope: LogScope, args: unknown[]) => void;

  constructor() {
    super();
    const push = (level: LogLevel, scope: LogScope, args: unknown[]) => {
      if (!this.enabled) return;
      const message = args.map(a => {
        if (a instanceof Error) return a.stack ?? a.message;
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch { return String(a); } }
        return String(a);
      }).join(' ');
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;
      this._entries.push({ id: this._nextId++, time, level, scope, message });
      if (this._entries.length > 600) this._entries = this._entries.slice(-500);
    };
    this._push = push;
  }

  createScopedLogger(scope: LogScope) {
    return {
      log: (...args: unknown[]) => { this._orig.log(`[${scope}]`, ...args); this._push('log', scope, args); },
      warn: (...args: unknown[]) => { this._orig.warn(`[${scope}]`, ...args); this._push('warn', scope, args); },
      error: (...args: unknown[]) => { this._orig.error(`[${scope}]`, ...args); this._push('error', scope, args); },
    };
  }

  getSnapshot(): LogEntry[] {
    return [...this._entries];
  }

  clear() {
    this._entries = [];
  }
}

export const logStore = new LogStore();

export const log = {
  parser: logStore.createScopedLogger('parser'),
  render: logStore.createScopedLogger('render'),
  pdf:    logStore.createScopedLogger('pdf'),
  scan:   logStore.createScopedLogger('scan'),
  ui:     logStore.createScopedLogger('ui'),
  cache:  logStore.createScopedLogger('cache'),
  perf:   logStore.createScopedLogger('perf'),
  update: logStore.createScopedLogger('update'),
  obd:    logStore.createScopedLogger('obd'),
  cloud:  logStore.createScopedLogger('cloud'),
  twoWindow: logStore.createScopedLogger('twoWindow'),
};
