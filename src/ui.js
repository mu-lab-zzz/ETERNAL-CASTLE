export class UI {
  constructor(game) {
    this.game = game;
  }

  init() {
    this._setupBlockPalette();
    this._setupActionButtons();
    this._setupModal();
    this._addPointerHint();
  }

  _setupBlockPalette() {
    const btns = document.querySelectorAll('.block-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.dataset.color;
        const name = btn.dataset.name;
        this.game.setSelectedColor(color);
        const nameEl = document.getElementById('selected-block-name');
        if (nameEl) nameEl.textContent = `選択中: ${name}`;
      });
    });
  }

  _setupActionButtons() {
    document.getElementById('btn-clear').addEventListener('click', () => {
      this._confirm('全てのブロックを削除しますか？', () => {
        this.game.clearAll();
      });
    });

    document.getElementById('btn-save').addEventListener('click', () => {
      const data = this.game.serialize();
      const json = JSON.stringify(data);
      localStorage.setItem('eternalCastleSave', json);
      this._notify('保存しました！', `${data.blocks.length} ブロックを保存しました。`);
    });

    document.getElementById('btn-load').addEventListener('click', () => {
      const json = localStorage.getItem('eternalCastleSave');
      if (!json) {
        this._notify('セーブデータなし', 'まだ保存されたデータがありません。');
        return;
      }
      try {
        const data = JSON.parse(json);
        this._confirm(`${data.blocks.length} ブロックを読み込みますか？<br>現在の作業は上書きされます。`, () => {
          this.game.deserialize(data);
        });
      } catch {
        this._notify('エラー', 'セーブデータの読み込みに失敗しました。');
      }
    });

    document.getElementById('btn-screenshot').addEventListener('click', () => {
      const dataURL = this.game.screenshot();
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `eternal-castle-${Date.now()}.png`;
      a.click();
    });
  }

  _setupModal() {
    document.getElementById('modal-cancel').addEventListener('click', () => {
      this._closeModal();
    });
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) {
        this._closeModal();
      }
    });
  }

  _addPointerHint() {
    const hint = document.createElement('div');
    hint.id = 'pointer-hint';
    hint.textContent = 'クリックして操作開始';
    document.getElementById('hud').appendChild(hint);
  }

  _openModal(title, body, onConfirm, hideCancel = false) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-cancel').style.display = hideCancel ? 'none' : '';
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');

    const confirmBtn = document.getElementById('modal-confirm');
    const handler = () => {
      confirmBtn.removeEventListener('click', handler);
      this._closeModal();
      if (onConfirm) onConfirm();
    };
    confirmBtn.addEventListener('click', handler);
  }

  _closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  _confirm(message, onConfirm) {
    this._openModal('確認', message, onConfirm);
  }

  _notify(title, message) {
    this._openModal(title, message, null, true);
  }
}
