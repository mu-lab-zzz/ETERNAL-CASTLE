import * as THREE from 'three';
import { BlockWorld } from './block.js';
import { FPSControls } from './controls.js';

const GRID_SIZE = 64;
const GRID_HEIGHT = 32;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
    this.selectedColor = '#e74c3c';
    this.showGrid = true;
    this.blockCount = 0;

    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLights();
    this._setupGround();
    this._setupGridHelper();

    this.world = new BlockWorld(this.scene, GRID_SIZE, GRID_HEIGHT);
    this.controls = new FPSControls(this.camera, this.canvas, this.world, this);

    window.addEventListener('resize', () => this._onResize());
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2035);
    this.scene.fog = new THREE.Fog(0x1a2035, 40, 120);
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(8, 6, 8);
    this.camera.lookAt(0, 0, 0);
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0x405080, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.4);
    sun.position.set(20, 40, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8090c0, 0.3);
    fill.position.set(-10, 10, -10);
    this.scene.add(fill);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 400;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true });
    this.scene.add(new THREE.Points(starGeo, starMat));
  }

  _setupGround() {
    const geo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a3040,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.scene.add(ground);
  }

  _setupGridHelper() {
    this.gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0x334466, 0x223355);
    this.gridHelper.position.y = -0.49;
    this.scene.add(this.gridHelper);
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.gridHelper.visible = this.showGrid;
  }

  clearAll() {
    this.world.clearAll();
    this.blockCount = 0;
  }

  setSelectedColor(color) {
    this.selectedColor = color;
    this.controls.selectedColor = color;
  }

  start() {
    this.running = true;
    this._animate();
  }

  _animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this._animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  serialize() {
    return this.world.serialize();
  }

  deserialize(data) {
    this.world.deserialize(data);
    this.blockCount = this.world.getBlockCount();
  }

  screenshot() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }
}
