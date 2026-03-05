/**
 * Global app mode tracker.
 * Tracks whether the user is in 'personal' (expenses) or 'uber' mode.
 * Used to redirect the home tab correctly.
 */
let _mode: 'personal' | 'uber' = 'personal';

export function setAppMode(mode: 'personal' | 'uber') {
  _mode = mode;
}

export function getAppMode(): 'personal' | 'uber' {
  return _mode;
}
