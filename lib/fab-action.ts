/**
 * Sistema simples para que telas registrem uma ação customizada
 * para o FAB central da navbar, enquanto estiverem em foco.
 */

type FabListener = () => void;

let _listener: FabListener | null = null;

export function setFabListener(fn: FabListener | null) {
  _listener = fn;
}

export function callFabListener(): boolean {
  if (_listener) {
    _listener();
    return true;
  }
  return false;
}
