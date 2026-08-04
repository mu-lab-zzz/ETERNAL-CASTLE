const STORAGE_SLOTS = 5;
const KEY_PREFIX = 'ec_save_';

export class SaveManager {
  constructor(world) {
    this.world = world;
  }

  save(slot = 0) {
    const data = this.world.serialize();
    data.savedAt = new Date().toISOString();
    data.blockCount = data.blocks.length;
    try {
      localStorage.setItem(KEY_PREFIX + slot, JSON.stringify(data));
      return true;
    } catch { return false; }
  }

  load(slot = 0) {
    const raw = localStorage.getItem(KEY_PREFIX + slot);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      this.world.deserialize(data);
      return data;
    } catch { return null; }
  }

  getSaveMeta() {
    const metas = [];
    for (let i = 0; i < STORAGE_SLOTS; i++) {
      const raw = localStorage.getItem(KEY_PREFIX + i);
      if (!raw) { metas.push(null); continue; }
      try {
        const d = JSON.parse(raw);
        metas.push({ slot: i, blockCount: d.blockCount ?? d.blocks?.length ?? 0, savedAt: d.savedAt });
      } catch { metas.push(null); }
    }
    return metas;
  }

  exportJSON() {
    const data = this.world.serialize();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `eternal-castle-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          this.world.deserialize(data);
          resolve(data);
        } catch { reject(new Error('無効なファイルです')); }
      };
      reader.readAsText(file);
    });
  }

  generateShareData() {
    const data = this.world.serialize();
    // Compact the data for QR code
    const compact = data.blocks.map(b =>
      `${b.ax},${b.ay},${b.az},${b.t},${b.r},${encodeColor(b.c)},${encodeMat(b.m)}`
    ).join(';');
    return compact;
  }
}

const COLOR_TABLE = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e8c','#ffffff','#bdc3c7','#7f8c8d','#2c3e50','#d35400','#27ae60','#2980b9','#f39c12'];
const MAT_TABLE   = ['basic','metallic','gold','glass','glow'];

function encodeColor(c) { const i = COLOR_TABLE.indexOf(c); return i >= 0 ? i : c; }
function encodeMat(m)   { const i = MAT_TABLE.indexOf(m);   return i >= 0 ? i : 0; }
