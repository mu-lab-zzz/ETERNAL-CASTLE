import { BlockWorld } from './world.js';
import { OrbitCamera } from './orbit-camera.js';
import { Builder }     from './builder.js';
import { SaveManager } from './save-manager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._initGround();
    this._initGrid();

    this.world   = new BlockWorld(this.scene);
    this.orbit   = new OrbitCamera(this.camera, canvas);
    this.builder = new Builder(this.camera, this.scene, this.world);
    this.saver   = new SaveManager(this.world);

    this.builder.setGround(this.groundMesh);

    // Forward taps from orbit camera to builder
    this.orbit.onTap = (sx, sy) => this.builder.handleTap(sx, sy);

    window.addEventListener('resize', () => this._resize());
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2a40);
    this.scene.fog = new THREE.Fog(0x1a2a40, 50, 130);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  }

  _initLights() {
    this.scene.add(new THREE.AmbientLight(0x506080, 0.7));

    const sun = new THREE.DirectionalLight(0xfff5e4, 1.5);
    sun.position.set(25, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { near: 0.5, far: 200, left: -60, right: 60, top: 60, bottom: -60 });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    this.scene.add(Object.assign(new THREE.DirectionalLight(0x8090c0, 0.25), {
      position: new THREE.Vector3(-15, 8, -10),
    }));

    // Stars
    const pos = new Float32Array(3000 * 3).map(() => (Math.random() - 0.5) * 500);
    const sg  = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35 })));
  }

  _initGround() {
    const geo = new THREE.PlaneGeometry(128, 128);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a3545, roughness: 0.95 });
    this.groundMesh = new THREE.Mesh(geo, mat);
    this.groundMesh.name = 'ground';
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.5;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  _initGrid() {
    this.gridHelper = new THREE.GridHelper(64, 64, 0x334466, 0x223355);
    this.gridHelper.position.y = -0.49;
    this.scene.add(this.gridHelper);
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  toggleGrid() { this.gridHelper.visible = !this.gridHelper.visible; }

  start() {
    this._raf();
  }

  _raf() {
    requestAnimationFrame(() => this._raf());
    this.builder.update();
    this.renderer.render(this.scene, this.camera);
  }

  screenshot() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }
}
