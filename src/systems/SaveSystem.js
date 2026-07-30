const SAVE_KEY = 'endless_castle_save';

class SaveSystem {
  save(state) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        ...state,
        timestamp: Date.now(),
      }));
    } catch (e) { /* storage unavailable */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
  }
}
