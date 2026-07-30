class UIManager {
  constructor() {
    this._msgTimeout = null;
    this._enemyHpTimeout = null;
    this._combatLog = [];
    this._vigTimeout = null;
  }

  showMessage(text, duration = 3000) {
    const el = document.getElementById('message');
    el.innerHTML = text.replace(/\n/g, '<br>');
    el.style.opacity = '1';
    clearTimeout(this._msgTimeout);
    this._msgTimeout = setTimeout(() => { el.style.opacity = '0'; }, duration);
  }

  showHit() {
    const vignette = document.getElementById('vignette');
    vignette.classList.add('hit');
    clearTimeout(this._vigTimeout);
    this._vigTimeout = setTimeout(() => vignette.classList.remove('hit'), 400);
  }

  showEnemyHP(name, pct) {
    const el   = document.getElementById('enemy-hp');
    const fill = document.getElementById('enemy-hp-fill');
    const nameEl = document.getElementById('enemy-name');
    el.style.display = 'block';
    nameEl.textContent = name;
    fill.style.width   = `${Math.max(0, pct * 100)}%`;
    clearTimeout(this._enemyHpTimeout);
    this._enemyHpTimeout = setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  updateStats(hpPct, stPct, mpPct) {
    document.getElementById('hp-fill').style.width = `${hpPct * 100}%`;
    document.getElementById('st-fill').style.width = `${stPct * 100}%`;
    document.getElementById('mp-fill').style.width = `${mpPct * 100}%`;
  }

  updateInventory(items) {
    const list = document.getElementById('inv-list');
    if (!items.length) {
      list.innerHTML = '<div class="inv-item" style="color:#3a2a1a">何もない。</div>';
      return;
    }
    list.innerHTML = items.map(item =>
      `<div class="inv-item">
        <div class="item-name">${item.icon || '▪'} ${item.name}</div>
        <div class="item-desc">${item.desc}</div>
      </div>`
    ).join('');
  }

  update(dt) {
    // Reserved for future timed UI events
  }
}
