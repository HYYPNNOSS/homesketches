/**
 * Three.js scene engine for Sketch Space.
 * Manages rendering, tools, camera modes, undo/redo, and autosave.
 * All operations are in metres. Y = up. X/Z = floor plane.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  Scene,
  Wall,
  Room,
  Opening,
  Item,
  FurnitureKind,
  ToolKind,
  ViewMode,
  Vec2,
  VirtualCamera,
  CanvasBounds,
  FloorLevel,
  Project,
  GizmoMode,
  MaterialPreset,
  BUILTIN_MATERIALS,
  activeFloor,
  emptyScene,
  emptyProject,
  isProject,
  SNAP_GRID,
  WALL_HEIGHT,
  WALL_THICKNESS,
  FURNITURE_SIZES,
  EYE_LEVEL,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function snap(v: number): number {
  return Math.round(v / SNAP_GRID) * SNAP_GRID;
}

function snapVec(v: Vec2): Vec2 {
  return [snap(v[0]), snap(v[1])];
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function ortho(a: Vec2, b: Vec2, lock: boolean): Vec2 {
  if (!lock) return b;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return Math.abs(dx) >= Math.abs(dz)
    ? [b[0], a[1]]
    : [a[0], b[1]];
}

// Shared raycaster — passed in to avoid per-frame allocation (fixes B-3)
function worldToFloor(
  event: { clientX: number; clientY: number },
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  raycaster: THREE.Raycaster
): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, hit);
  return [hit.x, hit.z];
}

function vec2ToV3(p: Vec2, y = 0): THREE.Vector3 {
  return new THREE.Vector3(p[0], y, p[1]);
}

function wallDir(wall: Wall): THREE.Vector3 {
  return new THREE.Vector3(
    wall.b[0] - wall.a[0],
    0,
    wall.b[1] - wall.a[1]
  ).normalize();
}

function wallLen(wall: Wall): number {
  const dx = wall.b[0] - wall.a[0];
  const dz = wall.b[1] - wall.a[1];
  return Math.sqrt(dx * dx + dz * dz);
}

function wallMid(wall: Wall): Vec2 {
  return [(wall.a[0] + wall.b[0]) / 2, (wall.a[1] + wall.b[1]) / 2];
}

function createProceduralTexture(id: string): THREE.Texture {
  if (typeof document === "undefined") return new THREE.Texture();
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  if (id === "oak-wood" || id === "warm-wood-panel") {
    ctx.fillStyle = id === "oak-wood" ? "#c89d66" : "#8d6446";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = id === "oak-wood" ? "#ab7e48" : "#6f4d34";
    ctx.lineWidth = 3;
    for (let y = 0; y < 512; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(100,60,30,0.06)";
    for (let i = 0; i < 300; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 60 + 10, 1.5);
    }
  } else if (id === "polished-concrete") {
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2000; i++) {
      const g = Math.floor(Math.random() * 70 + 130);
      ctx.fillStyle = `rgba(${g},${g},${g},0.15)`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
  } else if (id === "marble-tile") {
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(170, 175, 185, 0.4)";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, 0);
      ctx.bezierCurveTo(Math.random() * 512, 160, Math.random() * 512, 360, Math.random() * 512, 512);
      ctx.stroke();
    }
  } else if (id === "slate-tile") {
    ctx.fillStyle = "#374151";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 4;
    for (let i = 0; i < 512; i += 128) {
      ctx.strokeRect(0, i, 512, 128);
      ctx.strokeRect(i, 0, 128, 512);
    }
  } else if (id === "cozy-carpet") {
    ctx.fillStyle = "#d1c7bd";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(140,130,120,0.15)";
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }
  } else if (id === "exposed-brick") {
    ctx.fillStyle = "#994d38";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#ded6d0";
    ctx.lineWidth = 3;
    const rowH = 32;
    const colW = 64;
    for (let y = 0; y < 512; y += rowH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
      const offset = (Math.floor(y / rowH) % 2) * (colW / 2);
      for (let x = offset; x < 512; x += colW) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();
      }
    }
  } else {
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, 512, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  grid: 0xd6d9c8,
  gridMajor: 0xb8bca8,
  wallTop: 0x2e3128,
  wallSide: 0x3d4234,
  wallEdge: 0x1e2019,
  floor: 0xf2f0e6,
  furniture: 0x8a9a6a,
  furnitureEdge: 0x5a6a3a,
  door: 0xc9a87a,
  window: 0x7ab8d4,
  ghost: 0xa9c93a,
  dim: 0x888a7d,
  roomFill: 0xe8edcf,
  selected: 0x4a9a3a,
  overlap: 0xdd3333,
  snapGuide: 0x3aaa6a,
  canvasBounds: 0x7ab8d4,
  camera: 0xff6b35,
};

// ─── Main Engine Class ────────────────────────────────────────────────────────

export type EngineEventType =
  | "scene-change"
  | "tool-change"
  | "view-change"
  | "history-change"
  | "selection-change";

type Listener = (data?: unknown) => void;

export interface SelectionChangeData {
  id: string | null;
  type: "item" | "wall" | "opening" | "camera" | null;
  screenX: number;
  screenY: number;
}

export class SketchEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene3d: THREE.Scene;
  private camera: THREE.Camera;
  private orthoCamera: THREE.OrthographicCamera;
  private perspCamera: THREE.PerspectiveCamera;
  private controls: OrbitControls | null = null;
  private frameId = 0;
  private listeners: Map<EngineEventType, Set<Listener>> = new Map();

  // Drawing state
  private sceneData: Scene = emptyScene();
  private projectData: Project = emptyProject();
  private history: Scene[] = [];
  private historyIndex = -1;
  private MAX_HISTORY = 60;

  // 3D Gizmo state (TransformControls)
  private transformControls: TransformControls | null = null;
  private transformControlsHelper: THREE.Object3D | null = null;
  private gizmoMode: GizmoMode = "translate";

  // Shared raycaster — hoisted to avoid per-frame heap allocation (B-3)
  private raycaster = new THREE.Raycaster();

  // Texture cache
  private textureCache = new Map<string, THREE.Texture>();

  // Tool state
  activeTool: ToolKind = "wall";
  activeView: ViewMode = "top";
  orthogonalLock = false;
  activeFurniture: FurnitureKind = "bed";
  private drawing = false;
  private wallStart: Vec2 | null = null;
  private cameraStart: Vec2 | null = null;
  private ghostLine: THREE.Line | null = null;
  private ghostRect: THREE.Mesh | null = null;
  private ghostDim: THREE.Sprite | null = null;
  private roomStart: Vec2 | null = null;
  private selectedId: string | null = null;
  private selectedType: "item" | "wall" | "opening" | "camera" | "camera-target" | null = null;
  private isDragging = false;
  private dragOffset: Vec2 = [0, 0];
  private lengthOverride: number | null = null; // metres, typed by user

  // Wall endpoint dragging
  private draggingWallId: string | null = null;
  private draggingEndpoint: "a" | "b" | null = null;

  // Snap guide lines
  private snapGuideGroup = new THREE.Group();

  // 3D groups
  private wallGroup = new THREE.Group();
  private floorSlabGroup = new THREE.Group();
  private roomGroup = new THREE.Group();
  private openingGroup = new THREE.Group();
  private itemGroup = new THREE.Group();
  private dimGroup = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private gridGroup = new THREE.Group();
  private cameraMarkerGroup = new THREE.Group();

  // Video recording state
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  isRecording = false;

  // Autosave key
  private STORAGE_KEY = "sketch-space-scene";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Scene
    this.scene3d = new THREE.Scene();
    this.scene3d.background = new THREE.Color(0xf5f4ef);

    // Cameras
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.orthoCamera = new THREE.OrthographicCamera(
      -10 * aspect, 10 * aspect, 10, -10, 0.01, 1000
    );
    this.orthoCamera.position.set(0, 20, 0);
    this.orthoCamera.lookAt(0, 0, 0);
    this.orthoCamera.zoom = 1;

    this.perspCamera = new THREE.PerspectiveCamera(50, aspect, 0.01, 1000);
    this.perspCamera.position.set(8, 8, 12);
    this.perspCamera.lookAt(0, 0, 0);

    this.camera = this.orthoCamera;

    // Groups
    this.scene3d.add(
      this.gridGroup,
      this.floorSlabGroup,
      this.roomGroup,
      this.wallGroup,
      this.openingGroup,
      this.itemGroup,
      this.dimGroup,
      this.ghostGroup,
      this.snapGuideGroup,
      this.cameraMarkerGroup
    );

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const sun = new THREE.DirectionalLight(0xfff8ec, 1.2);
    sun.position.set(10, 20, 8);
    sun.castShadow = true;
    this.scene3d.add(ambient, sun);

    // Grid
    this.buildGrid();

    // Controls
    this.setupControls();

    // 3D Transform Gizmo
    this.transformControls = new TransformControls(this.perspCamera, this.canvas);
    this.transformControls.size = 0.75;
    this.transformControls.setMode(this.gizmoMode);
    this.transformControlsHelper = this.transformControls.getHelper();
    this.scene3d.add(this.transformControlsHelper);

    this.transformControls.addEventListener("mouseDown", () => {
      if (this.controls) this.controls.enabled = false;
    });
    this.transformControls.addEventListener("mouseUp", () => {
      if (this.controls) this.controls.enabled = true;
      this.syncFromGizmo();
      this.pushHistory();
      this.emit("scene-change", this.sceneData);
    });
    this.transformControls.addEventListener("objectChange", () => {
      this.syncFromGizmo();
    });

    // Events
    this.bindEvents();

    // Load autosave
    this.loadAutosave();

    // Start loop
    this.tick();
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  destroy() {
    cancelAnimationFrame(this.frameId);
    if (this.transformControls) {
      // Detach before removing helper — avoids internal this.traverse() crash
      // that occurs in Three.js 0.169 when TransformControls is no longer an Object3D.
      this.transformControls.detach();
      if (this.transformControlsHelper) {
        this.scene3d.remove(this.transformControlsHelper);
        this.transformControlsHelper = null;
      }
      this.transformControls.dispose();
      this.transformControls = null;
    }
    this.renderer.dispose();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
  }

  // ─── Events ──────────────────────────────────────────────────────────────────

  on(type: EngineEventType, fn: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
    return () => this.listeners.get(type)?.delete(fn);
  }

  private emit(type: EngineEventType, data?: unknown) {
    this.listeners.get(type)?.forEach((fn) => fn(data));
  }

  private keysPressed = new Set<string>();

  // ─── Render loop ─────────────────────────────────────────────────────────────

  private tick = () => {
    this.frameId = requestAnimationFrame(this.tick);

    // Apply eye-level manual movement
    if (this.activeView === "eye-level" && this.controls) {
      const speed = 0.15;
      const rotSpeed = 0.03;
      const fwd = new THREE.Vector3();
      const right = new THREE.Vector3();

      this.perspCamera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      
      right.crossVectors(fwd, this.perspCamera.up).normalize();

      // Movement (WASD / Arrows)
      if (this.keysPressed.has("ArrowUp") || this.keysPressed.has("KeyW")) {
        this.perspCamera.position.addScaledVector(fwd, speed);
        this.controls.target.addScaledVector(fwd, speed);
      }
      if (this.keysPressed.has("ArrowDown") || this.keysPressed.has("KeyS")) {
        this.perspCamera.position.addScaledVector(fwd, -speed);
        this.controls.target.addScaledVector(fwd, -speed);
      }
      if (this.keysPressed.has("KeyA")) { // Strafe left
        this.perspCamera.position.addScaledVector(right, -speed);
        this.controls.target.addScaledVector(right, -speed);
      }
      if (this.keysPressed.has("KeyD")) { // Strafe right
        this.perspCamera.position.addScaledVector(right, speed);
        this.controls.target.addScaledVector(right, speed);
      }

      // Rotation (ArrowLeft / ArrowRight or Q / E)
      if (this.keysPressed.has("ArrowLeft") || this.keysPressed.has("KeyQ")) {
        const offset = new THREE.Vector3().subVectors(this.controls.target, this.perspCamera.position);
        offset.applyAxisAngle(this.perspCamera.up, rotSpeed);
        this.controls.target.copy(this.perspCamera.position).add(offset);
      }
      if (this.keysPressed.has("ArrowRight") || this.keysPressed.has("KeyE")) {
        const offset = new THREE.Vector3().subVectors(this.controls.target, this.perspCamera.position);
        offset.applyAxisAngle(this.perspCamera.up, -rotSpeed);
        this.controls.target.copy(this.perspCamera.position).add(offset);
      }
    }

    this.controls?.update();
    this.renderer.render(this.scene3d, this.camera);
  };

  // ─── Resize ──────────────────────────────────────────────────────────────────

  triggerResize() {
    this.onResize();
  }

  private onResize = () => {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;

    const half = 10 / this.orthoCamera.zoom;
    this.orthoCamera.left = -half * aspect;
    this.orthoCamera.right = half * aspect;
    this.orthoCamera.top = half;
    this.orthoCamera.bottom = -half;
    this.orthoCamera.updateProjectionMatrix();

    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();
  };

  // ─── Grid ────────────────────────────────────────────────────────────────────

  // ─── Canvas Bounds Helpers ───────────────────────────────────────────────────

  getCanvasBounds(): CanvasBounds {
    return this.sceneData.canvas ?? { widthM: 16, depthM: 12, gridStep: SNAP_GRID };
  }

  clampToBounds(v: Vec2): Vec2 {
    const cb = this.getCanvasBounds();
    const halfW = cb.widthM / 2;
    const halfD = cb.depthM / 2;
    return [
      Math.max(-halfW, Math.min(halfW, v[0])),
      Math.max(-halfD, Math.min(halfD, v[1])),
    ];
  }

  // ─── Grid ────────────────────────────────────────────────────────────────────

  private buildGrid(bounds?: CanvasBounds) {
    // Dispose old geometry + materials before clearing to prevent WebGL VRAM leaks (B-4)
    this.gridGroup.traverse((obj) => {
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          (obj.material as THREE.Material)?.dispose();
        }
      }
    });
    this.gridGroup.clear();

    const cb = bounds ?? this.getCanvasBounds();
    const halfW = cb.widthM / 2;
    const halfD = cb.depthM / 2;
    const STEP = cb.gridStep ?? SNAP_GRID;

    const lineMat = new THREE.LineBasicMaterial({
      color: COLORS.grid,
      transparent: true,
      opacity: 0.65,
    });
    const majorMat = new THREE.LineBasicMaterial({
      color: COLORS.gridMajor,
      transparent: true,
      opacity: 0.9,
    });

    // Horizontal lines (along X axis, varying Z from -halfD to +halfD)
    const stepsZ = Math.round(cb.depthM / STEP);
    for (let i = 0; i <= stepsZ; i++) {
      const z = -halfD + i * STEP;
      const roundedZ = Math.round(z * 100) / 100;
      const isMajor = Math.abs(Math.round(roundedZ * 10)) % 10 === 0;
      const pts = [
        new THREE.Vector3(-halfW, 0, roundedZ),
        new THREE.Vector3(halfW, 0, roundedZ),
      ];
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      this.gridGroup.add(new THREE.Line(g, isMajor ? majorMat : lineMat));
    }

    // Vertical lines (along Z axis, varying X from -halfW to +halfW)
    const stepsX = Math.round(cb.widthM / STEP);
    for (let j = 0; j <= stepsX; j++) {
      const x = -halfW + j * STEP;
      const roundedX = Math.round(x * 100) / 100;
      const isMajor = Math.abs(Math.round(roundedX * 10)) % 10 === 0;
      const pts = [
        new THREE.Vector3(roundedX, 0, -halfD),
        new THREE.Vector3(roundedX, 0, halfD),
      ];
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      this.gridGroup.add(new THREE.Line(g, isMajor ? majorMat : lineMat));
    }

    // Floor sheet plane for raycasting & visual base
    const floorGeo = new THREE.PlaneGeometry(cb.widthM, cb.depthM);
    const floorMat = new THREE.MeshBasicMaterial({
      color: COLORS.floor,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.002, 0);
    floor.name = "floor";
    this.gridGroup.add(floor);
  }

  /** Update canvas bounds, rebuild grid, propagate to all floors, and emit scene-change. */
  setCanvasBounds(b: CanvasBounds) {
    this.sceneData = { ...this.sceneData, canvas: b };
    for (const fl of this.projectData.floors) {
      fl.scene = { ...fl.scene, canvas: { ...b } };
    }
    this.buildGrid(b);
    this.rebuildBoundsOutline();
    this.rebuildScene();
    this.pushHistory();
    this.emit("scene-change", this.sceneData);
  }

  // ─── Camera / Controls ───────────────────────────────────────────────────────

  private setupControls() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.activeView === "perspective" || this.activeView === "eye-level") {
      this.controls = new OrbitControls(this.perspCamera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      if (this.activeView === "eye-level") {
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 30;
      }
    }
  }

  /** Smoothly tween the active perspective camera from one position to another (ease-out cubic). */
  private tweenCamera(fromPos: THREE.Vector3, toPos: THREE.Vector3, fromTarget: THREE.Vector3, toTarget: THREE.Vector3, duration = 300) {
    const start = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      this.perspCamera.position.lerpVectors(fromPos, toPos, eased);
      if (this.controls) {
        this.controls.target.lerpVectors(fromTarget, toTarget, eased);
      }
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  setView(mode: ViewMode) {
    const prevMode = this.activeView;
    this.activeView = mode;

    // B-2: Hide the gizmo helper in top-down view — it's camera-relative to perspCamera
    // and would intercept raycasts / render incorrectly in orthographic mode.
    if (this.transformControlsHelper) {
      this.transformControlsHelper.visible = mode !== "top";
    }
    // Also detach any attached object when switching to top view
    if (mode === "top" && this.transformControls) {
      this.transformControls.detach();
    }

    if (mode === "top") {
      this.camera = this.orthoCamera;
      this.orthoCamera.position.set(0, 20, 0);
      this.orthoCamera.lookAt(0, 0, 0);
      this.scene3d.background = new THREE.Color(0xf5f4ef);
      this.controls = new OrbitControls(this.orthoCamera, this.canvas);
      this.controls.listenToKeyEvents(window); // Allow arrow keys to pan
      this.controls.enableRotate = false;
      this.controls.enableZoom = false; // handled in onWheel
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.mouseButtons = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        LEFT: -1 as any, // Ignore left click for orbit (we use it for drawing)
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN
      };
      this.controls.touches = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ONE: -1 as any, // Ignore 1-finger touch (we use it for drawing)
        TWO: THREE.TOUCH.PAN
      };
    } else if (mode === "perspective") {
      this.camera = this.perspCamera;
      const fromPos = this.perspCamera.position.clone();
      const toPos = new THREE.Vector3(8, 8, 12);
      const fromTarget = this.controls?.target.clone() ?? new THREE.Vector3(0, 0, 0);
      const toTarget = new THREE.Vector3(0, 0, 0);
      this.scene3d.background = new THREE.Color(0xd8e4f0);
      this.setupControls();
      if (prevMode !== "perspective") {
        this.tweenCamera(fromPos, toPos, fromTarget, toTarget);
      } else {
        this.perspCamera.position.copy(toPos);
      }
    } else {
      // eye-level
      this.camera = this.perspCamera;
      const fromPos = this.perspCamera.position.clone();
      const toPos = new THREE.Vector3(0, EYE_LEVEL, 6);
      const fromTarget = this.controls?.target.clone() ?? new THREE.Vector3(0, EYE_LEVEL, 0);
      const toTarget = new THREE.Vector3(0, EYE_LEVEL, 0);
      this.scene3d.background = new THREE.Color(0xd8e4f0);
      this.setupControls();
      if (prevMode !== "eye-level") {
        this.tweenCamera(fromPos, toPos, fromTarget, toTarget);
      } else {
        this.perspCamera.position.copy(toPos);
      }
    }
    this.onResize();
    if (prevMode !== mode) {
      this.rebuildScene();
    }
    this.emit("view-change", mode);
  }

  // ─── Input binding ───────────────────────────────────────────────────────────

  private bindEvents() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    this.canvas.addEventListener("pointermove", this.onPointerMove, { passive: true });
    this.canvas.addEventListener("pointerup", this.onPointerUp, { passive: false });
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
  }

  private getFloorPos(e: PointerEvent, smart = false): Vec2 {
    const raw = worldToFloor(
      { clientX: e.clientX, clientY: e.clientY },
      this.camera,
      this.canvas,
      this.raycaster // B-3: use shared instance
    );
    const clampedRaw = this.clampToBounds(raw);
    if (e.altKey) return clampedRaw;
    const snapped = smart ? this.snapVecSmart(clampedRaw) : snapVec(clampedRaw);
    return this.clampToBounds(snapped);
  }

  /** Smart snap: first applies grid snap, then magnetic endpoint snap within 0.3 m. */
  private snapVecSmart(v: Vec2): Vec2 {
    let snapped: Vec2 = snapVec(v);

    // Clear old snap guides
    this.snapGuideGroup.clear();

    const MAGNETIC_R = 0.3; // metres

    // Magnetic endpoint snap — within MAGNETIC_R of any wall endpoint
    for (const wall of this.sceneData.walls) {
      for (const endpoint of [wall.a, wall.b] as Vec2[]) {
        const d = Math.hypot(v[0] - endpoint[0], v[1] - endpoint[1]);
        if (d < MAGNETIC_R) {
          snapped = endpoint;
          return snapped;
        }
      }
    }

    // Axis alignment guides — show green line when same X or Z as another endpoint
    const ALIGN_THR = 0.12;
    const guideMat = new THREE.LineBasicMaterial({ color: COLORS.snapGuide, transparent: true, opacity: 0.7 });
    for (const wall of this.sceneData.walls) {
      for (const endpoint of [wall.a, wall.b] as Vec2[]) {
        if (Math.abs(v[0] - endpoint[0]) < ALIGN_THR) {
          // Vertical alignment guide
          const pts = [
            new THREE.Vector3(endpoint[0], 0.02, Math.min(v[1], endpoint[1]) - 2),
            new THREE.Vector3(endpoint[0], 0.02, Math.max(v[1], endpoint[1]) + 2),
          ];
          this.snapGuideGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), guideMat));
          snapped = [endpoint[0], snapped[1]];
        }
        if (Math.abs(v[1] - endpoint[1]) < ALIGN_THR) {
          // Horizontal alignment guide
          const pts = [
            new THREE.Vector3(Math.min(v[0], endpoint[0]) - 2, 0.02, endpoint[1]),
            new THREE.Vector3(Math.max(v[0], endpoint[0]) + 2, 0.02, endpoint[1]),
          ];
          this.snapGuideGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), guideMat));
          snapped = [snapped[0], endpoint[1]];
        }
      }
    }

    return snapped;
  }

  private spacePressed = false;

  private onPointerDown = (e: PointerEvent) => {
    if (this.activeView !== "top") return; // tools only in top view
    if (e.button !== 0) return;
    if (this.spacePressed) return; // Let OrbitControls handle panning
    e.preventDefault();
    const pos = this.getFloorPos(e, true);
    this.handleToolDown(pos, e);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.activeView !== "top") return;
    if (!this.drawing && !this.isDragging && !this.draggingWallId) return;
    const pos = this.getFloorPos(e, true);
    this.handleToolMove(pos, e.shiftKey);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.activeView !== "top") return;
    if (e.button !== 0) return;
    const pos = this.getFloorPos(e, true);
    this.handleToolUp(pos, e.shiftKey);
  };

  private onWheel = (e: WheelEvent) => {
    if (this.activeView !== "top") return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom - limit minimum zoom to prevent zooming out too much
      const delta = e.deltaY < 0 ? 1.15 : 0.87;
      this.orthoCamera.zoom = Math.max(0.5, Math.min(20, this.orthoCamera.zoom * delta));
      this.orthoCamera.updateProjectionMatrix();
      this.onResize();
    } else {
      // Pan
      const speed = 0.05 / this.orthoCamera.zoom;
      this.orthoCamera.position.x += e.deltaX * speed;
      this.orthoCamera.position.z += e.deltaY * speed;
      if (this.controls) {
        this.controls.target.x += e.deltaX * speed;
        this.controls.target.z += e.deltaY * speed;
      }
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    this.keysPressed.add(e.code);

    if (this.activeView === "eye-level" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }

    // Spacebar to pan
    if (e.code === "Space" && !this.spacePressed) {
      e.preventDefault();
      this.spacePressed = true;
      if (this.controls && this.activeView === "top") {
        this.controls.mouseButtons = { ...this.controls.mouseButtons, LEFT: THREE.MOUSE.PAN };
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      if (e.shiftKey) this.redo(); else this.undo();
    }
    if (e.key === "Escape") {
      this.cancelTool();
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      this.deleteSelected();
    }
    // Tool shortcuts
    const shortcuts: Record<string, ToolKind> = {
      w: "wall", r: "room", d: "door", n: "window", f: "furniture",
      l: "label", e: "eraser", v: "select", c: "camera",
    };
    if (!e.ctrlKey && !e.metaKey && shortcuts[e.key]) {
      this.setTool(shortcuts[e.key]);
    }
    
    // Rotate furniture — only when select tool is active to avoid conflict with "R" → room shortcut (B-7)
    if ((e.key === "r" || e.key === "R") && this.activeTool === "select") {
      this.rotateSelected();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysPressed.delete(e.code);
    
    if (e.code === "Space") {
      this.spacePressed = false;
      if (this.controls && this.activeView === "top") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.controls.mouseButtons = { ...this.controls.mouseButtons, LEFT: -1 as any };
      }
    }
  };

  // ─── Tool logic ──────────────────────────────────────────────────────────────

  setTool(tool: ToolKind) {
    this.cancelTool();
    this.activeTool = tool;
    this.emit("tool-change", tool);
  }

  setFurniture(kind: FurnitureKind) {
    this.activeFurniture = kind;
  }

  setOrthogonalLock(v: boolean) {
    this.orthogonalLock = v;
  }

  setLengthOverride(metres: number | null) {
    this.lengthOverride = metres;
  }

  private cancelTool() {
    this.drawing = false;
    this.wallStart = null;
    this.roomStart = null;
    this.cameraStart = null;
    this.isDragging = false;
    this.draggingWallId = null;
    this.draggingEndpoint = null;
    this.snapGuideGroup.clear();
    this.clearGhost();
  }

  private handleToolDown(pos: Vec2, e: PointerEvent) {
    switch (this.activeTool) {
      case "wall":
        if (!this.drawing) {
          this.drawing = true;
          this.wallStart = pos;
        } else {
          // Second click finalises wall
          const end = this.commitWall(this.wallStart!, pos);
          if (end) this.wallStart = end; // chain next wall from here
        }
        break;
      case "room":
        if (!this.drawing) {
          this.drawing = true;
          this.roomStart = pos;
        } else {
          this.commitRoom(this.roomStart!, pos);
          this.cancelTool();
        }
        break;
      case "door":
      case "window":
        this.commitOpening(pos, this.activeTool);
        break;
      case "furniture":
        this.commitItem(pos, this.activeFurniture);
        break;
      case "camera":
        if (!this.drawing) {
          this.drawing = true;
          this.cameraStart = pos;
        } else {
          this.commitCamera(this.cameraStart!, pos);
          this.cancelTool();
          this.setTool("select");
        }
        break;
      case "label":
        this.commitLabel(pos);
        break;
      case "eraser":
        this.eraseAt(pos);
        break;
      case "select":
        this.selectAt(pos, e);
        break;
    }
  }

  private handleToolMove(pos: Vec2, shiftKey: boolean) {
    // Wall endpoint drag
    if (this.draggingWallId && this.draggingEndpoint) {
      this.dragWallEndpoint(pos);
      return;
    }
    if (this.isDragging && this.selectedId) {
      if (this.selectedType === "camera") {
        this.dragCamera(pos);
        return;
      }
      if (this.selectedType === "camera-target") {
        this.dragCameraTarget(pos);
        return;
      }
      this.dragItem(pos);
      return;
    }
    if (!this.drawing) return;
    if (this.activeTool === "wall" && this.wallStart) {
      const end = this.clampToBounds(ortho(this.wallStart, pos, this.orthogonalLock || shiftKey));
      this.showWallGhost(this.wallStart, end);
    } else if (this.activeTool === "room" && this.roomStart) {
      this.showRoomGhost(this.roomStart, this.clampToBounds(pos));
    } else if (this.activeTool === "camera" && this.cameraStart) {
      this.showCameraGhost(this.cameraStart, this.clampToBounds(pos));
    }
  }

  private handleToolUp(pos: Vec2, _shiftKey: boolean) {
    if (this.draggingWallId) {
      this.draggingWallId = null;
      this.draggingEndpoint = null;
      this.pushHistory();
      this.emit("scene-change", this.sceneData);
      return;
    }
    // Camera placement via drag-release
    if (this.activeTool === "camera" && this.cameraStart) {
      if (dist(this.cameraStart, pos) >= 0.25) {
        this.commitCamera(this.cameraStart, pos);
        this.cancelTool();
        this.setTool("select");
        return;
      }
    }
    if (this.isDragging) {
      this.isDragging = false;
      this.pushHistory();
      this.emit("scene-change", this.sceneData);
    }
  }

  // ─── Tool commits ────────────────────────────────────────────────────────────

  private commitWall(a: Vec2, b: Vec2): Vec2 | null {
    let end = ortho(a, b, this.orthogonalLock);
    // Apply length override
    if (this.lengthOverride !== null && this.lengthOverride > 0) {
      const dx = end[0] - a[0];
      const dz = end[1] - a[1];
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) {
        const scale = this.lengthOverride / len;
        end = [a[0] + dx * scale, a[1] + dz * scale];
      }
    }
    const clampedA = this.clampToBounds(a);
    const clampedEnd = this.clampToBounds(end);
    if (wallLen({ id: "", a: clampedA, b: clampedEnd }) < 0.05) return null;
    const wall: Wall = { id: nanoid(), a: clampedA, b: clampedEnd };
    this.sceneData = { ...this.sceneData, walls: [...this.sceneData.walls, wall] };
    this.clearGhost();
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
    this.lengthOverride = null;
    return clampedEnd;
  }

  private commitRoom(a: Vec2, b: Vec2) {
    const clampedA = this.clampToBounds(a);
    const clampedB = this.clampToBounds(b);
    const x = Math.min(clampedA[0], clampedB[0]);
    const z = Math.min(clampedA[1], clampedB[1]);
    const w = Math.abs(clampedB[0] - clampedA[0]);
    const d = Math.abs(clampedB[1] - clampedA[1]);
    if (w < 0.2 || d < 0.2) return;
    const room: Room = { id: nanoid(), name: "Room", x, z, w, d };
    this.sceneData = { ...this.sceneData, rooms: [...this.sceneData.rooms, room] };
    this.clearGhost();
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  private commitOpening(pos: Vec2, type: "door" | "window") {
    const clampedPos = this.clampToBounds(pos);
    // Snap to nearest wall
    const wall = this.nearestWall(clampedPos, 0.5);
    if (!wall) return;
    
    // Project exact point onto wall
    const l2 = (wall.a[0] - wall.b[0]) ** 2 + (wall.a[1] - wall.b[1]) ** 2;
    let t = 0.5;
    if (l2 > 0) {
      t = ((clampedPos[0] - wall.a[0]) * (wall.b[0] - wall.a[0]) + (clampedPos[1] - wall.a[1]) * (wall.b[1] - wall.a[1])) / l2;
      t = Math.max(0, Math.min(1, t));
    }
    const projX = wall.a[0] + t * (wall.b[0] - wall.a[0]);
    const projZ = wall.a[1] + t * (wall.b[1] - wall.a[1]);
    const clampedProj = this.clampToBounds([projX, projZ]);

    const opening: Opening = { id: nanoid(), type, at: clampedProj, w: type === "door" ? 0.9 : 1.2, wallId: wall.id };
    this.sceneData = { ...this.sceneData, openings: [...this.sceneData.openings, opening] };
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  private commitItem(pos: Vec2, kind: FurnitureKind) {
    const clamped = this.clampToBounds(pos);
    const item: Item = { id: nanoid(), kind, x: clamped[0], z: clamped[1], rot: 0, scale: 1.0 };
    this.sceneData = { ...this.sceneData, items: [...this.sceneData.items, item] };
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  private commitLabel(pos: Vec2) {
    const text = window.prompt("Label text:");
    if (!text) return;
    const clamped = this.clampToBounds(pos);
    const item: Item = { id: nanoid(), kind: "label", x: clamped[0], z: clamped[1], rot: 0, label: text };
    this.sceneData = { ...this.sceneData, items: [...this.sceneData.items, item] };
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  private eraseAt(pos: Vec2) {
    const thr = 0.5;
    const snap = (a: Vec2, b: Vec2) => {
      const dx = a[0] - b[0];
      const dz = a[1] - b[1];
      return Math.sqrt(dx * dx + dz * dz);
    };
    const walls = this.sceneData.walls.filter((w) => {
      const mid = wallMid(w);
      return snap(pos, mid) > thr;
    });
    const rooms = this.sceneData.rooms.filter((r) => {
      return !(pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.z && pos[1] <= r.z + r.d);
    });
    const items = this.sceneData.items.filter((it) => snap(pos, [it.x, it.z]) > thr);
    const openings = this.sceneData.openings.filter((o) => snap(pos, o.at) > thr);
    this.sceneData = { ...this.sceneData, walls, rooms, items, openings };
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  private lastPointerEvent: { clientX: number; clientY: number } = { clientX: 0, clientY: 0 };

  private selectAt(pos: Vec2, e: PointerEvent) {
    this.lastPointerEvent = { clientX: e.clientX, clientY: e.clientY };
    const thr = 0.7;
    const dist = (a: Vec2, b: Vec2) => {
      const dx = a[0] - b[0];
      const dz = a[1] - b[1];
      return Math.sqrt(dx * dx + dz * dz);
    };

    // Check wall endpoints first (within 0.4 m — wall endpoint dragging)
    for (const wall of this.sceneData.walls) {
      if (dist(pos, wall.a) < 0.4) {
        this.draggingWallId = wall.id;
        this.draggingEndpoint = "a";
        return;
      }
      if (dist(pos, wall.b) < 0.4) {
        this.draggingWallId = wall.id;
        this.draggingEndpoint = "b";
        return;
      }
    }

    // Cameras: check target handle first, then camera body
    const camTarget = this.sceneData.virtualCameras?.find((c) => dist(pos, c.targetPosition) < 0.5);
    if (camTarget) {
      this.selectedId = camTarget.id;
      this.selectedType = "camera-target";
      this.isDragging = true;
      this.dragOffset = [pos[0] - camTarget.targetPosition[0], pos[1] - camTarget.targetPosition[1]];
      this.rebuildScene();
      this.emit("selection-change", {
        id: camTarget.id,
        type: "camera",
        screenX: e.clientX,
        screenY: e.clientY,
      } satisfies SelectionChangeData);
      return;
    }

    const cam = this.sceneData.virtualCameras?.find((c) => dist(pos, c.position) < 0.7);
    if (cam) {
      this.selectedId = cam.id;
      this.selectedType = "camera";
      this.isDragging = true;
      this.dragOffset = [pos[0] - cam.position[0], pos[1] - cam.position[1]];
      this.rebuildScene();
      this.emit("selection-change", {
        id: cam.id,
        type: "camera",
        screenX: e.clientX,
        screenY: e.clientY,
      } satisfies SelectionChangeData);
      return;
    }

    // Items first
    const item = this.sceneData.items.find((it) => dist(pos, [it.x, it.z]) < thr);
    if (item) {
      this.selectedId = item.id;
      this.selectedType = "item";
      this.isDragging = true;
      this.dragOffset = [pos[0] - item.x, pos[1] - item.z];
      this.rebuildScene();
      this.emit("selection-change", {
        id: item.id,
        type: "item",
        screenX: e.clientX,
        screenY: e.clientY,
      } satisfies SelectionChangeData);
      return;
    }

    // Walls (by midpoint)
    const wall = this.sceneData.walls.find((w) => dist(pos, wallMid(w)) < thr);
    if (wall) {
      this.selectedId = wall.id;
      this.selectedType = "wall";
      this.rebuildScene();
      this.emit("selection-change", {
        id: wall.id,
        type: "wall",
        screenX: e.clientX,
        screenY: e.clientY,
      } satisfies SelectionChangeData);
      return;
    }

    // Openings (doors and windows)
    const opening = this.sceneData.openings.find((o) => dist(pos, o.at) < thr);
    if (opening) {
      this.selectedId = opening.id;
      this.selectedType = "opening";
      this.rebuildScene();
      this.emit("selection-change", {
        id: opening.id,
        type: "opening",
        screenX: e.clientX,
        screenY: e.clientY,
      } satisfies SelectionChangeData);
      return;
    }

    this.selectedId = null;
    this.selectedType = null;
    this.rebuildScene();
    this.emit("selection-change", { id: null, type: null, screenX: e.clientX, screenY: e.clientY });
  }

  private dragItem(pos: Vec2) {
    if (!this.selectedId) return;
    const clamped = this.clampToBounds([pos[0] - this.dragOffset[0], pos[1] - this.dragOffset[1]]);
    const items = this.sceneData.items.map((it) =>
      it.id === this.selectedId
        ? { ...it, x: clamped[0], z: clamped[1] }
        : it
    );
    this.sceneData = { ...this.sceneData, items };
    this.rebuildScene();
  }

  private dragCamera(pos: Vec2) {
    if (!this.selectedId) return;
    const newPos = this.clampToBounds([pos[0] - this.dragOffset[0], pos[1] - this.dragOffset[1]]);
    const currentCam = this.sceneData.virtualCameras?.find((c) => c.id === this.selectedId);
    if (!currentCam) return;
    const dx = currentCam.targetPosition[0] - currentCam.position[0];
    const dz = currentCam.targetPosition[1] - currentCam.position[1];
    const newTarget = this.clampToBounds([newPos[0] + dx, newPos[1] + dz]);

    const cameras = (this.sceneData.virtualCameras ?? []).map((c) =>
      c.id === this.selectedId
        ? { ...c, position: newPos, targetPosition: newTarget }
        : c
    );
    this.sceneData = { ...this.sceneData, virtualCameras: cameras };
    this.syncActiveFloorScene();
    this.rebuildScene();
  }

  private dragCameraTarget(pos: Vec2) {
    if (!this.selectedId) return;
    const newTarget = this.clampToBounds([pos[0] - this.dragOffset[0], pos[1] - this.dragOffset[1]]);
    const cameras = (this.sceneData.virtualCameras ?? []).map((c) =>
      c.id === this.selectedId ? { ...c, targetPosition: newTarget } : c
    );
    this.sceneData = { ...this.sceneData, virtualCameras: cameras };
    this.syncActiveFloorScene();
    this.rebuildScene();
  }

  /** Drag a wall endpoint to the given floor position. */
  private dragWallEndpoint(pos: Vec2) {
    if (!this.draggingWallId || !this.draggingEndpoint) return;
    const clamped = this.clampToBounds(pos);
    const walls = this.sceneData.walls.map((w) => {
      if (w.id !== this.draggingWallId) return w;
      return this.draggingEndpoint === "a" ? { ...w, a: clamped } : { ...w, b: clamped };
    });
    this.sceneData = { ...this.sceneData, walls };
    this.rebuildScene();
  }

  rotateSelected() {
    if (!this.selectedId) return;
    const items = this.sceneData.items.map((it) => {
      if (it.id === this.selectedId) {
        return { ...it, rot: it.rot + Math.PI / 4 }; // Rotate by 45 degrees
      }
      return it;
    });
    this.sceneData = { ...this.sceneData, items };
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  deleteSelected() {
    if (!this.selectedId) return;
    this.sceneData = {
      ...this.sceneData,
      walls: this.sceneData.walls.filter((w) => w.id !== this.selectedId),
      rooms: this.sceneData.rooms.filter((r) => r.id !== this.selectedId),
      items: this.sceneData.items.filter((it) => it.id !== this.selectedId),
      openings: this.sceneData.openings.filter((o) => o.id !== this.selectedId),
      virtualCameras: (this.sceneData.virtualCameras ?? []).filter((c) => c.id !== this.selectedId),
    };
    this.selectedId = null;
    this.selectedType = null;
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
    this.emit("selection-change", { id: null, type: null, screenX: 0, screenY: 0 });
  }

  // ─── Collision detection ──────────────────────────────────────────────────────

  private checkOverlaps(item: Item): boolean {
    if (item.kind === "label") return false;
    const [w, d] = FURNITURE_SIZES[item.kind];
    const sc = item.scale ?? 1.0;
    return this.sceneData.items.some((other) => {
      if (other.id === item.id || other.kind === "label") return false;
      const [ow, od] = FURNITURE_SIZES[other.kind];
      const osc = other.scale ?? 1.0;
      return (
        Math.abs(item.x - other.x) < (w * sc + ow * osc) / 2 &&
        Math.abs(item.z - other.z) < (d * sc + od * osc) / 2
      );
    });
  }

  // ─── Ghost overlays ──────────────────────────────────────────────────────────

  private clearGhost() {
    this.ghostGroup.clear();
    this.ghostLine = null;
    this.ghostRect = null;
    this.ghostDim = null;
  }

  private showWallGhost(a: Vec2, b: Vec2) {
    this.clearGhost();
    const pts = [vec2ToV3(a, 0.01), vec2ToV3(b, 0.01)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: COLORS.ghost, linewidth: 2 });
    this.ghostLine = new THREE.Line(geo, mat);
    this.ghostGroup.add(this.ghostLine);

    // Dimension label
    const len = wallLen({ id: "", a, b });
    this.addDimSprite(`${len.toFixed(2)} m`, wallMid({ id: "", a, b }), 0.03);
  }

  private showRoomGhost(a: Vec2, b: Vec2) {
    this.clearGhost();
    const x = Math.min(a[0], b[0]);
    const z = Math.min(a[1], b[1]);
    const w = Math.abs(b[0] - a[0]);
    const d = Math.abs(b[1] - a[1]);
    const geo = new THREE.BoxGeometry(w, 0.01, d);
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.ghost, transparent: true, opacity: 0.18 });
    this.ghostRect = new THREE.Mesh(geo, mat);
    this.ghostRect.position.set(x + w / 2, 0, z + d / 2);
    this.ghostGroup.add(this.ghostRect);
    this.addDimSprite(`${w.toFixed(1)} × ${d.toFixed(1)} m`, [(x + x + w) / 2, (z + z + d) / 2], 0.03);
  }

  private addDimSprite(text: string, pos: Vec2, _scale: number) {
    // Use a canvas texture for the label
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(205,236,82,0.9)";
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();
    ctx.fillStyle = "#1e2019";
    ctx.font = "bold 26px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(pos[0], 0.4, pos[1]);
    sprite.scale.set(1.5, 0.4, 1);
    this.ghostGroup.add(sprite);
  }

  // ─── 3D scene rebuild ────────────────────────────────────────────────────────

  private getOrCreateTexture(materialId: string): THREE.Texture {
    let tex = this.textureCache.get(materialId);
    if (!tex) {
      tex = createProceduralTexture(materialId);
      this.textureCache.set(materialId, tex);
    }
    return tex;
  }

  private getMaterialRepeat(materialId: string): number {
    const preset = BUILTIN_MATERIALS.find((m) => m.id === materialId);
    return preset?.repeatPerMetre ?? 1.0;
  }

  private getMaterialRoughness(materialId: string): number {
    const preset = BUILTIN_MATERIALS.find((m) => m.id === materialId);
    return preset?.roughness ?? 0.5;
  }

  private getMaterialMetalness(materialId: string): number {
    const preset = BUILTIN_MATERIALS.find((m) => m.id === materialId);
    return preset?.metalness ?? 0.0;
  }

  private updateGizmoAttachment() {
    if (!this.transformControls) return;
    if (this.activeView !== "top" && this.selectedId) {
      if (this.selectedType === "item") {
        const obj = this.itemGroup.getObjectByName("item-" + this.selectedId);
        if (obj) {
          this.transformControls.attach(obj);
          return;
        }
      } else if (this.selectedType === "camera") {
        const obj = this.cameraMarkerGroup.getObjectByName("camera-" + this.selectedId);
        if (obj) {
          this.transformControls.attach(obj);
          return;
        }
      }
    }
    this.transformControls.detach();
  }

  private syncFromGizmo() {
    if (!this.selectedId) return;

    if (this.selectedType === "item") {
      const obj = this.itemGroup.getObjectByName("item-" + this.selectedId);
      if (!obj) return;

      // F-2: Clamp position — prevent items from going below the floor or outside canvas bounds
      const [clampedX, clampedZ] = this.clampToBounds([obj.position.x, obj.position.z]);
      const clampedY = Math.max(0, obj.position.y); // never below floor plane
      obj.position.set(clampedX, clampedY, clampedZ);

      const items = this.sceneData.items.map((it) => {
        if (it.id === this.selectedId) {
          return {
            ...it,
            x: clampedX,
            z: clampedZ,
            rot: obj.rotation.y,
            scale: obj.scale.x,
          };
        }
        return it;
      });
      this.sceneData = { ...this.sceneData, items };
      this.syncActiveFloorScene();
    } else if (this.selectedType === "camera") {
      const obj = this.cameraMarkerGroup.getObjectByName("camera-" + this.selectedId);
      if (!obj) return;
      const currentFloor = this.projectData.floors.find((f) => f.id === this.projectData.activeFloorId);
      const activeElevation = currentFloor?.elevationM ?? 0;
      const [clampedX, clampedZ] = this.clampToBounds([obj.position.x, obj.position.z]);
      const clampedY = Math.max(0.2, obj.position.y - activeElevation);
      obj.position.set(clampedX, activeElevation + clampedY, clampedZ);

      const cameras = (this.sceneData.virtualCameras ?? []).map((c) => {
        if (c.id === this.selectedId) {
          return {
            ...c,
            position: [clampedX, clampedZ] as Vec2,
            heightM: clampedY,
          };
        }
        return c;
      });
      this.sceneData = { ...this.sceneData, virtualCameras: cameras };
      this.syncActiveFloorScene();
    }
  }

  // ─── 3D scene rebuild ────────────────────────────────────────────────────────

  rebuildScene() {
    this.wallGroup.clear();
    this.roomGroup.clear();
    this.openingGroup.clear();
    this.itemGroup.clear();
    this.dimGroup.clear();
    this.cameraMarkerGroup.clear();

    // Dispose old floor slab geometry/materials before clearing
    this.floorSlabGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          (obj.material as THREE.Material)?.dispose();
        }
      }
    });
    this.floorSlabGroup.clear();

    const currentFloor = this.projectData.floors.find((f) => f.id === this.projectData.activeFloorId);
    const activeElevation = currentFloor?.elevationM ?? 0;

    // In 3D views: render floor slabs for all levels & inactive floors as ghosts
    // In 2D top view: show ONLY the active floor so user can interact without clutter
    if (this.activeView !== "top") {
      for (const fl of this.projectData.floors) {
        const isActive = fl.id === this.projectData.activeFloorId;
        this.buildFloorSlab(fl, !isActive);
        if (!isActive) {
          fl.scene.rooms.forEach((r) => this.buildRoom3d(r, fl.elevationM, true));
          fl.scene.walls.forEach((w) => this.buildWall3d(w, fl.elevationM, true));
          fl.scene.openings.forEach((o) => this.buildOpening3d(o, fl.elevationM, true));
          fl.scene.items.forEach((it) => this.buildItem3d(it, fl.elevationM, true));
        }
      }
    }

    // Render active floor at its elevation
    this.sceneData.rooms.forEach((r) => this.buildRoom3d(r, activeElevation, false));
    this.sceneData.walls.forEach((w) => this.buildWall3d(w, activeElevation, false));
    this.sceneData.openings.forEach((o) => this.buildOpening3d(o, activeElevation, false));
    this.sceneData.items.forEach((it) => this.buildItem3d(it, activeElevation, false));
    this.sceneData.virtualCameras?.forEach((cam) => this.buildCameraMarker3d(cam));

    this.updateGizmoAttachment();
    this.rebuildBoundsOutline();
    this.autosave();
  }

  private buildFloorSlab(floor: FloorLevel, isGhost = false) {
    const cb = floor.scene.canvas ?? this.getCanvasBounds();
    const width = cb.widthM;
    const depth = cb.depthM;
    const thickness = 0.18; // solid architectural slab

    const geo = new THREE.BoxGeometry(width, thickness, depth);
    let mat: THREE.Material;
    if (isGhost) {
      mat = new THREE.MeshStandardMaterial({
        color: 0xd9d7cd,
        roughness: 0.9,
        metalness: 0.05,
        transparent: true,
        opacity: 0.25,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: 0xede9df,
        roughness: 0.75,
        metalness: 0.05,
      });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, floor.elevationM - thickness / 2, 0);
    mesh.receiveShadow = true;
    mesh.name = `floor-slab-${floor.id}`;

    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: isGhost ? 0x9f9d94 : 0xb5b3a8,
      transparent: isGhost,
      opacity: isGhost ? 0.35 : 0.8,
    });
    const lines = new THREE.LineSegments(edges, lineMat);
    lines.position.copy(mesh.position);

    this.floorSlabGroup.add(mesh, lines);
  }

  /** Draw a dashed boundary outline for canvas bounds matching the exact centered drawing sheet. */
  private rebuildBoundsOutline() {
    // Remove old bounds outline if any
    const old = this.scene3d.getObjectByName("canvas-bounds");
    if (old) this.scene3d.remove(old);

    const cb = this.getCanvasBounds();
    const halfW = cb.widthM / 2;
    const halfD = cb.depthM / 2;
    const corners = [
      new THREE.Vector3(-halfW, 0.015, -halfD),
      new THREE.Vector3(halfW, 0.015, -halfD),
      new THREE.Vector3(halfW, 0.015, halfD),
      new THREE.Vector3(-halfW, 0.015, halfD),
      new THREE.Vector3(-halfW, 0.015, -halfD),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(corners);
    const mat = new THREE.LineDashedMaterial({ color: COLORS.canvasBounds, dashSize: 0.3, gapSize: 0.15, linewidth: 1 });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    line.name = "canvas-bounds";
    this.scene3d.add(line);
  }

  private buildWall3d(wall: Wall, yOffset = 0, isGhost = false) {
    const len = wallLen(wall);
    if (len < 0.01) return;
    const dir = wallDir(wall);
    const mid = wallMid(wall);
    const h = wall.height ?? WALL_HEIGHT;
    const thick = wall.thickness ?? WALL_THICKNESS;
    const angle = Math.atan2(-dir.z, dir.x);

    if (isGhost) {
      const geo = new THREE.BoxGeometry(len, h, thick);
      const mat = new THREE.MeshBasicMaterial({
        color: COLORS.wallSide,
        transparent: true,
        opacity: 0.25,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.y = angle;
      mesh.position.set(mid[0], yOffset + h / 2, mid[1]);
      this.wallGroup.add(mesh);
      return;
    }

    const wallColor = wall.color ?? COLORS.wallSide;
    const mat = new THREE.MeshLambertMaterial({ color: wallColor });

    // Openings on this wall (Feature C.5: split-geometry cutouts)
    const wallOpenings = this.sceneData.openings.filter((o) => {
      if (o.wallId === wall.id) return true;
      const dx = wall.b[0] - wall.a[0];
      const dz = wall.b[1] - wall.a[1];
      const l2 = dx * dx + dz * dz;
      if (l2 === 0) return false;
      const t = ((o.at[0] - wall.a[0]) * dx + (o.at[1] - wall.a[1]) * dz) / l2;
      if (t < -0.05 || t > 1.05) return false;
      const px = wall.a[0] + t * dx;
      const pz = wall.a[1] + t * dz;
      const dist = Math.hypot(o.at[0] - px, o.at[1] - pz);
      return dist <= thick + 0.25;
    });

    if (wallOpenings.length === 0) {
      // Solid wall
      const geo = new THREE.BoxGeometry(len, h, thick);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.y = angle;
      mesh.position.set(mid[0], yOffset + h / 2, mid[1]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.wallGroup.add(mesh);
    } else {
      // Split geometry cutout
      const dx = wall.b[0] - wall.a[0];
      const dz = wall.b[1] - wall.a[1];
      interface CutoutInterval {
        sStart: number;
        sEnd: number;
        opening: Opening;
      }
      const intervals: CutoutInterval[] = [];
      for (const op of wallOpenings) {
        const sCenter = ((op.at[0] - wall.a[0]) * dx + (op.at[1] - wall.a[1]) * dz) / len;
        const halfW = op.w / 2;
        const sStart = Math.max(0, sCenter - halfW);
        const sEnd = Math.min(len, sCenter + halfW);
        if (sEnd > sStart) {
          intervals.push({ sStart, sEnd, opening: op });
        }
      }
      intervals.sort((a, b) => a.sStart - b.sStart);

      let currentS = 0;
      for (const inv of intervals) {
        if (inv.sStart - currentS > 0.02) {
          const segLen = inv.sStart - currentS;
          const segMid = currentS + segLen / 2;
          const segGeo = new THREE.BoxGeometry(segLen, h, thick);
          const segMesh = new THREE.Mesh(segGeo, mat);
          segMesh.rotation.y = angle;
          segMesh.position.set(
            wall.a[0] + dir.x * segMid,
            yOffset + h / 2,
            wall.a[1] + dir.z * segMid
          );
          segMesh.castShadow = true;
          segMesh.receiveShadow = true;
          this.wallGroup.add(segMesh);
        }

        // Sill & Header panels
        const openH = inv.opening.h ?? (inv.opening.type === "window" ? 1.2 : h);
        const sill = inv.opening.sillHeight ?? (inv.opening.type === "window" ? 0.9 : 0);
        const openLen = inv.sEnd - inv.sStart;
        const openMid = inv.sStart + openLen / 2;
        const openPosX = wall.a[0] + dir.x * openMid;
        const openPosZ = wall.a[1] + dir.z * openMid;

        if (sill > 0.01) {
          const sillGeo = new THREE.BoxGeometry(openLen, sill, thick);
          const sillMesh = new THREE.Mesh(sillGeo, mat);
          sillMesh.rotation.y = angle;
          sillMesh.position.set(openPosX, yOffset + sill / 2, openPosZ);
          sillMesh.castShadow = true;
          sillMesh.receiveShadow = true;
          this.wallGroup.add(sillMesh);
        }

        const topRemain = h - (sill + openH);
        if (topRemain > 0.01) {
          const headerGeo = new THREE.BoxGeometry(openLen, topRemain, thick);
          const headerMesh = new THREE.Mesh(headerGeo, mat);
          headerMesh.rotation.y = angle;
          headerMesh.position.set(openPosX, yOffset + sill + openH + topRemain / 2, openPosZ);
          headerMesh.castShadow = true;
          headerMesh.receiveShadow = true;
          this.wallGroup.add(headerMesh);
        }

        currentS = Math.max(currentS, inv.sEnd);
      }

      // Final segment to wall.b
      if (len - currentS > 0.02) {
        const segLen = len - currentS;
        const segMid = currentS + segLen / 2;
        const segGeo = new THREE.BoxGeometry(segLen, h, thick);
        const segMesh = new THREE.Mesh(segGeo, mat);
        segMesh.rotation.y = angle;
        segMesh.position.set(
          wall.a[0] + dir.x * segMid,
          yOffset + h / 2,
          wall.a[1] + dir.z * segMid
        );
        segMesh.castShadow = true;
        segMesh.receiveShadow = true;
        this.wallGroup.add(segMesh);
      }
    }

    // Top edge highlight
    const edgeGeo = new THREE.BoxGeometry(len, 0.04, thick + 0.01);
    const edgeMat = new THREE.MeshBasicMaterial({ color: COLORS.wallTop });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    edgeMesh.rotation.y = angle;
    edgeMesh.position.set(mid[0], yOffset + h - 0.02, mid[1]);
    this.wallGroup.add(edgeMesh);

    // Selection highlight
    if (wall.id === this.selectedId) {
      const selectGeo = new THREE.BoxGeometry(len + 0.05, h + 0.05, thick + 0.05);
      const selectMat = new THREE.MeshBasicMaterial({ color: COLORS.selected, wireframe: true });
      const selectMesh = new THREE.Mesh(selectGeo, selectMat);
      selectMesh.rotation.y = angle;
      selectMesh.position.set(mid[0], yOffset + h / 2, mid[1]);
      this.wallGroup.add(selectMesh);
    }

    // Endpoint handles (visible in select mode)
    if (this.activeTool === "select") {
      for (const ep of [wall.a, wall.b]) {
        const hGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const hMesh = new THREE.Mesh(hGeo, hMat);
        hMesh.position.set(ep[0], yOffset + 0.12, ep[1]);
        this.wallGroup.add(hMesh);
      }
    }

    // Dimension label
    const dimPos: Vec2 = [mid[0], mid[1]];
    this.addSceneDim(`${len.toFixed(2)}m`, dimPos, yOffset + 0.3);
  }

  private buildRoom3d(room: Room, yOffset = 0, isGhost = false) {
    const geo = new THREE.BoxGeometry(room.w, 0.02, room.d);
    let mat: THREE.Material;
    if (isGhost) {
      mat = new THREE.MeshBasicMaterial({
        color: COLORS.roomFill,
        transparent: true,
        opacity: 0.15,
      });
    } else if (room.materialId) {
      const tex = this.getOrCreateTexture(room.materialId);
      const repeat = this.getMaterialRepeat(room.materialId);
      tex.repeat.set(room.w * repeat, room.d * repeat);
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: this.getMaterialRoughness(room.materialId),
        metalness: this.getMaterialMetalness(room.materialId),
      });
    } else {
      mat = new THREE.MeshBasicMaterial({
        color: COLORS.roomFill,
        transparent: true,
        opacity: 0.5,
      });
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(room.x + room.w / 2, yOffset + 0.01, room.z + room.d / 2);
    mesh.receiveShadow = true;
    this.roomGroup.add(mesh);

    if (!isGhost) {
      // Room outline
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x98a878 });
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.copy(mesh.position);
      this.roomGroup.add(line);

      // Room label sprite
      this.addSceneDim(room.name, [room.x + room.w / 2, room.z + room.d / 2], yOffset + 0.15);
    }
  }

  private buildOpening3d(opening: Opening, yOffset = 0, isGhost = false) {
    const w = opening.w;
    const color = opening.type === "door" ? COLORS.door : COLORS.window;
    const openH = opening.h ?? (opening.type === "window" ? 1.2 : WALL_HEIGHT);
    const sill = opening.sillHeight ?? (opening.type === "window" ? 0.9 : 0);
    const geo = new THREE.BoxGeometry(w, openH, WALL_THICKNESS + 0.02);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: isGhost ? 0.2 : 0.65,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const y = yOffset + sill + openH / 2;
    mesh.position.set(opening.at[0], y, opening.at[1]);

    if (opening.wallId) {
      const wall = this.sceneData.walls.find((w) => w.id === opening.wallId);
      if (wall) {
        const dir = wallDir(wall);
        mesh.rotation.y = Math.atan2(-dir.z, dir.x);
      }
    }

    this.openingGroup.add(mesh);
  }

  private buildItem3d(item: Item, yOffset = 0, isGhost = false) {
    if (item.kind === "label") {
      if (!isGhost) this.addSceneDim(item.label ?? "Label", [item.x, item.z], yOffset + 0.3);
      return;
    }
    const [w, d] = FURNITURE_SIZES[item.kind];
    const sc = item.scale ?? 1.0;
    
    const group = new THREE.Group();
    group.name = "item-" + item.id;
    group.position.set(item.x, yOffset, item.z);
    group.rotation.y = item.rot;
    group.scale.set(sc, sc, sc);

    const isSelected = item.id === this.selectedId;
    const hasOverlap = this.checkOverlaps(item);
    const color = isSelected ? COLORS.selected : COLORS.furniture;
    const mat = new THREE.MeshLambertMaterial({ color });
    const lineMat = new THREE.LineBasicMaterial({ color: COLORS.furnitureEdge });

    if (item.kind === "sofa") {
      // Base
      const baseGeo = new THREE.BoxGeometry(w, 0.4, d);
      const baseMesh = new THREE.Mesh(baseGeo, mat);
      baseMesh.position.y = 0.2;
      group.add(baseMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), lineMat).translateY(0.2));
      
      // Backrest
      const backGeo = new THREE.BoxGeometry(w, 0.4, 0.2);
      const backMesh = new THREE.Mesh(backGeo, mat);
      backMesh.position.set(0, 0.6, -d/2 + 0.1);
      group.add(backMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(backGeo), lineMat).translateX(0).translateY(0.6).translateZ(-d/2 + 0.1));
      
      // Armrests
      const armGeo = new THREE.BoxGeometry(0.2, 0.6, d);
      const arm1 = new THREE.Mesh(armGeo, mat);
      arm1.position.set(-w/2 + 0.1, 0.3, 0);
      group.add(arm1);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(armGeo), lineMat).translateX(-w/2 + 0.1).translateY(0.3));

      const arm2 = new THREE.Mesh(armGeo, mat);
      arm2.position.set(w/2 - 0.1, 0.3, 0);
      group.add(arm2);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(armGeo), lineMat).translateX(w/2 - 0.1).translateY(0.3));
    } else if (item.kind === "bed") {
      // Base
      const baseGeo = new THREE.BoxGeometry(w, 0.3, d);
      const baseMesh = new THREE.Mesh(baseGeo, mat);
      baseMesh.position.y = 0.15;
      group.add(baseMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), lineMat).translateY(0.15));

      // Headboard
      const headGeo = new THREE.BoxGeometry(w, 0.8, 0.1);
      const headMesh = new THREE.Mesh(headGeo, mat);
      headMesh.position.set(0, 0.4, -d/2 + 0.05);
      group.add(headMesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(headGeo), lineMat).translateY(0.4).translateZ(-d/2 + 0.05));
    } else {
      // Fallback
      const h = item.kind === "stairs" ? 1.4 : 0.75;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = h / 2;
      group.add(mesh);

      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.y = h / 2;
      group.add(line);
    }

    // Overlap warning — red wireframe bounding box
    if (hasOverlap) {
      const overlapGeo = new THREE.BoxGeometry(w + 0.05, 0.8, d + 0.05);
      const overlapMat = new THREE.MeshBasicMaterial({ color: COLORS.overlap, wireframe: true });
      const overlapMesh = new THREE.Mesh(overlapGeo, overlapMat);
      overlapMesh.position.y = 0.4;
      group.add(overlapMesh);
    }

    this.itemGroup.add(group);
  }

  private addSceneDim(text: string, pos: Vec2, yOffset: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 320, 80);
    ctx.fillStyle = "rgba(30,32,25,0.78)";
    ctx.roundRect(0, 0, 320, 80, 8);
    ctx.fill();
    ctx.fillStyle = "#f0f0e8";
    ctx.font = "bold 28px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 160, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(pos[0], yOffset, pos[1]);
    sprite.scale.set(2, 0.5, 1);
    this.dimGroup.add(sprite);
  }

  // ─── Virtual camera markers ───────────────────────────────────────────────────

  private buildCameraMarker3d(cam: VirtualCamera) {
    const isSelected = this.selectedId === cam.id;
    const markerColor = isSelected ? 0xcdec52 : COLORS.camera;
    const group = new THREE.Group();
    group.name = "camera-" + cam.id;

    const currentFloor = this.projectData.floors.find((f) => f.id === this.projectData.activeFloorId);
    const activeElevation = currentFloor?.elevationM ?? 0;

    const dx = cam.targetPosition[0] - cam.position[0];
    const dz = cam.targetPosition[1] - cam.position[1];
    const angle = Math.atan2(dx, dz);
    const fovRad = (cam.fov * Math.PI) / 180;
    const farDist = 3.0;

    if (this.activeView === "top") {
      // ── 2D Top-Down View Camera Marker ──
      const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24);
      const bodyMat = new THREE.MeshBasicMaterial({ color: markerColor });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.set(cam.position[0], activeElevation + 0.05, cam.position[1]);
      bodyMesh.userData = { type: "camera", camId: cam.id };
      bodyMesh.name = "camera-body-" + cam.id;
      group.add(bodyMesh);

      // Facing arrow/chevron pointing toward target
      const arrowLen = 0.5;
      const arrowPts = [
        new THREE.Vector3(
          cam.position[0] - Math.sin(angle + Math.PI / 2) * 0.2,
          activeElevation + 0.07,
          cam.position[1] - Math.cos(angle + Math.PI / 2) * 0.2
        ),
        new THREE.Vector3(
          cam.position[0] + Math.sin(angle) * arrowLen,
          activeElevation + 0.07,
          cam.position[1] + Math.cos(angle) * arrowLen
        ),
        new THREE.Vector3(
          cam.position[0] + Math.sin(angle + Math.PI / 2) * 0.2,
          activeElevation + 0.07,
          cam.position[1] + Math.cos(angle + Math.PI / 2) * 0.2
        ),
      ];
      const arrowGeo = new THREE.BufferGeometry().setFromPoints(arrowPts);
      const arrowMat = new THREE.LineBasicMaterial({ color: isSelected ? 0x191b13 : 0xffffff });
      group.add(new THREE.Line(arrowGeo, arrowMat));

      // Frustum field-of-view lines
      const frustumPts = [
        new THREE.Vector3(cam.position[0], activeElevation + 0.05, cam.position[1]),
        new THREE.Vector3(
          cam.position[0] + Math.sin(angle + fovRad / 2) * farDist,
          activeElevation + 0.05,
          cam.position[1] + Math.cos(angle + fovRad / 2) * farDist
        ),
        new THREE.Vector3(
          cam.position[0] + Math.sin(angle - fovRad / 2) * farDist,
          activeElevation + 0.05,
          cam.position[1] + Math.cos(angle - fovRad / 2) * farDist
        ),
        new THREE.Vector3(cam.position[0], activeElevation + 0.05, cam.position[1]),
      ];
      const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumPts);
      const frustumMat = new THREE.LineBasicMaterial({ color: markerColor, transparent: true, opacity: isSelected ? 0.8 : 0.45 });
      group.add(new THREE.Line(frustumGeo, frustumMat));

      // Target handle (look-at point)
      const targetGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
      const targetMat = new THREE.MeshBasicMaterial({ color: isSelected ? 0xcdec52 : 0x00d4ff });
      const targetMesh = new THREE.Mesh(targetGeo, targetMat);
      targetMesh.position.set(cam.targetPosition[0], activeElevation + 0.06, cam.targetPosition[1]);
      targetMesh.userData = { type: "camera-target", camId: cam.id };
      targetMesh.name = "camera-target-" + cam.id;
      group.add(targetMesh);

      // Dashed aim line connecting camera to target
      const aimPts = [
        new THREE.Vector3(cam.position[0], activeElevation + 0.06, cam.position[1]),
        new THREE.Vector3(cam.targetPosition[0], activeElevation + 0.06, cam.targetPosition[1]),
      ];
      const aimGeo = new THREE.BufferGeometry().setFromPoints(aimPts);
      const aimMat = new THREE.LineDashedMaterial({ color: markerColor, dashSize: 0.2, gapSize: 0.1, transparent: true, opacity: 0.6 });
      const aimLine = new THREE.Line(aimGeo, aimMat);
      aimLine.computeLineDistances();
      group.add(aimLine);

      // Name label
      this.addSceneDim(cam.name, cam.position, activeElevation + 0.3);
    } else {
      // ── 3D View Camera Marker ──
      const camY = activeElevation + cam.heightM;

      const camGroup = new THREE.Group();
      camGroup.position.set(cam.position[0], camY, cam.position[1]);
      camGroup.rotation.y = angle;
      camGroup.name = "camera-" + cam.id;
      camGroup.userData = { type: "camera", camId: cam.id };

      const bodyGeo = new THREE.BoxGeometry(0.35, 0.24, 0.2);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: markerColor,
        roughness: 0.3,
        metalness: 0.2,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      camGroup.add(body);

      const lensGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.15, 16);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.8 });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.z = 0.16;
      camGroup.add(lens);

      group.add(camGroup);

      // 3D Frustum rays
      const frustumPts = [
        new THREE.Vector3(cam.position[0], camY, cam.position[1]),
        new THREE.Vector3(
          cam.position[0] + Math.sin(angle + fovRad / 2) * farDist,
          Math.max(activeElevation, camY - 0.8),
          cam.position[1] + Math.cos(angle + fovRad / 2) * farDist
        ),
        new THREE.Vector3(
          cam.position[0] + Math.sin(angle - fovRad / 2) * farDist,
          Math.max(activeElevation, camY - 0.8),
          cam.position[1] + Math.cos(angle - fovRad / 2) * farDist
        ),
        new THREE.Vector3(cam.position[0], camY, cam.position[1]),
      ];
      const frustumGeo = new THREE.BufferGeometry().setFromPoints(frustumPts);
      const frustumMat = new THREE.LineBasicMaterial({ color: markerColor, transparent: true, opacity: isSelected ? 0.7 : 0.35 });
      group.add(new THREE.Line(frustumGeo, frustumMat));

      // Target marker on floor
      const targetGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const targetMat = new THREE.MeshBasicMaterial({ color: isSelected ? 0xcdec52 : 0x00d4ff });
      const targetMesh = new THREE.Mesh(targetGeo, targetMat);
      targetMesh.position.set(cam.targetPosition[0], activeElevation + 0.12, cam.targetPosition[1]);
      targetMesh.userData = { type: "camera-target", camId: cam.id };
      targetMesh.name = "camera-target-" + cam.id;
      group.add(targetMesh);

      // Stand down to floor
      const polePts = [
        new THREE.Vector3(cam.position[0], activeElevation, cam.position[1]),
        new THREE.Vector3(cam.position[0], camY, cam.position[1]),
      ];
      const poleGeo = new THREE.BufferGeometry().setFromPoints(polePts);
      const poleMat = new THREE.LineDashedMaterial({ color: 0x888888, dashSize: 0.15, gapSize: 0.1 });
      const poleLine = new THREE.Line(poleGeo, poleMat);
      poleLine.computeLineDistances();
      group.add(poleLine);
    }

    this.cameraMarkerGroup.add(group);
  }

  commitCamera(pos: Vec2, target?: Vec2): VirtualCamera {
    const count = (this.sceneData.virtualCameras?.length ?? 0) + 1;
    const clampedPos = this.clampToBounds(pos);
    let targetPos: Vec2;
    if (target && dist(clampedPos, target) > 0.1) {
      targetPos = this.clampToBounds(target);
    } else {
      const centerX = 0;
      const centerZ = 0;
      if (dist(clampedPos, [centerX, centerZ]) > 0.5) {
        targetPos = [centerX, centerZ];
      } else {
        targetPos = this.clampToBounds([clampedPos[0] + 2, clampedPos[1]]);
      }
    }
    const cam: VirtualCamera = {
      id: "cam-" + nanoid(),
      name: `Camera ${count}`,
      position: clampedPos,
      heightM: 1.6,
      targetPosition: targetPos,
      fov: 55,
    };
    this.addVirtualCamera(cam);
    this.selectedId = cam.id;
    this.selectedType = "camera";
    return cam;
  }

  private showCameraGhost(pos: Vec2, target: Vec2) {
    this.clearGhost();
    const fovRad = (55 * Math.PI) / 180;
    const farDist = 3.0;
    const dx = target[0] - pos[0];
    const dz = target[1] - pos[1];
    const angle = Math.atan2(dx, dz);

    const pts = [
      new THREE.Vector3(pos[0], 0.05, pos[1]),
      new THREE.Vector3(
        pos[0] + Math.sin(angle + fovRad / 2) * farDist,
        0.05,
        pos[1] + Math.cos(angle + fovRad / 2) * farDist
      ),
      new THREE.Vector3(
        pos[0] + Math.sin(angle - fovRad / 2) * farDist,
        0.05,
        pos[1] + Math.cos(angle - fovRad / 2) * farDist
      ),
      new THREE.Vector3(pos[0], 0.05, pos[1]),
      new THREE.Vector3(target[0], 0.05, target[1]),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: COLORS.camera, transparent: true, opacity: 0.8 });
    this.ghostLine = new THREE.Line(geo, mat);
    this.ghostGroup.add(this.ghostLine);
  }

  getCurrentViewpoint(): { position: Vec2; heightM: number; targetPosition: Vec2; fov: number } {
    if (this.activeView !== "top") {
      const currentFloor = this.projectData.floors.find((f) => f.id === this.projectData.activeFloorId);
      const activeElevation = currentFloor?.elevationM ?? 0;
      const pos = this.perspCamera.position;
      const target = this.controls?.target ?? new THREE.Vector3(0, 0, 0);
      return {
        position: [pos.x, pos.z],
        heightM: Math.max(0.2, pos.y - activeElevation),
        targetPosition: [target.x, target.z],
        fov: Math.round(this.perspCamera.fov),
      };
    }
    return {
      position: [0, 4],
      heightM: 1.6,
      targetPosition: [0, 0],
      fov: 55,
    };
  }

  /** Switch the perspective camera to the given virtual camera's viewpoint. */
  switchToCamera(cam: VirtualCamera) {
    const fromPos = this.perspCamera.position.clone();
    const toPos = new THREE.Vector3(cam.position[0], cam.heightM, cam.position[1]);
    const fromTarget = this.controls?.target.clone() ?? new THREE.Vector3(0, 0, 0);
    const toTarget = new THREE.Vector3(cam.targetPosition[0], 0, cam.targetPosition[1]);
    this.perspCamera.fov = cam.fov;
    this.perspCamera.updateProjectionMatrix();
    this.setView("perspective");
    this.tweenCamera(fromPos, toPos, fromTarget, toTarget);
  }

  /** High-resolution snapshot from a virtual camera. */
  captureFromCamera(cam: VirtualCamera, width = 2560, height = 1440): string {
    const prevW = this.canvas.clientWidth;
    const prevH = this.canvas.clientHeight;
    this.renderer.setSize(width, height, false);
    const prevFov = this.perspCamera.fov;
    this.perspCamera.fov = cam.fov;
    this.perspCamera.position.set(cam.position[0], cam.heightM, cam.position[1]);
    this.perspCamera.lookAt(cam.targetPosition[0], 0, cam.targetPosition[1]);
    this.perspCamera.updateProjectionMatrix();
    this.renderer.render(this.scene3d, this.perspCamera);
    const dataUrl = this.canvas.toDataURL("image/png");
    this.renderer.setSize(prevW, prevH, false);
    this.perspCamera.fov = prevFov;
    this.perspCamera.updateProjectionMatrix();
    return dataUrl;
  }

  /** Add a virtual camera to the scene. */
  addVirtualCamera(cam: VirtualCamera) {
    const cameras = [...(this.sceneData.virtualCameras ?? []), cam];
    this.sceneData = { ...this.sceneData, virtualCameras: cameras };
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  /** Remove a virtual camera by id. */
  removeVirtualCamera(id: string) {
    const cameras = (this.sceneData.virtualCameras ?? []).filter((c) => c.id !== id);
    this.sceneData = { ...this.sceneData, virtualCameras: cameras };
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  // ─── Nearest wall helper ─────────────────────────────────────────────────────

  private nearestWall(pos: Vec2, threshold: number): Wall | null {
    let best: Wall | null = null;
    let bestDist = threshold;
    for (const wall of this.sceneData.walls) {
      const l2 = (wall.a[0] - wall.b[0]) ** 2 + (wall.a[1] - wall.b[1]) ** 2;
      if (l2 === 0) continue;
      let t = ((pos[0] - wall.a[0]) * (wall.b[0] - wall.a[0]) + (pos[1] - wall.a[1]) * (wall.b[1] - wall.a[1])) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = wall.a[0] + t * (wall.b[0] - wall.a[0]);
      const projZ = wall.a[1] + t * (wall.b[1] - wall.a[1]);
      const dx = pos[0] - projX;
      const dz = pos[1] - projZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < bestDist) {
        bestDist = dist;
        best = wall;
      }
    }
    return best;
  }

  // ─── Undo / Redo ─────────────────────────────────────────────────────────────

  private pushHistory() {
    // Truncate forward history
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(JSON.parse(JSON.stringify(this.sceneData)));
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
    this.emit("history-change", { canUndo: this.historyIndex > 0, canRedo: false });
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.sceneData = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
    this.emit("history-change", {
      canUndo: this.historyIndex > 0,
      canRedo: this.historyIndex < this.history.length - 1,
    });
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.sceneData = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
    this.emit("history-change", {
      canUndo: this.historyIndex > 0,
      canRedo: this.historyIndex < this.history.length - 1,
    });
  }

  // ─── Scene data accessors ────────────────────────────────────────────────────

  getScene(): Scene {
    return this.sceneData;
  }

  loadScene(scene: Scene) {
    this.sceneData = scene;
    this.history = [];
    this.historyIndex = -1;
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  clearScene() {
    this.loadScene(emptyScene());
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  getSelectedType(): "item" | "wall" | "opening" | "camera" | "camera-target" | null {
    return this.selectedType;
  }

  // ─── Multi-floor Project Methods (Feature E) ─────────────────────────────────

  syncActiveFloorScene() {
    const f = this.projectData.floors.find((fl) => fl.id === this.projectData.activeFloorId);
    if (f) {
      f.scene = this.sceneData;
    }
  }

  getProject(): Project {
    this.syncActiveFloorScene();
    return this.projectData;
  }

  setProject(project: Project) {
    this.projectData = project;
    this.sceneData = activeFloor(project);
    this.history = [];
    this.historyIndex = -1;
    this.pushHistory();
    this.buildGrid(this.sceneData.canvas);
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  getActiveFloorId(): string {
    return this.projectData.activeFloorId;
  }

  getFloors(): FloorLevel[] {
    return this.projectData.floors;
  }

  setActiveFloor(floorId: string) {
    if (this.projectData.activeFloorId === floorId) return;
    this.syncActiveFloorScene();
    const targetFloor = this.projectData.floors.find((fl) => fl.id === floorId);
    if (!targetFloor) return;
    this.projectData.activeFloorId = floorId;
    this.sceneData = targetFloor.scene;
    this.history = [];
    this.historyIndex = -1;
    this.pushHistory();
    this.buildGrid(this.sceneData.canvas);
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  addFloor(name?: string): string {
    this.syncActiveFloorScene();
    const id = "floor-" + nanoid();
    const count = this.projectData.floors.length;
    const prevElevation = this.projectData.floors[count - 1]?.elevationM ?? 0;
    const newFloor: FloorLevel = {
      id,
      name: name ?? `Floor ${count}`,
      elevationM: prevElevation + 3.0,
      scene: {
        ...emptyScene(),
        canvas: this.sceneData.canvas ? { ...this.sceneData.canvas } : undefined,
      },
    };
    this.projectData.floors.push(newFloor);
    this.setActiveFloor(id);
    return id;
  }

  deleteFloor(floorId: string) {
    if (this.projectData.floors.length <= 1) return;
    this.syncActiveFloorScene();
    this.projectData.floors = this.projectData.floors.filter((fl) => fl.id !== floorId);
    if (this.projectData.activeFloorId === floorId) {
      this.setActiveFloor(this.projectData.floors[0].id);
    } else {
      this.rebuildScene();
      this.emit("scene-change", this.sceneData);
    }
  }

  // ─── 3D Gizmo Controls (Feature B2) ──────────────────────────────────────────

  setGizmoMode(mode: GizmoMode) {
    this.gizmoMode = mode;
    if (this.transformControls) {
      this.transformControls.setMode(mode);
    }
  }

  getGizmoMode(): GizmoMode {
    return this.gizmoMode;
  }

  // ─── Parametric mutations (Feature C.6 / H1.5 / H1.6) ─────────────────────────

  updateWall(id: string, updates: Partial<Wall>) {
    this.sceneData = {
      ...this.sceneData,
      walls: this.sceneData.walls.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    };
    this.syncActiveFloorScene();
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  updateOpening(id: string, updates: Partial<Opening>) {
    this.sceneData = {
      ...this.sceneData,
      openings: this.sceneData.openings.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    };
    this.syncActiveFloorScene();
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  updateItem(id: string, updates: Partial<Item>) {
    this.sceneData = {
      ...this.sceneData,
      items: this.sceneData.items.map((it) => (it.id === id ? { ...it, ...updates } : it)),
    };
    this.syncActiveFloorScene();
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  updateRoom(id: string, updates: Partial<Room>) {
    this.sceneData = {
      ...this.sceneData,
      rooms: this.sceneData.rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    };
    this.syncActiveFloorScene();
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  updateVirtualCamera(id: string, updates: Partial<VirtualCamera>) {
    this.sceneData = {
      ...this.sceneData,
      virtualCameras: (this.sceneData.virtualCameras ?? []).map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    };
    this.syncActiveFloorScene();
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  getVirtualCameras(): VirtualCamera[] {
    return this.sceneData.virtualCameras ?? [];
  }

  // ─── Autosave & Migration Shim (Feature E.8) ──────────────────────────────────

  private autosave() {
    try {
      this.syncActiveFloorScene();
      localStorage.setItem("sketch-space-v2", JSON.stringify(this.projectData));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sceneData));
    } catch {
      /* quota exceeded */
    }
  }

  private loadAutosave() {
    try {
      // 1. Check v2 Project format
      const v2 = localStorage.getItem("sketch-space-v2");
      if (v2) {
        const parsed = JSON.parse(v2) as Project;
        if (isProject(parsed) && parsed.floors.length > 0) {
          this.projectData = parsed;
          this.sceneData = activeFloor(parsed);
          this.buildGrid(this.sceneData.canvas);
          this.rebuildScene();
          this.pushHistory();
          this.emit("scene-change", this.sceneData);
          return;
        }
      }

      // 2. Fallback to v1 Scene format with automatic migration wrapper
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const legacyScene = JSON.parse(raw) as Scene;
        this.sceneData = legacyScene;
        this.projectData = {
          unit: "m",
          name: "Imported Project",
          activeFloorId: "floor-0",
          floors: [
            { id: "floor-0", name: "Ground Floor", elevationM: 0, scene: legacyScene },
          ],
        };
        this.buildGrid(legacyScene.canvas);
        this.rebuildScene();
        this.pushHistory();
        this.emit("scene-change", this.sceneData);
      } else {
        this.pushHistory();
      }
    } catch {
      this.pushHistory();
    }
  }

  // ─── Capture ─────────────────────────────────────────────────────────────────

  captureTopDown(): string {
    const prev = this.activeView;
    // Switch to top view for clean capture
    const prevBg = this.scene3d.background;
    this.scene3d.background = new THREE.Color(0xffffff);
    this.dimGroup.visible = true;
    this.renderer.render(this.scene3d, this.orthoCamera);
    const data = this.canvas.toDataURL("image/png");
    this.scene3d.background = prevBg;
    if (prev !== "top") this.setView(prev);
    return data;
  }

  capturePerspective(): string {
    const prevBg = this.scene3d.background;
    this.scene3d.background = new THREE.Color(0xd8e4f0);
    this.renderer.render(this.scene3d, this.perspCamera);
    const data = this.canvas.toDataURL("image/png");
    this.scene3d.background = prevBg;
    return data;
  }

  captureEyeLevel(): string {
    const saved = this.perspCamera.position.clone();
    this.perspCamera.position.set(0, EYE_LEVEL, 6);
    this.perspCamera.lookAt(0, EYE_LEVEL, 0);
    const data = this.canvas.toDataURL("image/png");
    this.perspCamera.position.copy(saved);
    return data;
  }

  // ─── SVG Export ──────────────────────────────────────────────────────────────

  exportSVG(): string {
    const SCALE = 50; // pixels per metre
    const MARGIN = 30;
    // Calculate bounds
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    const allPoints: Vec2[] = [];
    for (const w of this.sceneData.walls) {
      allPoints.push(w.a, w.b);
    }
    for (const r of this.sceneData.rooms) {
      allPoints.push([r.x, r.z], [r.x + r.w, r.z + r.d]);
    }
    if (!allPoints.length) allPoints.push([0, 0], [10, 10]);
    for (const [x, z] of allPoints) {
      minX = Math.min(minX, x); minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x); maxZ = Math.max(maxZ, z);
    }
    const W = (maxX - minX) * SCALE + MARGIN * 2;
    const H = (maxZ - minZ) * SCALE + MARGIN * 2;
    const px = (x: number) => (x - minX) * SCALE + MARGIN;
    const pz = (z: number) => (z - minZ) * SCALE + MARGIN;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    svg += `<rect width="${W}" height="${H}" fill="white"/>`;

    // Rooms
    for (const r of this.sceneData.rooms) {
      svg += `<rect x="${px(r.x)}" y="${pz(r.z)}" width="${r.w * SCALE}" height="${r.d * SCALE}" fill="#e8edcf" stroke="#98a878" stroke-width="1"/>`;
      svg += `<text x="${px(r.x + r.w / 2)}" y="${pz(r.z + r.d / 2)}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="11" fill="#333">${r.name}</text>`;
    }

    // Walls
    for (const w of this.sceneData.walls) {
      const thick = w.thickness ?? WALL_THICKNESS;
      svg += `<line x1="${px(w.a[0])}" y1="${pz(w.a[1])}" x2="${px(w.b[0])}" y2="${pz(w.b[1])}" stroke="#1e2019" stroke-width="${thick * SCALE}" stroke-linecap="round"/>`;
      // Dimension
      const len = wallLen(w);
      const mid = wallMid(w);
      svg += `<text x="${px(mid[0])}" y="${pz(mid[1]) - 6}" text-anchor="middle" font-family="system-ui" font-size="9" fill="#555">${len.toFixed(2)}m</text>`;
    }

    // Openings
    for (const o of this.sceneData.openings) {
      const col = o.type === "door" ? "#c9a87a" : "#7ab8d4";
      svg += `<circle cx="${px(o.at[0])}" cy="${pz(o.at[1])}" r="8" fill="${col}" opacity="0.8"/>`;
    }

    // Items
    for (const it of this.sceneData.items) {
      if (it.kind === "label") {
        svg += `<text x="${px(it.x)}" y="${pz(it.z)}" text-anchor="middle" font-family="system-ui" font-size="10" fill="#333">${it.label ?? ""}</text>`;
      } else {
        const [w, d] = FURNITURE_SIZES[it.kind];
        svg += `<rect x="${px(it.x - w / 2)}" y="${pz(it.z - d / 2)}" width="${w * SCALE}" height="${d * SCALE}" fill="#8a9a6a" opacity="0.6" stroke="#5a6a3a" stroke-width="0.8"/>`;
        svg += `<text x="${px(it.x)}" y="${pz(it.z)}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="7" fill="#2e3128">${it.kind}</text>`;
      }
    }

    svg += "</svg>";
    return svg;
  }

  // ─── GLB Export ──────────────────────────────────────────────────────────────

  exportGLB(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      // Export the entire scene group (walls + rooms + items)
      const exportGroup = new THREE.Group();
      exportGroup.add(this.wallGroup.clone());
      exportGroup.add(this.roomGroup.clone());
      exportGroup.add(this.itemGroup.clone());
      exporter.parse(
        exportGroup,
        (result) => {
          if (result instanceof ArrayBuffer) {
            resolve(result);
          } else {
            reject(new Error("GLB export: unexpected non-binary result"));
          }
        },
        (err) => reject(err),
        { binary: true }
      );
    });
  }

  // ─── WebM Walkthrough Recording ───────────────────────────────────────────────

  startWalkthrough(onStop: (blob: Blob) => void): boolean {
    if (this.isRecording) return false;
    this.recordedChunks = [];
    const stream = this.canvas.captureStream(30);
    const opts: MediaRecorderOptions = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? { mimeType: "video/webm;codecs=vp9" }
      : { mimeType: "video/webm" };
    this.mediaRecorder = new MediaRecorder(stream, opts);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: "video/webm" });
      onStop(blob);
      this.isRecording = false;
    };
    this.mediaRecorder.start(100);
    this.isRecording = true;

    // Animate camera path
    this.animateWalkthroughPath();
    return true;
  }

  stopWalkthrough() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
  }

  private animateWalkthroughPath() {
    // Simple orbit animation
    const duration = 12000;
    const start = Date.now();
    const radius = 12;
    const animate = () => {
      if (!this.isRecording) return;
      const elapsed = Date.now() - start;
      if (elapsed > duration) {
        this.stopWalkthrough();
        return;
      }
      const angle = (elapsed / duration) * Math.PI * 2;
      this.perspCamera.position.set(
        Math.sin(angle) * radius,
        EYE_LEVEL + 3,
        Math.cos(angle) * radius
      );
      this.perspCamera.lookAt(0, EYE_LEVEL / 2, 0);
      requestAnimationFrame(animate);
    };
    this.camera = this.perspCamera;
    animate();
  }

  // ─── Scene summary for API ────────────────────────────────────────────────────

  getSceneSummary(): string {
    const s = this.sceneData;
    const lines: string[] = [];
    lines.push(`Floor plan: ${s.walls.length} walls, ${s.rooms.length} rooms, ${s.items.length} furniture items.`);
    for (const r of s.rooms) {
      lines.push(`  Room "${r.name}": ${r.w.toFixed(1)}m × ${r.d.toFixed(1)}m`);
    }
    for (const it of s.items) {
      const [w, d] = FURNITURE_SIZES[it.kind];
      lines.push(`  ${it.kind}: ${w}×${d}m at (${it.x.toFixed(1)}, ${it.z.toFixed(1)})`);
    }
    return lines.join("\n");
  }
}
