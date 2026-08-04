import { BLOCK_TYPES } from './block-defs.js';
import { COLORS, MATERIAL_PRESETS } from './materials.js';
import { MODE } from './builder.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.builder = game.builder;
    this.saver   = game.saver;
  }

  init() {
    this._buildBlockPicker();
    this._buildColorPicker();
    this._buildMaterialPicker();
    this._bindModeButtons();
    this._bindActionButtons();
    this._bindSaveLoad();
    this._setMode(MODE.BUILD);
  }

  // ── Block picker ────────────────────────────────────────────────
  _buildBlockPicker() {
    const container = document.getElementById('block-picker');
    BLOCK_TYPES.forEach(type => {
      const btn = document.createElement('button');
      btn.className = 'pick-btn' + (type.id === 'cube' ? ' active' : '');
      btn.dataset.id = type.id;
      btn.innerHTML = `<span class="pick-icon">${type.icon}</span><span class="pick-label">${type.name}</span>`;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.builder.setType(type.id);
      });
      container.appendChild(btn);
    });
  }

  // ── Color picker ─────────────────────────────────────────────────
  _buildColorPicker() {
    const container = document.getElementById('color-picker');
    COLORS.forEach(({ hex, name }) => {
      const btn = document.createElement('button');
      btn.className = 'color-swatch' + (hex === '#e74c3c' ? ' active' : '');
      btn.title = name;
      btn.style.setProperty('--c', hex);
      btn.addEventListener('click', () => {
        container.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.builder.setColor(hex);
        document.getElementById('selected-color').style.background = hex;
      });
      container.appendChild(btn);
    });
  }

  // ── Material picker ───────────────────────────────────────────────
  _buildMaterialPicker() {
    const container = document.getElementById('mat-picker');
    MATERIAL_PRESETS.forEach(({ id, name, icon }) => {
      const btn = document.createElement('button');
      btn.className = 'mat-btn' + (id === 'basic' ? ' active' : '');
      btn.innerHTML = `${icon}<span>${name}</span>`;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.mat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.builder.setPreset(id);
      });
      container.appendChild(btn);
    });
  }

  // ── Mode buttons ─────────────────────────────────────────────────
  _bindModeButtons() {
    const modeMap = {
      'btn-navigate': MODE.NAVIGATE,
      'btn-build':    MODE.BUILD,
      'btn-erase':    MODE.ERASE,
    };
    Object.entries(modeMap).forEach(([id, mode]) => {
      document.getElementById(id)?.addEventListener('click', () => this._setMode(mode));
    });

    document.getElementById('btn-rotate')?.addEventListener('click', () => {
      this.builder.rotateBlock();
      const rotEl = document.getElementById('rot-label');
      if (rotEl) rotEl.textContent = `${this.builder.rotY}°`;
    });

    document.getElementById('btn-place')?.addEventListener('click', () => {
      this.builder.placeAtCenter();
    });

    document.getElementById('btn-erase-center')?.addEventListener('click', () => {
      this.builder.eraseAtCenter();
    });
  }

  _setMode(mode) {
    this.builder.setMode(mode);
    ['navigate', 'build', 'erase'].forEach(m => {
      document.getElementById(`btn-${m}`)?.classList.toggle('active', mode === MODE[m.toUpperCase()]);
    });
    document.getElementById('build-actions')?.classList.toggle('hidden', mode !== MODE.BUILD);
    document.getElementById('erase-actions')?.classList.toggle('hidden', mode !== MODE.ERASE);
    document.getElementById('crosshair')?.classList.toggle('hidden', mode === MODE.NAVIGATE);
  }

  // ── Action buttons ────────────────────────────────────────────────
  _bindActionButtons() {
    document.getElementById('btn-grid')?.addEventListener('click', () => {
      this.game.toggleGrid();
    });

    document.getElementById('btn-screenshot')?.addEventListener('click', () => {
      const url = this.game.screenshot();
      const a = document.createElement('a');
      a.href = url;
      a.download = `eternal-castle-${Date.now()}.png`;
      a.click();
    });

    document.getElementById('btn-clear')?.addEventListener('click', () => {
      this._confirm('全てのブロックを消去しますか？', () => {
        this.game.world.clearAll();
        this._updateCount(0);
      });
    });
  }

  // ── Save / Load ───────────────────────────────────────────────────
  _bindSaveLoad() {
    document.getElementById('btn-save')?.addEventListener('click', () => {
      const ok = this.saver.save(0);
      this._toast(ok ? `💾 保存しました (${this.game.world.getBlockCount()} ブロック)` : '保存失敗');
    });

    document.getElementById('btn-load')?.addEventListener('click', () => {
      const metas = this.saver.getSaveMeta();
      const meta  = metas[0];
      if (!meta) { this._toast('セーブデータがありません'); return; }
      this._confirm(
        `スロット1 (${meta.blockCount}ブロック) を読み込みますか？<br><small>${new Date(meta.savedAt).toLocaleString()}</small>`,
        () => {
          const data = this.saver.load(0);
          if (data) this._updateCount(this.game.world.getBlockCount());
        }
      );
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.saver.exportJSON();
    });

    document.getElementById('btn-import')?.addEventListener('click', () => {
      document.getElementById('file-input')?.click();
    });

    document.getElementById('file-input')?.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await this.saver.importJSON(file);
        this._updateCount(this.game.world.getBlockCount());
        this._toast('📂 読み込みました');
      } catch { this._toast('読み込み失敗'); }
      e.target.value = '';
    });

    // QR share
    document.getElementById('btn-qr')?.addEventListener('click', () => {
      this._showQR();
    });
  }

  _showQR() {
    const count = this.game.world.getBlockCount();
    if (count === 0) { this._toast('ブロックがありません'); return; }

    const overlay = document.getElementById('modal-overlay');
    const title   = document.getElementById('modal-title');
    const body    = document.getElementById('modal-body');

    title.textContent = 'QRコード共有';
    body.innerHTML = `
      <p style="margin-bottom:12px;font-size:13px;">作品データ (${count}ブロック)</p>
      <div id="qr-output" style="display:flex;justify-content:center;padding:12px;background:#fff;border-radius:8px;"></div>
      <p style="margin-top:10px;font-size:11px;opacity:.6;">QRコードを読み込むとデータが確認できます</p>
    `;
    document.getElementById('modal-cancel').style.display = 'none';
    overlay.classList.remove('hidden');

    const shareData = this.saver.generateShareData();
    if (window.QRCode) {
      new window.QRCode(document.getElementById('qr-output'), {
        text: shareData.slice(0, 2048),  // Limit for QR size
        width: 200, height: 200,
        correctLevel: window.QRCode.CorrectLevel.L,
      });
    } else {
      document.getElementById('qr-output').textContent = '(QRライブラリ未ロード)';
    }

    const confirmBtn = document.getElementById('modal-confirm');
    const handler = () => {
      confirmBtn.removeEventListener('click', handler);
      overlay.classList.add('hidden');
      document.getElementById('modal-cancel').style.display = '';
    };
    confirmBtn.addEventListener('click', handler);
    confirmBtn.textContent = '閉じる';
  }

  _updateCount(n) {
    const el = document.getElementById('block-count');
    if (el) el.textContent = `ブロック: ${n}`;
  }

  _toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2500);
  }

  _confirm(msg, onOk) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = '確認';
    document.getElementById('modal-body').innerHTML = msg;
    document.getElementById('modal-cancel').style.display = '';
    document.getElementById('modal-confirm').textContent = 'OK';
    overlay.classList.remove('hidden');

    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn  = document.getElementById('modal-cancel');

    const cleanup = () => {
      overlay.classList.add('hidden');
      confirmBtn.removeEventListener('click', onYes);
      cancelBtn.removeEventListener('click', onNo);
    };
    const onYes = () => { cleanup(); onOk(); };
    const onNo  = () => cleanup();
    confirmBtn.addEventListener('click', onYes);
    cancelBtn.addEventListener('click', onNo);
  }
}
