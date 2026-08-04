
export const COLORS = [
  { hex: '#e74c3c', name: '赤' },
  { hex: '#e67e22', name: 'オレンジ' },
  { hex: '#f1c40f', name: '黄' },
  { hex: '#2ecc71', name: '緑' },
  { hex: '#1abc9c', name: 'エメラルド' },
  { hex: '#3498db', name: '青' },
  { hex: '#9b59b6', name: '紫' },
  { hex: '#e91e8c', name: 'ピンク' },
  { hex: '#ffffff', name: '白' },
  { hex: '#bdc3c7', name: 'シルバー' },
  { hex: '#7f8c8d', name: 'グレー' },
  { hex: '#2c3e50', name: '黒' },
  { hex: '#d35400', name: '茶' },
  { hex: '#27ae60', name: '深緑' },
  { hex: '#2980b9', name: 'ネイビー' },
  { hex: '#f39c12', name: 'ゴールド' },
];

export const MATERIAL_PRESETS = [
  { id: 'basic',    name: 'ノーマル', icon: '🟥' },
  { id: 'metallic', name: 'メタル',   icon: '⚙️'  },
  { id: 'gold',     name: 'ゴールド', icon: '🌟' },
  { id: 'glass',    name: 'ガラス',   icon: '💎' },
  { id: 'glow',     name: '発光',     icon: '✨' },
];

const CACHE = new Map();

export function getMaterial(color, preset = 'basic') {
  const key = `${color}__${preset}`;
  if (CACHE.has(key)) return CACHE.get(key);

  const c = new THREE.Color(color);
  let mat;

  switch (preset) {
    case 'metallic':
      mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.12, metalness: 0.92 });
      break;
    case 'gold': {
      const gc = new THREE.Color(color).lerp(new THREE.Color('#ffdd88'), 0.3);
      mat = new THREE.MeshStandardMaterial({ color: gc, roughness: 0.18, metalness: 1.0 });
      break;
    }
    case 'glass':
      mat = new THREE.MeshPhysicalMaterial({
        color: c, roughness: 0.02, metalness: 0,
        transparent: true, opacity: 0.32,
        transmission: 0.85, thickness: 0.5,
        depthWrite: false,
      });
      break;
    case 'glow':
      mat = new THREE.MeshStandardMaterial({
        color: c, roughness: 0.7, metalness: 0,
        emissive: c, emissiveIntensity: 0.5,
      });
      break;
    default:
      mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.04 });
  }

  CACHE.set(key, mat);
  return mat;
}

export function getGhostMaterial(color) {
  const c = new THREE.Color(color);
  return new THREE.MeshBasicMaterial({
    color: c, transparent: true, opacity: 0.35, depthWrite: false,
  });
}
