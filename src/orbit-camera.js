
export class OrbitCamera {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;

    this.target = new THREE.Vector3(0, 2, 0);
    this.radius = 18;
    this.theta  = Math.PI / 4;   // horizontal angle
    this.phi    = Math.PI / 4;   // vertical angle (from top)

    this.minRadius = 3;
    this.maxRadius = 80;
    this.minPhi    = 0.08;
    this.maxPhi    = Math.PI / 2.05;

    this._prevTouches = {};
    this._prevPinch   = 0;
    this._mouseDown   = false;
    this._prevMouse   = { x: 0, y: 0 };

    this.onTap = null;  // (screenX, screenY) => void

    this._applyCamera();
    this._bind();
  }

  _applyCamera() {
    const x = this.target.x + this.radius * Math.sin(this.phi) * Math.sin(this.theta);
    const y = this.target.y + this.radius * Math.cos(this.phi);
    const z = this.target.z + this.radius * Math.sin(this.phi) * Math.cos(this.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  _orbit(dx, dy) {
    this.theta -= dx * 0.007;
    this.phi    = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi - dy * 0.007));
    this._applyCamera();
  }

  _zoom(delta) {
    this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius + delta));
    this._applyCamera();
  }

  _pan(dx, dy) {
    const right   = new THREE.Vector3();
    const up      = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    right.crossVectors(forward, up).normalize();
    const panSpeed = this.radius * 0.0018;
    this.target.addScaledVector(right, -dx * panSpeed);
    this.target.y += dy * panSpeed;
    this._applyCamera();
  }

  _bind() {
    const el = this.canvas;

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this._prevTouches[t.identifier] = {
          x: t.clientX, y: t.clientY,
          sx: t.clientX, sy: t.clientY,
          t0: Date.now(),
        };
      }
      if (Object.keys(this._prevTouches).length === 2) {
        const [a, b] = Object.values(this._prevTouches);
        this._prevPinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    }, { passive: false });

    el.addEventListener('touchmove', e => {
      e.preventDefault();
      const n = Object.keys(this._prevTouches).length;

      if (n === 1) {
        const t = e.changedTouches[0];
        const prev = this._prevTouches[t.identifier];
        if (prev) {
          this._orbit(t.clientX - prev.x, t.clientY - prev.y);
          prev.x = t.clientX;
          prev.y = t.clientY;
        }
      } else if (n >= 2) {
        // Update positions first for pinch calc
        for (const t of e.changedTouches) {
          if (this._prevTouches[t.identifier]) {
            this._prevTouches[t.identifier].x = t.clientX;
            this._prevTouches[t.identifier].y = t.clientY;
          }
        }
        const [a, b] = Object.values(this._prevTouches);
        const newPinch = Math.hypot(a.x - b.x, a.y - b.y);
        const delta = (this._prevPinch - newPinch) * 0.08;
        this._zoom(delta);
        this._prevPinch = newPinch;
      }
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const prev = this._prevTouches[t.identifier];
        if (prev) {
          const dt   = Date.now() - prev.t0;
          const dist = Math.hypot(t.clientX - prev.sx, t.clientY - prev.sy);
          if (dt < 280 && dist < 12 && this.onTap) {
            this.onTap(t.clientX, t.clientY);
          }
        }
        delete this._prevTouches[t.identifier];
      }
    }, { passive: false });

    // Mouse (desktop fallback)
    el.addEventListener('mousedown', e => {
      if (e.button === 2) {
        this._mouseDown = true;
        this._prevMouse = { x: e.clientX, y: e.clientY };
      }
    });
    window.addEventListener('mousemove', e => {
      if (!this._mouseDown) return;
      this._orbit(e.clientX - this._prevMouse.x, e.clientY - this._prevMouse.y);
      this._prevMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', e => { if (e.button === 2) this._mouseDown = false; });
    el.addEventListener('wheel', e => {
      e.preventDefault();
      this._zoom(e.deltaY * 0.03);
    }, { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  setTarget(v) {
    this.target.copy(v);
    this._applyCamera();
  }
}
