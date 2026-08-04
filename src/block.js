import * as THREE from 'three';

const BLOCK_SIZE = 1;

const materialCache = new Map();

function getBlockMaterial(color) {
  if (materialCache.has(color)) return materialCache.get(color);

  const hex = parseInt(color.replace('#', ''), 16);
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;

  // Slightly desaturate for a more natural look
  const avg = (r + g + b) / 3;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sr = lerp(r, avg, 0.1);
  const sg = lerp(g, avg, 0.1);
  const sb = lerp(b, avg, 0.1);

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(sr, sg, sb),
    roughness: 0.75,
    metalness: 0.05,
    envMapIntensity: 0.4,
  });
  materialCache.set(color, mat);
  return mat;
}

const BLOCK_GEO = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

export class BlockWorld {
  constructor(scene, gridSize, gridHeight) {
    this.scene = scene;
    this.gridSize = gridSize;
    this.gridHeight = gridHeight;
    this.blocks = new Map(); // key: "x,y,z" -> { mesh, color }
  }

  _key(x, y, z) {
    return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
  }

  hasBlock(x, y, z) {
    return this.blocks.has(this._key(x, y, z));
  }

  placeBlock(x, y, z, color) {
    x = Math.round(x);
    y = Math.round(y);
    z = Math.round(z);

    if (y < 0 || y >= this.gridHeight) return false;
    if (Math.abs(x) > this.gridSize / 2 || Math.abs(z) > this.gridSize / 2) return false;

    const key = this._key(x, y, z);
    if (this.blocks.has(key)) return false;

    const mesh = new THREE.Mesh(BLOCK_GEO, getBlockMaterial(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { blockKey: key, color };
    this.scene.add(mesh);

    this.blocks.set(key, { mesh, color });
    return true;
  }

  removeBlock(x, y, z) {
    const key = this._key(x, y, z);
    const entry = this.blocks.get(key);
    if (!entry) return false;

    this.scene.remove(entry.mesh);
    this.blocks.delete(key);
    return true;
  }

  clearAll() {
    for (const { mesh } of this.blocks.values()) {
      this.scene.remove(mesh);
    }
    this.blocks.clear();
  }

  getBlockCount() {
    return this.blocks.size;
  }

  serialize() {
    const data = [];
    for (const [key, { color }] of this.blocks) {
      const [x, y, z] = key.split(',').map(Number);
      data.push({ x, y, z, color });
    }
    return { version: 1, blocks: data };
  }

  deserialize(data) {
    this.clearAll();
    if (!data || !data.blocks) return;
    for (const { x, y, z, color } of data.blocks) {
      this.placeBlock(x, y, z, color);
    }
  }

  // Returns intersection info for raycasting
  getMeshes() {
    return [...this.blocks.values()].map(b => b.mesh);
  }
}
