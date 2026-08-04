import * as THREE from 'three';
import {
  getBlockType, getBlockGeometry, getOccupiedCells,
  getMeshCenter, getEffectiveDims,
} from './block-defs.js';
import { getMaterial } from './materials.js';

export class BlockWorld {
  constructor(scene) {
    this.scene = scene;
    this.blocks = new Map();   // bkey → block data
    this.cellMap = new Map();  // "x,y,z" → bkey
  }

  _bkey(ax, ay, az) { return `${ax},${ay},${az}`; }
  _ckey(x, y, z)    { return `${x},${y},${z}`; }

  canPlace(anchor, typeId, rotY) {
    const type = getBlockType(typeId);
    for (const [x, y, z] of getOccupiedCells(anchor, type, rotY)) {
      if (y < 0 || y > 63) return false;
      if (this.cellMap.has(this._ckey(x, y, z))) return false;
    }
    return true;
  }

  place(anchor, typeId, rotY, color, preset) {
    if (!this.canPlace(anchor, typeId, rotY)) return null;

    const type  = getBlockType(typeId);
    const cells = getOccupiedCells(anchor, type, rotY);
    const center = getMeshCenter(anchor, type, rotY);
    const { w, h, d } = getEffectiveDims(type, rotY);
    const bkey  = this._bkey(anchor.x, anchor.y, anchor.z);

    const geo  = getBlockGeometry(type);
    const mat  = getMaterial(color, preset);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);
    mesh.scale.set(1, 1, 1);
    mesh.rotation.y = (rotY * Math.PI) / 180;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { bkey, typeId, rotY, color, preset };
    this.scene.add(mesh);

    // Snap pop animation
    mesh.scale.set(1.12, 1.12, 1.12);
    const start = performance.now();
    const animate = () => {
      const t = Math.min((performance.now() - start) / 120, 1);
      const s = 1 + 0.12 * (1 - t);
      mesh.scale.set(s, s, s);
      if (t < 1) requestAnimationFrame(animate);
      else mesh.scale.set(1, 1, 1);
    };
    requestAnimationFrame(animate);

    this.blocks.set(bkey, { anchor, typeId, rotY, color, preset, cells, mesh, bkey });
    for (const [x, y, z] of cells) this.cellMap.set(this._ckey(x, y, z), bkey);
    return bkey;
  }

  removeByMesh(mesh) {
    return this.removeByKey(mesh?.userData?.bkey);
  }

  removeByKey(bkey) {
    const b = this.blocks.get(bkey);
    if (!b) return false;
    this.scene.remove(b.mesh);
    for (const [x, y, z] of b.cells) this.cellMap.delete(this._ckey(x, y, z));
    this.blocks.delete(bkey);
    return true;
  }

  clearAll() {
    for (const { mesh } of this.blocks.values()) this.scene.remove(mesh);
    this.blocks.clear();
    this.cellMap.clear();
  }

  getBlockCount() { return this.blocks.size; }

  getMeshes() { return [...this.blocks.values()].map(b => b.mesh); }

  serialize() {
    const blocks = [];
    for (const b of this.blocks.values()) {
      blocks.push({
        ax: b.anchor.x, ay: b.anchor.y, az: b.anchor.z,
        t: b.typeId, r: b.rotY, c: b.color, m: b.preset,
      });
    }
    return { v: 2, blocks };
  }

  deserialize(data) {
    this.clearAll();
    if (!data?.blocks) return;
    for (const b of data.blocks) {
      this.place({ x: b.ax, y: b.ay, z: b.az }, b.t ?? 'cube', b.r ?? 0, b.c, b.m ?? 'basic');
    }
  }
}
