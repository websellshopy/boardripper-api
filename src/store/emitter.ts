type Listener = () => void;

export class Emitter {
  private _listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  protected notify() {
    for (const l of this._listeners) l();
  }
}
