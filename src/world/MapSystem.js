// 2D minimap rendered on a canvas overlay
class MapSystem {
  constructor() {
    this.discovered = new Set();
    this.rooms = [];
    this._canvas = null;
    this._ctx    = null;
    this._visible = false;
    this._setupCanvas();
    this._setupKey();
  }

  _setupCanvas() {
    const c = document.createElement('canvas');
    c.width  = 200;
    c.height = 200;
    Object.assign(c.style, {
      position: 'fixed', bottom: '30px', right: '30px',
      opacity: '0', transition: 'opacity 0.3s',
      border: '1px solid rgba(150,120,80,0.3)',
      background: 'rgba(5,4,3,0.85)',
      zIndex: '10', pointerEvents: 'none',
    });
    document.body.appendChild(c);
    this._canvas = c;
    this._ctx    = c.getContext('2d');
  }

  _setupKey() {
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyM') {
        this._visible = !this._visible;
        this._canvas.style.opacity = this._visible ? '1' : '0';
      }
    });
  }

  registerRooms(rooms) {
    this.rooms = rooms;
  }

  update(playerPos) {
    if (!this._visible) return;
    const ctx = this._ctx;
    ctx.clearRect(0, 0, 200, 200);

    const scale = 5;
    const ox = 100, oy = 100;

    // Draw known rooms
    this.rooms.forEach(r => {
      const key = r.id;
      const inRange = Math.hypot(r.x * 4 - playerPos.x, r.z * 4 - playerPos.z) < 25;
      if (inRange) this.discovered.add(key);
      if (!this.discovered.has(key)) return;

      ctx.fillStyle = 'rgba(40,30,20,0.9)';
      ctx.strokeStyle = 'rgba(120,90,50,0.6)';
      ctx.lineWidth = 1;

      const rx = ox + r.x * scale;
      const ry = oy + r.z * scale;
      const rw = r.w * scale * 4;
      const rd = r.d * scale * 4;
      ctx.fillRect(rx - rw/2, ry - rd/2, rw, rd);
      ctx.strokeRect(rx - rw/2, ry - rd/2, rw, rd);

      // Label
      ctx.fillStyle = 'rgba(150,120,70,0.6)';
      ctx.font = '6px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(r.label || '', rx, ry);
    });

    // Player dot
    const px = ox + playerPos.x / (4 / scale);
    const py = oy + playerPos.z / (4 / scale);
    ctx.fillStyle = '#c8b08c';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Border label
    ctx.fillStyle = 'rgba(100,80,40,0.5)';
    ctx.font = '8px Georgia';
    ctx.textAlign = 'left';
    ctx.fillText('MAP [M]', 4, 10);
  }
}
