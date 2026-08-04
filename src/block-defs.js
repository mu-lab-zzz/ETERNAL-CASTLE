import * as THREE from 'three';

const GEO_CACHE = new Map();

export const BLOCK_TYPES = [
  { id: 'cube',    name: '1×1',    icon: '⬛', w: 1, h: 1, d: 1 },
  { id: 'brick2',  name: '2×1',    icon: '▬',  w: 2, h: 1, d: 1 },
  { id: 'brick3',  name: '3×1',    icon: '━',  w: 3, h: 1, d: 1 },
  { id: 'plate4x2',name: '4×2',    icon: '▭',  w: 4, h: 1, d: 2 },
  { id: 'tall',    name: '高×1×2', icon: '⬜', w: 1, h: 2, d: 1 },
  { id: 'wide2x2', name: '2×2',    icon: '◼',  w: 2, h: 1, d: 2 },
  { id: 'cylinder',name: '円柱',   icon: '⭕', w: 1, h: 1, d: 1, shape: 'cylinder' },
  { id: 'sphere',  name: '球',     icon: '🔵', w: 1, h: 1, d: 1, shape: 'sphere' },
];

export function getBlockType(id) {
  return BLOCK_TYPES.find(t => t.id === id) ?? BLOCK_TYPES[0];
}

export function getBlockGeometry(type) {
  if (GEO_CACHE.has(type.id)) return GEO_CACHE.get(type.id);

  let geo;
  if (type.shape === 'cylinder') {
    geo = new THREE.CylinderGeometry(0.43, 0.43, 0.97, 18);
  } else if (type.shape === 'sphere') {
    geo = new THREE.SphereGeometry(0.47, 18, 14);
  } else {
    geo = new THREE.BoxGeometry(type.w * 0.97, type.h * 0.97, type.d * 0.97);
  }

  GEO_CACHE.set(type.id, geo);
  return geo;
}

export function getEffectiveDims(type, rotY) {
  const { w, h, d } = type;
  return (rotY === 90 || rotY === 270) ? { w: d, h, d: w } : { w, h, d };
}

export function getOccupiedCells(anchor, type, rotY) {
  const { w, h, d } = getEffectiveDims(type, rotY);
  const cells = [];
  for (let dx = 0; dx < w; dx++)
    for (let dy = 0; dy < h; dy++)
      for (let dz = 0; dz < d; dz++)
        cells.push([anchor.x + dx, anchor.y + dy, anchor.z + dz]);
  return cells;
}

export function getMeshCenter(anchor, type, rotY) {
  const { w, h, d } = getEffectiveDims(type, rotY);
  return new THREE.Vector3(anchor.x + w / 2, anchor.y + h / 2, anchor.z + d / 2);
}

export function getAnchorFromHit(hitPoint, hitNormal, type, rotY) {
  const { w, h, d } = getEffectiveDims(type, rotY);
  const fn = hitNormal;
  const pt = hitPoint;
  let ax, ay, az;

  if (fn.y > 0.5) {
    ay = Math.round(pt.y);
    ax = Math.round(pt.x - w / 2);
    az = Math.round(pt.z - d / 2);
  } else if (fn.y < -0.5) {
    ay = Math.round(pt.y) - h;
    ax = Math.round(pt.x - w / 2);
    az = Math.round(pt.z - d / 2);
  } else if (fn.x > 0.5) {
    ax = Math.round(pt.x);
    ay = Math.round(pt.y - h / 2);
    az = Math.round(pt.z - d / 2);
  } else if (fn.x < -0.5) {
    ax = Math.round(pt.x) - w;
    ay = Math.round(pt.y - h / 2);
    az = Math.round(pt.z - d / 2);
  } else if (fn.z > 0.5) {
    ax = Math.round(pt.x - w / 2);
    ay = Math.round(pt.y - h / 2);
    az = Math.round(pt.z);
  } else {
    ax = Math.round(pt.x - w / 2);
    ay = Math.round(pt.y - h / 2);
    az = Math.round(pt.z) - d;
  }

  return { x: ax, y: ay, z: az };
}
