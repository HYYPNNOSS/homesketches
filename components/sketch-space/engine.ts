/**
 * Three.js scene engine for Sketch Space.
 * Manages rendering, tools, camera modes, undo/redo, and autosave.
 * All operations are in metres. Y = up. X/Z = floor plane.
 */
import * as THREE from "three";
import { allObjects, hitObject, objectsInBox, expandSelection, clampMovement, translateObjects, copyObjects, pasteObjects, type SelectedObject } from "./selection";
import { normalizeProject, parseProject, sceneBounds, validateScene, moveJunction } from "./project-data";
import { workspaceOwner } from "../../lib/workspace-store";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MaterialLibrary, applyWorldUVs } from "./material-library";
import {
  Scene,
  TraceReference,
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
  CustomMaterial,
  itemSize,
  FURNITURE_HEIGHTS,
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

const DEFAULT_ITEM_COLORS: Partial<Record<FurnitureKind, number>> = {
  sofa: 0x8a9480, bed: 0x9fb0c4, chair: 0x8a9a6a, toilet: 0xf4f3ef, bath: 0xf4f3ef,
  kitchen: 0xf0efe9, tv: 0x1b1c1e, rug: 0xc9b9a3, wardrobe: 0xb48a5e, table: 0xb48a5e, plant: 0x4f7a46, stairs: 0xb48a5e,
};

// ─── Main Engine Class ────────────────────────────────────────────────────────

export type EngineEventType =
  | "scene-change"
  | "tool-change"
  | "view-change"
  | "history-change"
  | "selection-change"
  | "save-status"
  | "viewport-change"
  | "cursor-change"
  | "interaction-error"
  | "calibration-change";

type Listener = (data?: unknown) => void;

export interface SelectionChangeData {
  objects?: SelectedObject[];
  canPaste?: boolean;
  id: string | null;
  type: "item" | "wall" | "opening" | "camera" | "room" | null;
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
  private tweenFrame = 0;
  private walkthroughFrame = 0;
  private destroyed = false;
  private lastTick = performance.now();
  private listeners: Map<EngineEventType, Set<Listener>> = new Map();

  // Drawing state
  private sceneData: Scene = emptyScene();
  private projectData: Project = emptyProject();
  private history: Project[] = [];
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
  private materials!: MaterialLibrary;
  private envMap: THREE.Texture | null = null;

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
  private selectedType: "item" | "wall" | "opening" | "camera" | "room" | "camera-target" | null = null;
  private selectedObjects: SelectedObject[] = [];
  private selectionIds = new Set<string>();
  private calibration: {points: Vec2[]} | null = null;
  private clipboard: Scene | null = null;
  private pasteCount = 0;
  private groupDrag: {origin: Vec2; scene: Scene; objects: SelectedObject[]} | null = null;
  private marqueeStart: Vec2 | null = null;
  private marqueeAdditive = false;
  private isDragging = false;
  private dragOffset: Vec2 = [0, 0];
  private lengthOverride: number | null = null; // metres, typed by user

  // Wall endpoint dragging
  private draggingWallId: string | null = null;
  private draggingEndpoint: "a" | "b" | null = null;

  // Snap guide lines
  private snapGuideGroup = new THREE.Group();

  // 3D groups
  private referenceGroup = new THREE.Group();
  private calibrationGroup = new THREE.Group();
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
    this.projectData.id = nanoid();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMappingExposure = 1.0;
    this.materials = new MaterialLibrary(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()), () => { /* render loop picks up new maps */ });

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
      this.referenceGroup,
      this.calibrationGroup,
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

    // Lights — image-based lighting (used in 3D views) plus a soft key light.
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.envMap = pmrem.fromScene(room, 0.04).texture;
      room.dispose(); pmrem.dispose();
    } catch { this.envMap = null; }
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    ambient.name = "ambient";
    const hemi = new THREE.HemisphereLight(0xf3f6ff, 0xd9cdb8, 0.0);
    hemi.name = "hemi";
    const sun = new THREE.DirectionalLight(0xfff4e2, 1.2);
    sun.name = "sun";
    sun.position.set(10, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
    this.scene3d.add(ambient, hemi, sun);

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
    this.setView("top");
    this.fitToPlan();
    this.tick();
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  destroy() {
    this.destroyed = true;
    this.stopWalkthrough();
    cancelAnimationFrame(this.walkthroughFrame);
    cancelAnimationFrame(this.tweenFrame);
    cancelAnimationFrame(this.frameId);
    if (this.transformControls) {
      // Three.js r169's dispose() calls traverse() on the Controls instance,
      // but only its Object3D helper has traverse(). Release both explicitly.
      this.transformControls.detach();
      this.transformControls.disconnect();
      if (this.transformControlsHelper) {
        this.transformControlsHelper.traverse((child) => {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((material) => material.dispose());
          }
        });
        this.scene3d.remove(this.transformControlsHelper);
        this.transformControlsHelper = null;
      }
      this.transformControls = null;
    }
    this.controls?.dispose();
    this.releaseGroup(this.scene3d);
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
    this.materials.dispose();
    this.envMap?.dispose();
    this.renderer.dispose();
    this.listeners.clear();
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

    const delta = Math.min((performance.now() - this.lastTick) / 1000, .05);
    this.lastTick = performance.now();
    // Apply eye-level manual movement
    if (this.activeView === "eye-level" && this.controls) {
      const speed = 9 * delta;
      const rotSpeed = 1.8 * delta;
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

    if (!this.isRecording) this.controls?.update();
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

    const half = 10;
    this.orthoCamera.left = -half * aspect;
    this.orthoCamera.right = half * aspect;
    this.orthoCamera.top = half;
    this.orthoCamera.bottom = -half;
    this.orthoCamera.updateProjectionMatrix();

    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();
    this.emit("viewport-change", this.viewportInfo());
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
    if (![b.widthM,b.depthM,b.gridStep].every(Number.isFinite) || b.widthM < 2 || b.depthM < 2 || b.gridStep <= 0) throw new Error("Enter valid positive canvas dimensions.");
    for (const floor of this.getProject().floors) {
      const bounds=sceneBounds(floor.scene);
      if (bounds && (bounds.minX < -b.widthM/2 || bounds.maxX > b.widthM/2 || bounds.minZ < -b.depthM/2 || bounds.maxZ > b.depthM/2)) throw new Error("These bounds would exclude part of your design. Choose a larger canvas.");
    }
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
    cancelAnimationFrame(this.tweenFrame);
    const start = performance.now();
    const animate = () => {
      if (this.destroyed) return;
      const t = Math.min(1, (performance.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      this.perspCamera.position.lerpVectors(fromPos, toPos, eased);
      if (this.controls) {
        this.controls.target.lerpVectors(fromTarget, toTarget, eased);
      }
      if (t < 1) this.tweenFrame = requestAnimationFrame(animate);
    };
    this.tweenFrame = requestAnimationFrame(animate);
  }

  setView(mode: ViewMode) {
    cancelAnimationFrame(this.tweenFrame);
    const prevMode = this.activeView;
    const previousTarget = this.controls?.target.clone() ?? new THREE.Vector3();
    this.controls?.dispose();
    this.controls = null;
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
      // Look down steeply enough (~57°) that 2.7 m walls don't hide the floors.
      const cbv = this.getCanvasBounds(), r = Math.max(8, Math.max(cbv.widthM, cbv.depthM));
      const toPos = new THREE.Vector3(r * 0.45, r * 1.25, r * 0.7);
      const fromTarget = previousTarget;
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
      const fromTarget = previousTarget;
      const toTarget = new THREE.Vector3(0, EYE_LEVEL, 0);
      this.scene3d.background = new THREE.Color(0xd8e4f0);
      this.setupControls();
      if (prevMode !== "eye-level") {
        this.tweenCamera(fromPos, toPos, fromTarget, toTarget);
      } else {
        this.perspCamera.position.copy(toPos);
      }
    }
    this.applyLighting(mode);
    this.onResize();
    if (prevMode !== mode) {
      this.rebuildScene();
    }
    this.emit("view-change", mode);
  }

  /** 2D keeps the flat drafting look; 3D views get tone mapping + IBL. */
  private applyLighting(mode: ViewMode) {
    const flat = mode === "top";
    const ambient = this.scene3d.getObjectByName("ambient") as THREE.AmbientLight | undefined;
    const hemi = this.scene3d.getObjectByName("hemi") as THREE.HemisphereLight | undefined;
    const sun = this.scene3d.getObjectByName("sun") as THREE.DirectionalLight | undefined;
    this.renderer.toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.scene3d.environment = flat ? null : this.envMap;
    this.scene3d.environmentIntensity = 0.55;
    if (ambient) ambient.intensity = flat ? 0.6 : 0.15;
    if (hemi) hemi.intensity = flat ? 0 : 0.45;
    if (sun) sun.intensity = flat ? 1.2 : 2.2;
  }

  private rebuildReference() {
    this.releaseGroup(this.referenceGroup);
    const ref=this.sceneData.reference;
    this.referenceGroup.visible=this.activeView==="top" && !!ref?.visible && !this.isRecording;
    this.calibrationGroup.visible=this.activeView==="top" && !this.isRecording;
    if(!ref)return;
    const texture=this.getOrCreateTexture(ref.dataUrl,"trace"); texture.repeat.set(1,1);
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:ref.opacity,depthWrite:false});
    const image=new THREE.Mesh(new THREE.PlaneGeometry(ref.widthM,ref.depthM),material);
    image.rotation.x=-Math.PI/2;
    const elevation=this.getFloors().find(f=>f.id===this.getActiveFloorId())?.elevationM??0;
    image.position.set(ref.center[0],elevation+.035,ref.center[1]);image.name="locked-trace-reference";
    this.referenceGroup.add(image);
  }

  setReference(reference: TraceReference | undefined) {
    const candidate={...this.sceneData,reference};
    if(!validateScene(candidate))throw new Error("The reference image or its dimensions are invalid.");
    const bounds=sceneBounds(candidate),canvas=this.getCanvasBounds();
    const widthM=Math.max(canvas.widthM,bounds?2*Math.max(Math.abs(bounds.minX),Math.abs(bounds.maxX)):0);
    const depthM=Math.max(canvas.depthM,bounds?2*Math.max(Math.abs(bounds.minZ),Math.abs(bounds.maxZ)):0);
    if(widthM>1000||depthM>1000)throw new Error("This scale would exceed the 1000m canvas limit. Check the measurement.");
    this.sceneData={...candidate,canvas:{...canvas,widthM,depthM}};
    this.pushHistory();this.buildGrid(this.sceneData.canvas);this.rebuildScene();this.emit("scene-change",this.sceneData);
  }

  startCalibration() {
    if(!this.sceneData.reference?.visible)throw new Error("Show a reference image before calibrating it.");
    this.setView("top");this.setTool("select");this.setSelection([]);
    this.calibration={points:[]};this.emit("calibration-change",[]);
  }

  cancelCalibration() { this.calibration=null;this.releaseGroup(this.calibrationGroup);this.emit("calibration-change",null); }

  private pickCalibration(point: Vec2) {
    const reference=this.sceneData.reference;
    if(!reference||!this.calibration)return;
    if(Math.abs(point[0]-reference.center[0])>reference.widthM/2 || Math.abs(point[1]-reference.center[1])>reference.depthM/2){this.emit("interaction-error","Pick a point inside the reference image.");return;}
    if(this.calibration.points.length===2)this.calibration.points=[];
    if(this.calibration.points.length&&dist(point,this.calibration.points[0])<.01){this.emit("interaction-error","Choose two different points.");return;}
    this.calibration.points.push(point);
    this.releaseGroup(this.calibrationGroup);
    const elevation=this.getFloors().find(f=>f.id===this.getActiveFloorId())?.elevationM??0;
    for(const p of this.calibration.points){const dot=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8),new THREE.MeshBasicMaterial({color:0x3b82f6,depthTest:false}));dot.position.set(p[0],elevation+.1,p[1]);dot.renderOrder=1000;this.calibrationGroup.add(dot);}
    if(this.calibration.points.length===2){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(this.calibration.points.map(p=>new THREE.Vector3(p[0],elevation+.1,p[1]))),new THREE.LineBasicMaterial({color:0x3b82f6,depthTest:false}));line.renderOrder=1000;this.calibrationGroup.add(line);}
    this.emit("calibration-change",[...this.calibration.points]);
  }

  applyCalibration(metres: number) {
    const ref=this.sceneData.reference,points=this.calibration?.points;
    if(!ref||!points||points.length!==2||!Number.isFinite(metres)||metres<=0)throw new Error("Pick two points and enter their real distance in metres.");
    const ratio=metres/dist(points[0],points[1]),anchor=points[0];
    this.setReference({...ref,widthM:ref.widthM*ratio,depthM:ref.depthM*ratio,center:[anchor[0]+(ref.center[0]-anchor[0])*ratio,anchor[1]+(ref.center[1]-anchor[1])*ratio],calibrated:true});
    this.cancelCalibration();this.fitToPlan();
  }

  viewportInfo() {
    const width = this.canvas.clientWidth || 1;
    const metres = (this.orthoCamera.right - this.orthoCamera.left) / this.orthoCamera.zoom;
    return { zoom: Math.round(this.orthoCamera.zoom * 100), metresPerPixel: metres / width };
  }

  fitToPlan() {
    cancelAnimationFrame(this.tweenFrame);
    const bounds = sceneBounds(this.sceneData);
    const cb = this.getCanvasBounds();
    const minX = bounds?.minX ?? -cb.widthM / 2, maxX = bounds?.maxX ?? cb.widthM / 2;
    const minZ = bounds?.minZ ?? -cb.depthM / 2, maxZ = bounds?.maxZ ?? cb.depthM / 2;
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const elevation = this.getFloors().find(f => f.id === this.getActiveFloorId())?.elevationM ?? 0;
    const aspect = (this.canvas.clientWidth || 1) / (this.canvas.clientHeight || 1);
    if (this.activeView === "top") {
      this.orthoCamera.zoom = Math.max(.05, Math.min(20, Math.min(20 * aspect / Math.max(maxX-minX, 1), 20 / Math.max(maxZ-minZ, 1)) / 1.25));
      this.orthoCamera.position.set(cx, elevation + 20, cz);
      this.orthoCamera.lookAt(cx, elevation, cz);
      this.controls?.target.set(cx, elevation, cz);
    } else {
      const size = Math.max(maxX-minX, maxZ-minZ, 4);
      this.perspCamera.position.set(cx + size, elevation + size * .8, cz + size);
      this.controls?.target.set(cx, elevation + 1, cz);
      this.perspCamera.lookAt(cx, elevation + 1, cz);
    }
    this.controls?.update(); this.onResize();
  }

  resetView() { this.setView("top"); this.fitToPlan(); }

  /** Zoom the 2D plan by `factor`, keeping the point under (clientX, clientY) fixed
   *  (defaults to the canvas centre). */
  zoomBy(factor: number, clientX?: number, clientY?: number) {
    if (this.activeView !== "top") return;
    cancelAnimationFrame(this.tweenFrame);
    const cam = this.orthoCamera;
    const before = cam.zoom;
    const after = Math.max(0.05, Math.min(20, before * factor));
    if (after === before) return;
    const rect = this.canvas.getBoundingClientRect();
    const nx = clientX === undefined ? 0 : ((clientX - rect.left) / (rect.width || 1)) * 2 - 1;
    const ny = clientY === undefined ? 0 : ((clientY - rect.top) / (rect.height || 1)) * 2 - 1;
    const halfW = (cam.right - cam.left) / 2, halfH = (cam.top - cam.bottom) / 2;
    const dx = nx * halfW * (1 / before - 1 / after);
    const dz = ny * halfH * (1 / before - 1 / after);
    cam.zoom = after;
    cam.position.x += dx; cam.position.z += dz;
    if (this.controls) { this.controls.target.x += dx; this.controls.target.z += dz; }
    cam.updateProjectionMatrix();
    this.onResize();
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
    this.releaseGroup(this.snapGuideGroup);

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
    this.canvas.focus({preventScroll:true});
    e.preventDefault();
    if(this.calibration){this.pickCalibration(worldToFloor(e,this.camera,this.canvas,this.raycaster));return;}
    this.canvas.setPointerCapture(e.pointerId);
    const pos = this.getFloorPos(e, true);
    this.handleToolDown(pos, e);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.activeView !== "top") return;
    this.emit("cursor-change", worldToFloor(e, this.camera, this.canvas, this.raycaster));
    if (!this.drawing && !this.isDragging && !this.draggingWallId && !this.groupDrag && !this.marqueeStart) return;
    const pos = this.getFloorPos(e, !this.groupDrag && !this.marqueeStart);
    this.handleToolMove(pos, e.shiftKey);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.activeView !== "top") return;
    if (e.button !== 0) return;
    const pos = this.getFloorPos(e, true);
    this.handleToolUp(pos, e.shiftKey);
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
  };

  private onWheel = (e: WheelEvent) => {
    if (this.activeView !== "top") return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom towards the cursor (trackpad pinch arrives as ctrl+wheel).
      const factor = Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.006);
      this.zoomBy(factor, e.clientX, e.clientY);
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
    if (e.target instanceof HTMLElement && (e.target.closest("input, textarea, select, [contenteditable=true], [role=dialog]"))) return;
    // Let focused buttons/links keep their native Space/Enter activation.
    if (e.code === "Space" && e.target instanceof HTMLElement && e.target.closest("button, a, summary")) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    const command = e.ctrlKey || e.metaKey;
    if (command && ["a","c","v","d"].includes(e.key.toLowerCase()) && this.canvas === document.activeElement) {
      e.preventDefault();
      if(e.key.toLowerCase()==="a") this.setSelection(allObjects(this.sceneData));
      if(e.key.toLowerCase()==="c") this.copySelection();
      if(e.key.toLowerCase()==="v") this.pasteSelection();
      if(e.key.toLowerCase()==="d") this.duplicateSelection();
      return;
    }
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
    if ((e.ctrlKey || e.metaKey) && key === "z") {
      e.preventDefault();
      if (e.shiftKey) this.redo(); else this.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && key === "y") {
      e.preventDefault(); this.redo(); return;
    }
    if (e.altKey) return;
    if (e.key === "Escape") {
      this.cancelTool(); this.setSelection([]);
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      this.deleteSelected();
    }
    // Navigation keys do not also activate drawing tools.
    if (this.activeView === "eye-level") return;
    // Tool shortcuts
    const shortcuts: Record<string, ToolKind> = {
      b: "box-select", w: "wall", r: "room", d: "door", n: "window", f: "furniture",
      l: "label", e: "eraser", v: "select", c: "camera",
    };
    if (!e.ctrlKey && !e.metaKey && shortcuts[key] && !(key === "r" && this.activeTool === "select")) {
      this.setTool(shortcuts[key]);
    }

    // Rotate furniture — only when select tool is active to avoid conflict with "R" → room shortcut (B-7)
    if (!e.ctrlKey && !e.metaKey && key === "r" && this.activeTool === "select") {
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
    if(this.calibration) this.cancelCalibration();
    this.drawing = false;
    this.wallStart = null;
    this.roomStart = null;
    this.cameraStart = null;
    if (this.groupDrag) { this.sceneData = this.groupDrag.scene; this.rebuildScene(); }
    this.groupDrag = null; this.marqueeStart = null;
    this.isDragging = false;
    this.draggingWallId = null;
    this.draggingEndpoint = null;
    this.releaseGroup(this.snapGuideGroup);
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
      case "box-select":
        this.marqueeStart = pos; this.marqueeAdditive = e.shiftKey; this.drawing = true;
        break;
      case "select":
        this.selectAt(pos, e);
        break;
    }
  }

  private handleToolMove(pos: Vec2, shiftKey: boolean) {
    if(this.marqueeStart) { this.showRoomGhost(this.marqueeStart,pos); return; }
    if(this.groupDrag) {
      const drag=this.groupDrag;
      try { this.sceneData=translateObjects(drag.scene,drag.objects,clampMovement(drag.scene,drag.objects,[pos[0]-drag.origin[0],pos[1]-drag.origin[1]])); this.rebuildScene(); }
      catch(e) { this.emit("interaction-error",e instanceof Error?e.message:"Could not move selection."); }
      return;
    }
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
    if(this.marqueeStart) {
      const objects=objectsInBox(this.sceneData,this.marqueeStart,pos);
      const next=this.marqueeAdditive?[...this.selectedObjects,...objects]:objects;
      this.marqueeStart=null;this.drawing=false;this.clearGhost();this.setTool("select");this.setSelection(next);return;
    }
    if(this.groupDrag) { this.groupDrag=null;this.pushHistory();this.emit("scene-change",this.sceneData);return; }
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
    const corners: Vec2[] = [[x,z],[x+w,z],[x+w,z+d],[x,z+d]];
    const walls = [...this.sceneData.walls];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i+1)%4];
      if (!walls.some(wall => (dist(wall.a,a)<.001 && dist(wall.b,b)<.001) || (dist(wall.a,b)<.001 && dist(wall.b,a)<.001))) walls.push({id:nanoid(), a,b});
    }
    this.sceneData = { ...this.sceneData, walls, rooms: [...this.sceneData.rooms, room] };
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
    this.lastPointerEvent = {clientX:e.clientX, clientY:e.clientY};
    const hit=hitObject(this.sceneData,pos);
    if(e.shiftKey) {
      if(hit) this.setSelection(this.selectedObjects.some(o=>o.id===hit.id)?this.selectedObjects.filter(o=>o.id!==hit.id):[...this.selectedObjects,hit],e);
      return;
    }
    if(hit && this.selectedObjects.length>1 && this.effectiveSelection().some(o=>o.id===hit.id)) {
      this.groupDrag={origin:pos,scene:structuredClone(this.sceneData),objects:this.effectiveSelection()};return;
    }
    // Junction handles retain their connected-wall editing behavior for a single selection.
    for(const wall of this.sceneData.walls) for(const endpoint of ["a","b"] as const) {
      if(dist(pos,wall[endpoint])<.25) { this.setSelection([{id:wall.id,type:"wall"}],e);this.draggingWallId=wall.id;this.draggingEndpoint=endpoint;return; }
    }
    const target=this.sceneData.virtualCameras?.find(c=>dist(pos,c.targetPosition)<.3);
    if(target && (!hit || hit.type==="room")) {
      this.setSelection([{id:target.id,type:"camera"}],e);this.selectedType="camera-target";this.isDragging=true;this.dragOffset=[pos[0]-target.targetPosition[0],pos[1]-target.targetPosition[1]];return;
    }
    if(!hit) { this.setSelection([]);this.marqueeStart=pos;this.marqueeAdditive=false;this.drawing=true;return; }
    this.setSelection([hit],e);
    if(hit.type==="item" || hit.type==="wall" || hit.type==="room" || hit.type==="opening") {
      this.groupDrag={origin:pos,scene:structuredClone(this.sceneData),objects:this.effectiveSelection()};
    } else {
      const camera=this.sceneData.virtualCameras?.find(c=>c.id===hit.id);
      if(camera) { this.isDragging=true;this.dragOffset=[pos[0]-camera.position[0],pos[1]-camera.position[1]]; }
    }
  }

  private effectiveSelection(): SelectedObject[] {
    return expandSelection(this.sceneData,this.selectedObjects);
  }

  private isSelected(id: string): boolean { return this.selectionIds.has(id); }

  setSelection(objects: SelectedObject[], event?: {clientX:number;clientY:number}) {
    this.selectedObjects=[...new Map(objects.map(o=>[o.id,o])).values()];
    const primary=this.selectedObjects.at(-1);
    this.selectedId=primary?.id??null;this.selectedType=primary?.type??null;
    this.rebuildScene();this.notifySelection(event);
  }

  private notifySelection(event?: {clientX:number;clientY:number}) {
    this.emit("selection-change",{id:this.selectedObjects.length===1?this.selectedId:null,type:this.selectedObjects.length===1?this.selectedType:null,objects:[...this.selectedObjects],canPaste:!!this.clipboard,screenX:event?.clientX??0,screenY:event?.clientY??0});
  }

  copySelection() {
    if(!this.selectedObjects.length)return;
    this.clipboard=copyObjects(this.sceneData,this.selectedObjects);this.pasteCount=0;this.notifySelection();
  }

  pasteSelection() {
    if(!this.clipboard)return;
    try {
      const result=pasteObjects(this.sceneData,this.clipboard,[.5*(this.pasteCount+1),.5*(this.pasteCount+1)]);
      this.pasteCount++;this.sceneData=result.scene;this.pushHistory();this.setSelection(result.selected);this.emit("scene-change",this.sceneData);
    }catch(e){this.emit("interaction-error",e instanceof Error?e.message:"Could not paste objects.");}
  }

  duplicateSelection() { this.copySelection();this.pasteSelection(); }

  moveSelection(dx: number, dz: number) {
    if(!Number.isFinite(dx)||!Number.isFinite(dz))return;
    try {const objects=this.effectiveSelection();this.sceneData=translateObjects(this.sceneData,objects,clampMovement(this.sceneData,objects,[dx,dz]));this.pushHistory();this.rebuildScene();this.emit("scene-change",this.sceneData);}
    catch(e){this.emit("interaction-error",e instanceof Error?e.message:"Could not move objects.");}
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
    this.sceneData = moveJunction(this.sceneData, this.draggingWallId, this.draggingEndpoint, clamped);
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
    const selected=this.selectedObjects.length?this.selectedObjects:this.selectedId?[{id:this.selectedId,type:this.selectedType as SelectedObject["type"]}]:[];
    if(!selected.length)return;
    const ids=new Set(expandSelection(this.sceneData,selected,false).map(o=>o.id));
    this.sceneData={...this.sceneData,walls:this.sceneData.walls.filter(w=>!ids.has(w.id)),rooms:this.sceneData.rooms.filter(r=>!ids.has(r.id)),items:this.sceneData.items.filter(i=>!ids.has(i.id)),openings:this.sceneData.openings.filter(o=>!ids.has(o.id)&&!ids.has(o.wallId??"")),virtualCameras:this.sceneData.virtualCameras?.filter(c=>!ids.has(c.id))};
    this.pushHistory();this.setSelection([]);this.emit("scene-change",this.sceneData);
  }

  // ─── Collision detection ──────────────────────────────────────────────────────

  private checkOverlaps(item: Item): boolean {
    if (item.kind === "label") return false;
    const [w, d] = itemSize(item);
    const sc = item.scale ?? 1.0;
    return this.sceneData.items.some((other) => {
      if (other.id === item.id || other.kind === "label" || other.kind === "rug" || item.kind === "rug") return false;
      const [ow, od] = itemSize(other);
      const osc = other.scale ?? 1.0;
      return (
        Math.abs(item.x - other.x) < (w * sc + ow * osc) / 2 &&
        Math.abs(item.z - other.z) < (d * sc + od * osc) / 2
      );
    });
  }

  // ─── Ghost overlays ──────────────────────────────────────────────────────────

  private clearGhost() {
    this.releaseGroup(this.ghostGroup);
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

  /** Cached image texture (used for the trace reference underlay). */
  private getOrCreateTexture(url: string, key = "shared"): THREE.Texture {
    const id = `${key}:${url.length}:${url.slice(-48)}`;
    let tex = this.textureCache.get(id);
    if (!tex) {
      tex = new THREE.TextureLoader().load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.textureCache.set(id, tex);
    }
    return tex;
  }

  private releaseGroup(group: THREE.Object3D) {
    const cached = new Set(this.textureCache.values());
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    group.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (this.materials?.owns(material)) continue; // shared library material
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture && !cached.has(value)) textures.add(value);
      }
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    group.clear();
  }

  private updateGizmoAttachment() {
    if (!this.transformControls) return;
    if (this.activeView !== "top" && this.selectedId && this.selectedObjects.length <= 1) {
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
    this.materials.setCustomMaterials(this.projectData.materials);
    this.selectionIds = new Set(this.effectiveSelection().map(o=>o.id));
    this.rebuildReference();
    this.releaseGroup(this.wallGroup);
    this.releaseGroup(this.roomGroup);
    this.releaseGroup(this.openingGroup);
    this.releaseGroup(this.itemGroup);
    this.releaseGroup(this.dimGroup);
    this.releaseGroup(this.cameraMarkerGroup);

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

    const mat: THREE.Material = this.materials.get(wall.materialId)
      ?? new THREE.MeshStandardMaterial({ color: wall.color ?? COLORS.wallSide, roughness: 0.88, metalness: 0 });

    // One box per solid piece of wall; UVs are in metres along the wall, so
    // textures continue across segments, sills and headers.
    const addPiece = (start: number, length: number, base: number, height: number) => {
      if (length <= 0.005 || height <= 0.005) return;
      const geo = applyWorldUVs(new THREE.BoxGeometry(length, height, thick), length, height, thick, start, base);
      const mesh = new THREE.Mesh(geo, mat);
      const at = start + length / 2;
      mesh.rotation.y = angle;
      mesh.position.set(wall.a[0] + dir.x * at, yOffset + base + height / 2, wall.a[1] + dir.z * at);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = `wall-${wall.id}`;
      this.wallGroup.add(mesh);
    };

    // Openings on this wall (split-geometry cutouts)
    const dx = wall.b[0] - wall.a[0];
    const dz = wall.b[1] - wall.a[1];
    const wallOpenings = this.sceneData.openings.filter((o) => {
      if (o.wallId === wall.id) return true;
      if (o.wallId && this.sceneData.walls.some(w => w.id === o.wallId)) return false;
      const l2 = dx * dx + dz * dz;
      if (l2 === 0) return false;
      const t = ((o.at[0] - wall.a[0]) * dx + (o.at[1] - wall.a[1]) * dz) / l2;
      if (t < -0.05 || t > 1.05) return false;
      const px = wall.a[0] + t * dx;
      const pz = wall.a[1] + t * dz;
      return Math.hypot(o.at[0] - px, o.at[1] - pz) <= thick + 0.25;
    });

    const intervals = wallOpenings.map(op => {
      const sCenter = ((op.at[0] - wall.a[0]) * dx + (op.at[1] - wall.a[1]) * dz) / len;
      return { sStart: Math.max(0, sCenter - op.w / 2), sEnd: Math.min(len, sCenter + op.w / 2), opening: op };
    }).filter(i => i.sEnd > i.sStart).sort((a, b) => a.sStart - b.sStart);

    let currentS = 0;
    for (const inv of intervals) {
      if (inv.sStart > currentS) addPiece(currentS, inv.sStart - currentS, 0, h);
      const from = Math.max(currentS, inv.sStart), openLen = inv.sEnd - from;
      const openH = inv.opening.h ?? (inv.opening.type === "window" ? 1.2 : 2.1);
      const sill = inv.opening.sillHeight ?? (inv.opening.type === "window" ? 0.9 : 0);
      addPiece(from, openLen, 0, Math.min(sill, h));
      addPiece(from, openLen, sill + openH, h - (sill + openH));
      currentS = Math.max(currentS, inv.sEnd);
    }
    addPiece(currentS, len - currentS, 0, h);

    // Top edge highlight
    const edgeGeo = new THREE.BoxGeometry(len, 0.04, thick + 0.01);
    const edgeMat = new THREE.MeshBasicMaterial({ color: COLORS.wallTop });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    edgeMesh.rotation.y = angle;
    edgeMesh.position.set(mid[0], yOffset + h - 0.012, mid[1]); // sits 8 mm proud of the wall top to avoid z-fighting
    this.wallGroup.add(edgeMesh);

    // Selection highlight
    if (this.isSelected(wall.id)) {
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

    // Dimension label (plan view only — in 3D it hides the model)
    if (this.activeView === "top") this.addSceneDim(`${len.toFixed(2)}m`, [mid[0], mid[1]], yOffset + 0.3);
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
    } else if (this.materials.get(room.materialId)) {
      applyWorldUVs(geo, room.w, 0.02, room.d, 0, 0, [room.x, -room.z - room.d]);
      mat = this.materials.get(room.materialId)!;
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
      const lineMat = new THREE.LineBasicMaterial({ color: this.isSelected(room.id) ? COLORS.selected : 0x98a878 });
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.copy(mesh.position);
      this.roomGroup.add(line);

      // Room label sprite
      this.addSceneDim(room.name, [room.x + room.w / 2, room.z + room.d / 2], yOffset + 0.15);
    }
  }

  private buildOpening3d(opening: Opening, yOffset = 0, isGhost = false) {
    const w = opening.w;
    const isDoor = opening.type === "door";
    const openH = opening.h ?? (isDoor ? 2.1 : 1.2);
    const sill = opening.sillHeight ?? (isDoor ? 0 : 0.9);
    const wall = opening.wallId ? this.sceneData.walls.find((x) => x.id === opening.wallId) : undefined;
    const thick = wall?.thickness ?? WALL_THICKNESS;
    const group = new THREE.Group();
    group.name = `opening-${opening.id}`;
    group.position.set(opening.at[0], yOffset + sill, opening.at[1]);
    if (wall) { const dir = wallDir(wall); group.rotation.y = Math.atan2(-dir.z, dir.x); }

    if (isGhost || this.activeView === "top") {
      const mat = new THREE.MeshBasicMaterial({ color: isDoor ? COLORS.door : COLORS.window, transparent: true, opacity: isGhost ? 0.2 : 0.65 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, openH, thick + 0.02), mat);
      mesh.position.y = openH / 2;
      group.add(mesh);
      if (this.isSelected(opening.id) && !isGhost) {
        const sel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, openH + 0.06, thick + 0.08), new THREE.MeshBasicMaterial({ color: COLORS.selected, wireframe: true }));
        sel.position.y = openH / 2; group.add(sel);
      }
      this.openingGroup.add(group);
      return;
    }

    // 3D: frame + leaf (door) or frame + mullion + glass (window).
    const frameMat = new THREE.MeshStandardMaterial({ color: this.isSelected(opening.id) ? COLORS.selected : (isDoor ? 0xe9e4da : 0xf2f2ef), roughness: 0.5 });
    const f = 0.05, depth = thick + 0.02;
    const box = (bw: number, bh: number, bd: number, x: number, y: number, z: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    box(f, openH, depth, -w / 2 + f / 2, openH / 2, 0, frameMat);
    box(f, openH, depth, w / 2 - f / 2, openH / 2, 0, frameMat);
    box(w, f, depth, 0, openH - f / 2, 0, frameMat);
    if (isDoor) {
      const leafMat = new THREE.MeshStandardMaterial({ color: this.isSelected(opening.id) ? COLORS.selected : 0xb98a5a, roughness: 0.55 });
      const leafW = w - 2 * f, leafH = openH - f;
      const leafGeo = applyWorldUVs(new THREE.BoxGeometry(leafW, leafH, 0.04), leafW, leafH, 0.04);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      // Hinged on the left jamb, shown slightly ajar so the opening reads in 3D.
      const hinge = new THREE.Group();
      hinge.position.set(-w / 2 + f, 0, 0);
      leaf.position.set(leafW / 2, leafH / 2, 0);
      leaf.castShadow = true; leaf.receiveShadow = true;
      hinge.add(leaf); hinge.rotation.y = -0.35;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0x8c8c8c, metalness: 0.9, roughness: 0.25 }));
      handle.rotation.z = Math.PI / 2; handle.position.set(leafW - 0.08, 1.0, 0.04);
      hinge.add(handle);
      group.add(hinge);
    } else {
      box(w, f, depth, 0, f / 2, 0, frameMat);
      box(w + 0.06, 0.03, depth + 0.08, 0, -0.015, 0, frameMat); // sill board
      if (w > 1.0) box(0.04, openH - 2 * f, 0.06, 0, openH / 2, 0, frameMat);
      const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfeef5, metalness: 0, roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.35, ior: 1.5, thickness: 0.01, envMapIntensity: 1.2 });
      const pane = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * f, openH - 2 * f, 0.012), glass);
      pane.position.y = openH / 2;
      group.add(pane);
    }
    this.openingGroup.add(group);
  }

  private buildItem3d(item: Item, yOffset = 0, isGhost = false) {
    if (item.kind === "label") {
      if (!isGhost) this.addSceneDim(item.label ?? "Label", [item.x, item.z], yOffset + 0.3);
      return;
    }
    const [w0, d0] = FURNITURE_SIZES[item.kind];
    const [w, d] = itemSize(item);
    const h0 = FURNITURE_HEIGHTS[item.kind];
    const sc = item.scale ?? 1.0;

    // Outer group: position / rotation / uniform scale (driven by the gizmo).
    // Inner group: non-uniform fit of the default model to custom w/d/h.
    const group = new THREE.Group();
    group.name = "item-" + item.id;
    group.position.set(item.x, yOffset, item.z);
    group.rotation.y = item.rot;
    group.scale.set(sc, sc, sc);
    const model = new THREE.Group();
    model.scale.set(w / w0, item.h ? item.h / h0 : 1, d / d0);
    group.add(model);

    const isSelected = this.isSelected(item.id);
    const hasOverlap = this.checkOverlaps(item);
    const flat = this.activeView === "top";
    const std = (color: number, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent: isGhost, opacity: isGhost ? 0.3 : 1 });
    const body = isSelected ? std(COLORS.selected) : flat ? new THREE.MeshLambertMaterial({ color: item.color ?? COLORS.furniture }) : std(item.color ?? DEFAULT_ITEM_COLORS[item.kind] ?? COLORS.furniture, 0.75);
    const accent = flat ? body : std(0x3b3a37, 0.5);
    const white = flat ? body : std(0xf4f3ef, 0.25);
    const wood = flat ? body : (this.materials.get("oak-wood") ?? body);
    const lineMat = new THREE.LineBasicMaterial({ color: COLORS.furnitureEdge });
    const box = (bw: number, bh: number, bd: number, x: number, y: number, z: number, m: THREE.Material = body) => {
      const geo = new THREE.BoxGeometry(bw, bh, bd);
      if (m === wood) applyWorldUVs(geo, bw, bh, bd);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z); mesh.castShadow = !isGhost; mesh.receiveShadow = true;
      model.add(mesh);
      if (flat) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat); e.position.copy(mesh.position); model.add(e); }
      return mesh;
    };
    const cyl = (r: number, hgt: number, x: number, y: number, z: number, m: THREE.Material = body, r2 = r) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r2, hgt, 24), m);
      mesh.position.set(x, y, z); mesh.castShadow = !isGhost; model.add(mesh); return mesh;
    };
    const legs = (lw: number, ld: number, lh: number, t = 0.04, m: THREE.Material = accent) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(t, lh, t, sx * (lw / 2 - t), lh / 2, sz * (ld / 2 - t), m);
    };

    switch (item.kind) {
      case "sofa":
        box(w0, 0.22, d0, 0, 0.17, 0); legs(w0, d0, 0.06);
        box(w0 - 0.4, 0.16, d0 - 0.25, 0, 0.36, 0.1); // seat cushions
        box(w0, 0.45, 0.2, 0, 0.5, -d0 / 2 + 0.1);
        box(0.2, 0.35, d0, -w0 / 2 + 0.1, 0.45, 0); box(0.2, 0.35, d0, w0 / 2 - 0.1, 0.45, 0);
        break;
      case "bed":
        box(w0, 0.25, d0, 0, 0.2, 0, wood); legs(w0, d0, 0.08);
        box(w0 - 0.06, 0.2, d0 - 0.1, 0, 0.42, 0.03, white); // mattress
        box(w0, 0.9, 0.08, 0, 0.45, -d0 / 2 + 0.04, wood);
        box(w0 * 0.38, 0.12, 0.35, -w0 * 0.22, 0.58, -d0 / 2 + 0.3, white); box(w0 * 0.38, 0.12, 0.35, w0 * 0.22, 0.58, -d0 / 2 + 0.3, white);
        box(w0 - 0.04, 0.05, d0 * 0.55, 0, 0.545, d0 * 0.2, body); // duvet
        break;
      case "table":
        box(w0, 0.04, d0, 0, 0.73, 0, wood); legs(w0 - 0.06, d0 - 0.06, 0.71, 0.05);
        break;
      case "chair":
        box(w0, 0.05, d0, 0, 0.45, 0, wood); legs(w0, d0, 0.43, 0.035);
        box(w0, 0.42, 0.04, 0, 0.66, -d0 / 2 + 0.02, wood);
        break;
      case "kitchen":
        box(w0, 0.86, d0 - 0.02, 0, 0.43, 0.01, white);
        box(w0, 0.04, d0, 0, 0.88, 0, std(0x2f3032, 0.3));
        box(0.5, 0.02, 0.4, w0 * 0.2, 0.9, 0, std(0xbfc3c7, 0.2, 0.9)); // sink
        for (let i = 0; i < 4; i++) cyl(0.09, 0.012, -w0 * 0.25 + (i % 2) * 0.25, 0.905, -0.1 + Math.floor(i / 2) * 0.22, accent);
        break;
      case "toilet":
        box(0.4, 0.38, 0.18, 0, 0.6, -d0 / 2 + 0.09, white);
        cyl(0.19, 0.4, 0, 0.2, 0.08, white, 0.15);
        break;
      case "bath":
        box(w0, 0.55, d0, 0, 0.275, 0, white);
        box(w0 - 0.12, 0.05, d0 - 0.12, 0, 0.53, 0, std(0xdbe6ea, 0.1));
        break;
      case "stairs": {
        const steps = 15, rise = h0 / steps, run = d0 / steps;
        for (let i = 0; i < steps; i++) box(w0, rise * (i + 1), run, 0, rise * (i + 1) / 2, -d0 / 2 + run * (i + 0.5), wood);
        break;
      }
      case "plant":
        cyl(0.16, 0.35, 0, 0.175, 0, std(0xb9775a, 0.8), 0.12);
        for (const [x, y, z, r] of [[0, 0.7, 0, 0.26], [0.1, 0.9, 0.05, 0.18], [-0.08, 0.85, -0.06, 0.2]] as const) {
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), flat ? body : std(0x4f7a46, 0.8));
          leaf.position.set(x, y, z); leaf.castShadow = !isGhost; model.add(leaf);
        }
        break;
      case "tv":
        box(w0 * 0.6, 0.04, 0.25, 0, 0.02, 0, accent);
        box(0.06, 0.2, 0.04, 0, 0.12, 0, accent);
        box(w0, 0.68, 0.04, 0, 0.55, 0, std(0x111214, 0.2));
        break;
      case "rug":
        box(w0, 0.015, d0, 0, 0.0075, 0, this.materials.get("cozy-carpet") && !flat ? this.materials.get("cozy-carpet")! : body);
        break;
      case "wardrobe":
        box(w0, h0, d0, 0, h0 / 2, 0, wood);
        box(0.01, h0 - 0.1, 0.01, 0, h0 / 2, d0 / 2, accent);
        cyl(0.012, 0.25, -0.06, 1.05, d0 / 2 + 0.02, accent); cyl(0.012, 0.25, 0.06, 1.05, d0 / 2 + 0.02, accent);
        break;
      default:
        box(w0, h0, d0, 0, h0 / 2, 0);
    }

    // Overlap warning — red wireframe bounding box
    if (hasOverlap) {
      const overlapMesh = new THREE.Mesh(new THREE.BoxGeometry(w0 + 0.05, 0.8, d0 + 0.05), new THREE.MeshBasicMaterial({ color: COLORS.overlap, wireframe: true }));
      overlapMesh.position.y = 0.4;
      model.add(overlapMesh);
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
    const isSelected = this.isSelected(cam.id);
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
    this.setSelection([{id:cam.id,type:"camera"}]);
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
    this.setView("perspective");
    cancelAnimationFrame(this.tweenFrame);
    const elevation = this.getFloors().find(f => f.id === this.getActiveFloorId())?.elevationM ?? 0;
    this.perspCamera.position.set(cam.position[0], elevation + cam.heightM, cam.position[1]);
    this.controls?.target.set(cam.targetPosition[0], elevation + cam.heightM, cam.targetPosition[1]);
    this.perspCamera.lookAt(cam.targetPosition[0], elevation + cam.heightM, cam.targetPosition[1]);
    this.perspCamera.fov = cam.fov; this.perspCamera.updateProjectionMatrix();
    this.controls?.update();
  }

  private capture(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, width = 1024, height = 768): string {
    const pixelRatio = this.renderer.getPixelRatio(), size = this.renderer.getSize(new THREE.Vector2());
    const background = this.scene3d.background;
    const helpers = [this.referenceGroup, this.calibrationGroup, this.cameraMarkerGroup, this.ghostGroup, this.snapGuideGroup, this.transformControlsHelper].filter((g): g is THREE.Object3D => !!g);
    const visibility = helpers.map(g => g.visible);
    try {
      helpers.forEach(g => { g.visible = false; });
      this.renderer.setPixelRatio(1); this.renderer.setSize(width, height, false);
      this.scene3d.background = new THREE.Color(0xf5f4ef);
      if (camera instanceof THREE.PerspectiveCamera) camera.aspect = width / height;
      camera.updateProjectionMatrix();
      this.renderer.render(this.scene3d, camera);
      return this.canvas.toDataURL("image/png");
    } finally {
      helpers.forEach((g, i) => { g.visible = visibility[i]; });
      this.scene3d.background = background;
      this.renderer.setPixelRatio(pixelRatio); this.renderer.setSize(size.x, size.y, false);
      this.renderer.render(this.scene3d, this.camera);
    }
  }

  captureFromCamera(cam: VirtualCamera, width = 2560, height = 1440): string {
    const camera = this.perspCamera.clone();
    const elevation = this.getFloors().find(f => f.id === this.getActiveFloorId())?.elevationM ?? 0;
    camera.fov = cam.fov;
    camera.position.set(cam.position[0], elevation + cam.heightM, cam.position[1]);
    camera.lookAt(cam.targetPosition[0], elevation + cam.heightM, cam.targetPosition[1]);
    return this.capture(camera, width, height);
  }

  reorderCamera(id: string, direction: number) {
    const cameras = [...(this.sceneData.virtualCameras ?? [])];
    const index = cameras.findIndex(c => c.id === id), target = index + direction;
    if (index < 0 || target < 0 || target >= cameras.length) return;
    [cameras[index], cameras[target]] = [cameras[target], cameras[index]];
    this.sceneData = { ...this.sceneData, virtualCameras: cameras };
    this.pushHistory(); this.rebuildScene(); this.emit("scene-change", this.sceneData);
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
    this.syncActiveFloorScene();
    const snapshot = structuredClone(this.projectData);
    if (JSON.stringify(this.history[this.historyIndex]) === JSON.stringify(snapshot)) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snapshot);
    if (this.history.length > this.MAX_HISTORY) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.emitHistory();
  }

  private emitHistory() {
    this.emit("history-change", { canUndo: this.historyIndex > 0, canRedo: this.historyIndex < this.history.length - 1 });
  }

  private restoreSnapshot(project: Project) {
    this.cancelTool();
    this.selectedId = null; this.selectedType = null; this.selectedObjects = [];
    this.transformControls?.detach();
    this.projectData = structuredClone(project);
    this.sceneData = activeFloor(this.projectData);
    this.buildGrid(this.sceneData.canvas);
    this.rebuildScene();
    this.notifySelection();
    this.emit("scene-change", this.sceneData);
    this.emitHistory();
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.restoreSnapshot(this.history[--this.historyIndex]);
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.restoreSnapshot(this.history[++this.historyIndex]);
  }

  getScene(): Scene { return this.sceneData; }

  loadScene(scene: Scene) {
    if (!validateScene(scene)) throw new Error("The layout contains invalid geometry.");
    const project = emptyProject(); project.floors[0].scene = scene;
    this.sceneData = normalizeProject(project).floors[0].scene;
    this.cancelTool(); this.selectedId = null; this.selectedType = null; this.selectedObjects = [];
    this.pushHistory();
    this.buildGrid(this.sceneData.canvas);
    this.rebuildScene();
    this.fitToPlan();
    this.notifySelection();
    this.emit("scene-change", this.sceneData);
  }

  clearScene() { this.loadScene({ ...emptyScene(), canvas: this.getCanvasBounds() }); }
  getSelectedId(): string | null { return this.selectedId; }
  getSelectedType() { return this.selectedType; }

  syncActiveFloorScene() {
    const floor = this.projectData.floors.find(f => f.id === this.projectData.activeFloorId);
    if (floor) floor.scene = this.sceneData;
  }

  getProject(): Project { this.syncActiveFloorScene(); return this.projectData; }

  setProject(project: Project, resetHistory = true) {
    const prepared = parseProject(project);
    prepared.id = project.id ?? nanoid();
    if (resetHistory) { this.history = []; this.historyIndex = -1; }
    this.projectData = prepared;
    this.sceneData = activeFloor(prepared);
    this.pushHistory();
    this.restoreSnapshot(prepared);
    this.fitToPlan();
  }

  renameProject(name: string) {
    this.projectData.name = name.trim().slice(0, 80) || "Untitled Project";
    this.pushHistory(); this.autosave(); this.emit("scene-change", this.sceneData);
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
    const target = this.projectData.floors.find(f => f.id === floorId);
    if (!target) return;
    this.cancelTool(); this.selectedId = null; this.selectedType = null; this.selectedObjects = [];
    this.projectData.activeFloorId = floorId;
    this.sceneData = target.scene;
    this.buildGrid(this.sceneData.canvas);
    this.rebuildScene(); this.fitToPlan();
    this.notifySelection();
    this.emit("scene-change", this.sceneData);
  }

  addFloor(name?: string): string {
    this.syncActiveFloorScene();
    const id = "floor-" + nanoid();
    this.projectData.floors.push({ id, name: name ?? `Floor ${this.projectData.floors.length}`, elevationM: (this.projectData.floors.at(-1)?.elevationM ?? 0) + 3, scene: { ...emptyScene(), canvas: { ...this.getCanvasBounds() } } });
    this.setActiveFloor(id); this.pushHistory();
    return id;
  }

  deleteFloor(floorId: string) {
    if (this.projectData.floors.length <= 1 || !this.projectData.floors.some(f => f.id === floorId)) return;
    this.syncActiveFloorScene();
    this.projectData.floors = this.projectData.floors.filter(f => f.id !== floorId);
    if (this.projectData.activeFloorId === floorId) {
      this.projectData.activeFloorId = this.projectData.floors[0].id;
      this.sceneData = this.projectData.floors[0].scene;
    }
    this.cancelTool(); this.selectedId = null; this.selectedType = null; this.selectedObjects = [];
    this.pushHistory(); this.buildGrid(this.sceneData.canvas); this.rebuildScene();
    this.emit("scene-change", this.sceneData);
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
    const previous = this.sceneData.rooms.find(r => r.id === id);
    if (!previous) return;
    const next = { ...previous, ...updates };
    if (![next.x,next.z,next.w,next.d].every(Number.isFinite) || next.w < .2 || next.d < .2) return;
    const cb = this.getCanvasBounds();
    if (next.x < -cb.widthM/2 || next.z < -cb.depthM/2 || next.x+next.w > cb.widthM/2 || next.z+next.d > cb.depthM/2) throw new Error("The room must fit inside the canvas. Enlarge the canvas first.");
    if (updates.w !== undefined || updates.d !== undefined) {
      const x0=previous.x, x1=x0+previous.w, z0=previous.z, z1=z0+previous.d;
      const vertices = this.sceneData.walls.flatMap(w => (["a","b"] as const).map(endpoint => ({id:w.id,endpoint,at:w[endpoint]})));
      for (const {id:wallId,endpoint,at} of vertices) {
        const boundary = ((Math.abs(at[0]-x0)<.001 || Math.abs(at[0]-x1)<.001) && at[1]>=z0-.001 && at[1]<=z1+.001) || ((Math.abs(at[1]-z0)<.001 || Math.abs(at[1]-z1)<.001) && at[0]>=x0-.001 && at[0]<=x1+.001);
        if (!boundary) continue;
        const target: Vec2 = [next.x+(at[0]-x0)*next.w/previous.w,next.z+(at[1]-z0)*next.d/previous.d];
        const current=this.sceneData.walls.find(w=>w.id===wallId)?.[endpoint];
        if (current && dist(current,at)<.001 && dist(current,target)>.001) this.sceneData=moveJunction(this.sceneData,wallId,endpoint,target);
      }
    }
    this.sceneData = { ...this.sceneData, rooms: this.sceneData.rooms.map(r => r.id === id ? next : r) };
    this.pushHistory(); this.rebuildScene(); this.emit("scene-change", this.sceneData);
  }

  // ─── Materials ───────────────────────────────────────────────────────────────

  getMaterials(): CustomMaterial[] { return this.projectData.materials ?? []; }

  /** Add or replace an imported material at project level (one undo step). */
  upsertMaterial(material: CustomMaterial) {
    const list = this.getMaterials().filter(m => m.id !== material.id);
    this.projectData = { ...this.projectData, materials: [...list, material] };
    this.pushHistory(); this.rebuildScene(); this.emit("scene-change", this.sceneData);
  }

  /** Remove an imported material and clear it from every surface that used it. */
  removeMaterial(id: string) {
    this.syncActiveFloorScene();
    for (const floor of this.projectData.floors) {
      const s = floor.scene;
      floor.scene = { ...s, rooms: s.rooms.map(r => r.materialId === id ? { ...r, materialId: undefined } : r), walls: s.walls.map(w => w.materialId === id ? { ...w, materialId: undefined } : w) };
    }
    this.projectData = { ...this.projectData, materials: this.getMaterials().filter(m => m.id !== id) };
    this.sceneData = activeFloor(this.projectData);
    this.pushHistory(); this.rebuildScene(); this.emit("scene-change", this.sceneData);
  }

  /** Apply a finish to a surface group. `materialId` undefined resets it. */
  applyMaterial(target: { kind: "room-floor" | "room-walls" | "wall"; id: string } | { kind: "all-floors" | "all-walls" }, materialId: string | undefined) {
    const s = this.sceneData;
    let rooms = s.rooms, walls = s.walls;
    if (target.kind === "room-floor") rooms = rooms.map(r => r.id === target.id ? { ...r, materialId } : r);
    if (target.kind === "all-floors") rooms = rooms.map(r => ({ ...r, materialId }));
    if (target.kind === "wall") walls = walls.map(w => w.id === target.id ? { ...w, materialId } : w);
    if (target.kind === "all-walls") walls = walls.map(w => ({ ...w, materialId }));
    if (target.kind === "room-walls") {
      const r = s.rooms.find(x => x.id === target.id);
      if (!r) return;
      const onEdge = (p: Vec2) => p[0] >= r.x - .01 && p[0] <= r.x + r.w + .01 && p[1] >= r.z - .01 && p[1] <= r.z + r.d + .01
        && (Math.abs(p[0] - r.x) < .01 || Math.abs(p[0] - r.x - r.w) < .01 || Math.abs(p[1] - r.z) < .01 || Math.abs(p[1] - r.z - r.d) < .01);
      const sameSide = (w: Wall) => (Math.abs(w.a[0] - w.b[0]) < .01 && (Math.abs(w.a[0] - r.x) < .01 || Math.abs(w.a[0] - r.x - r.w) < .01)) || (Math.abs(w.a[1] - w.b[1]) < .01 && (Math.abs(w.a[1] - r.z) < .01 || Math.abs(w.a[1] - r.z - r.d) < .01));
      rooms = rooms.map(x => x.id === r.id ? { ...x, wallMaterialId: materialId } : x);
      walls = walls.map(w => onEdge(w.a) && onEdge(w.b) && sameSide(w) ? { ...w, materialId } : w);
    }
    this.sceneData = { ...s, rooms, walls };
    this.syncActiveFloorScene(); this.pushHistory(); this.rebuildScene(); this.emit("scene-change", this.sceneData);
  }

  /** Set a wall's exact length by moving its end point (joined walls follow). */
  setWallLength(id: string, length: number) {
    const wall = this.sceneData.walls.find(w => w.id === id);
    if (!wall || !(length > 0.05)) return;
    const len = wallLen(wall) || 1;
    const ux = (wall.b[0] - wall.a[0]) / len, uz = (wall.b[1] - wall.a[1]) / len;
    this.setWallEndpoint(id, "b", [wall.a[0] + ux * length, wall.a[1] + uz * length]);
  }

  /** Move one wall end point to exact coordinates (joined walls follow). */
  setWallEndpoint(id: string, endpoint: "a" | "b", position: Vec2) {
    if (!position.every(Number.isFinite)) return;
    const clamped = this.clampToBounds(position);
    this.sceneData = moveJunction(this.sceneData, id, endpoint, clamped);
    this.syncActiveFloorScene(); this.pushHistory(); this.rebuildScene(); this.emit("scene-change", this.sceneData);
  }

  /** Replace the whole project (e.g. from AI JSON), keeping undo history. */
  replaceProject(project: Project) {
    const prepared = parseProject(project);
    prepared.id = this.projectData.id ?? prepared.id ?? nanoid();
    prepared.name = project.name ?? this.projectData.name;
    this.projectData = prepared;
    this.sceneData = activeFloor(prepared);
    this.cancelTool(); this.selectedId = null; this.selectedType = null; this.selectedObjects = [];
    this.pushHistory();
    this.buildGrid(this.sceneData.canvas);
    this.rebuildScene();
    this.fitToPlan();
    this.notifySelection();
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
      localStorage.setItem(`sketch-space-draft-${workspaceOwner()}`, JSON.stringify(this.projectData));
      this.emit("save-status", "Draft saved in this browser");
    } catch {
      this.emit("save-status", "Draft could not be saved. Export JSON to keep a copy.");
    }
  }

  private loadAutosave() {
    try {
      // 1. Check v2 Project format
      const v2 = localStorage.getItem(`sketch-space-draft-${workspaceOwner()}`) ?? (workspaceOwner() === "guest" ? localStorage.getItem("sketch-space-v2") : null);
      if (v2) {
        const parsed = parseProject(JSON.parse(v2));
        parsed.id ??= nanoid();
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
      const raw = workspaceOwner() === "guest" ? localStorage.getItem(this.STORAGE_KEY) : null;
      if (raw) {
        const legacyScene = parseProject(JSON.parse(raw)).floors[0].scene;
        this.sceneData = legacyScene;
        this.projectData = {
          unit: "m",
          id: nanoid(),
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
    const camera = this.orthoCamera.clone();
    const bounds = sceneBounds({...this.sceneData,reference:undefined}), cb = this.getCanvasBounds();
    const width = bounds ? bounds.maxX-bounds.minX : cb.widthM, depth = bounds ? bounds.maxZ-bounds.minZ : cb.depthM;
    const half = Math.max(depth/2, width/(2*4/3), 1)*1.15;
    camera.left=-half*4/3; camera.right=half*4/3; camera.top=half; camera.bottom=-half; camera.zoom=1;
    const cx = bounds ? (bounds.minX+bounds.maxX)/2 : 0, cz = bounds ? (bounds.minZ+bounds.maxZ)/2 : 0;
    camera.position.set(cx, 100, cz); camera.lookAt(cx,0,cz);
    return this.capture(camera);
  }

  capturePerspective(): string { return this.capture(this.perspCamera.clone()); }
  captureEyeLevel(): string {
    const camera = this.perspCamera.clone();
    camera.position.set(0,EYE_LEVEL,6); camera.lookAt(0,EYE_LEVEL,0);
    return this.capture(camera);
  }

  // ─── SVG Export ──────────────────────────────────────────────────────────────

  exportSVG(): string {
    const escape = (value: string) => value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]!));
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
      svg += `<text x="${px(r.x + r.w / 2)}" y="${pz(r.z + r.d / 2)}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="11" fill="#333">${escape(r.name)}</text>`;
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
        svg += `<text x="${px(it.x)}" y="${pz(it.z)}" text-anchor="middle" font-family="system-ui" font-size="10" fill="#333">${escape(it.label ?? "")}</text>`;
      } else {
        const [baseW, baseD] = itemSize(it);
        const w = baseW * (it.scale ?? 1), d = baseD * (it.scale ?? 1);
        svg += `<g transform="rotate(${it.rot * 180 / Math.PI} ${px(it.x)} ${pz(it.z)})">`;
        svg += `<rect x="${px(it.x - w / 2)}" y="${pz(it.z - d / 2)}" width="${w * SCALE}" height="${d * SCALE}" fill="#8a9a6a" opacity="0.6" stroke="#5a6a3a" stroke-width="0.8"/>`;
        svg += `<text x="${px(it.x)}" y="${pz(it.z)}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="7" fill="#2e3128">${escape(it.name ?? it.kind)}</text></g>`;
      }
    }

    svg += "</svg>";
    return svg;
  }

  // ─── GLB Export ──────────────────────────────────────────────────────────────

  exportGLB(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      const exportGroup = new THREE.Group();
      const savedScene = this.sceneData;
      const savedWalls = this.wallGroup, savedRooms = this.roomGroup, savedItems = this.itemGroup;
      const savedOpenings = this.openingGroup, savedSlabs = this.floorSlabGroup, savedDims = this.dimGroup;
      const savedTool = this.activeTool, savedSelection = this.selectedId, savedObjects = this.selectedObjects, savedIds = this.selectionIds;
      this.syncActiveFloorScene();
      this.wallGroup = new THREE.Group(); this.roomGroup = new THREE.Group(); this.itemGroup = new THREE.Group();
      this.openingGroup = new THREE.Group(); this.floorSlabGroup = new THREE.Group(); this.dimGroup = new THREE.Group();
      this.activeTool = "wall"; this.selectedId = null; this.selectedObjects = []; this.selectionIds = new Set();
      try {
        for (const floor of this.projectData.floors) {
          this.sceneData = floor.scene;
          this.buildFloorSlab(floor);
          floor.scene.walls.forEach(w => this.buildWall3d(w, floor.elevationM));
          floor.scene.rooms.forEach(r => this.buildRoom3d(r, floor.elevationM));
          floor.scene.openings.forEach(o => this.buildOpening3d(o, floor.elevationM));
          floor.scene.items.forEach(i => this.buildItem3d(i, floor.elevationM));
        }
        exportGroup.add(this.wallGroup, this.roomGroup, this.itemGroup, this.openingGroup, this.floorSlabGroup);
        this.releaseGroup(this.dimGroup);
      } finally {
        this.sceneData = savedScene; this.wallGroup = savedWalls; this.roomGroup = savedRooms; this.itemGroup = savedItems;
        this.openingGroup = savedOpenings; this.floorSlabGroup = savedSlabs; this.dimGroup = savedDims;
        this.activeTool = savedTool; this.selectedId = savedSelection; this.selectedObjects = savedObjects; this.selectionIds = savedIds;
      }
      exporter.parse(
        exportGroup,
        (result) => {
          this.releaseGroup(exportGroup);
          if (result instanceof ArrayBuffer) {
            resolve(result);
          } else {
            reject(new Error("GLB export: unexpected non-binary result"));
          }
        },
        (err) => { this.releaseGroup(exportGroup); reject(err); },
        { binary: true, onlyVisible: true }
      );
    });
  }

  // ─── WebM Walkthrough Recording ───────────────────────────────────────────────

  startWalkthrough(onStop: (blob: Blob) => void, durationSeconds = 12): boolean {
    if (this.isRecording || typeof MediaRecorder === "undefined" || !this.canvas.captureStream) return false;
    cancelAnimationFrame(this.tweenFrame);
    const stream = this.canvas.captureStream(30);
    const originalView = this.activeView, originalCamera = this.camera;
    const referenceVisible=this.referenceGroup.visible;
    const position = this.perspCamera.position.clone(), rotation = this.perspCamera.quaternion.clone(), fov = this.perspCamera.fov;
    const target = this.controls?.target.clone();
    this.recordedChunks = [];
    const supported = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
    if (!supported) { stream.getTracks().forEach(t=>t.stop()); return false; }
    try { this.mediaRecorder = new MediaRecorder(stream, {mimeType:supported}); }
    catch { stream.getTracks().forEach(t=>t.stop()); return false; }
    this.mediaRecorder.ondataavailable = e => { if (e.data.size) this.recordedChunks.push(e.data); };
    this.mediaRecorder.onstop = () => {
      this.isRecording = false; cancelAnimationFrame(this.walkthroughFrame);
      stream.getTracks().forEach(t=>t.stop());
      this.camera = originalCamera; this.activeView = originalView;
      this.referenceGroup.visible=referenceVisible;
      this.perspCamera.position.copy(position); this.perspCamera.quaternion.copy(rotation); this.perspCamera.fov = fov; this.perspCamera.updateProjectionMatrix();
      if (target) this.controls?.target.copy(target);
      if (!this.destroyed) onStop(new Blob(this.recordedChunks,{type:"video/webm"}));
    };
    this.referenceGroup.visible=false;this.cancelCalibration();
    this.mediaRecorder.start(100); this.isRecording = true; this.camera = this.perspCamera;
    this.animateWalkthroughPath(Math.max(3, Math.min(120, durationSeconds))*1000);
    return true;
  }

  stopWalkthrough() {
    if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop();
  }

  private animateWalkthroughPath(duration: number) {
    const start = performance.now();
    const cameras = structuredClone(this.sceneData.virtualCameras ?? []);
    const elevation = this.getFloors().find(f=>f.id===this.getActiveFloorId())?.elevationM ?? 0;
    const bounds=sceneBounds({...this.sceneData,reference:undefined}), cx=bounds?(bounds.minX+bounds.maxX)/2:0, cz=bounds?(bounds.minZ+bounds.maxZ)/2:0;
    const radius=bounds?Math.max(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ,4):12;
    const animate = () => {
      if (!this.isRecording || this.destroyed) return;
      const progress = Math.min(1,(performance.now()-start)/duration);
      if (cameras.length >= 2) {
        const index=Math.min(cameras.length-2,Math.floor(progress*(cameras.length-1)));
        const a=cameras[index],b=cameras[index+1];
        const raw=progress*(cameras.length-1)-index, t=raw*raw*(3-2*raw);
        const lerp=(a:number,b:number)=>a+(b-a)*t;
        this.perspCamera.position.set(lerp(a.position[0],b.position[0]),elevation+lerp(a.heightM,b.heightM),lerp(a.position[1],b.position[1]));
        this.perspCamera.lookAt(lerp(a.targetPosition[0],b.targetPosition[0]),elevation+lerp(a.heightM,b.heightM),lerp(a.targetPosition[1],b.targetPosition[1]));
        this.perspCamera.fov=lerp(a.fov,b.fov); this.perspCamera.updateProjectionMatrix();
      } else {
        const angle=progress*Math.PI*2;
        this.perspCamera.position.set(cx+Math.sin(angle)*radius,elevation+radius*.6,cz+Math.cos(angle)*radius);
        this.perspCamera.lookAt(cx,elevation+1,cz);
      }
      if (progress>=1) { this.stopWalkthrough(); return; }
      this.walkthroughFrame=requestAnimationFrame(animate);
    };
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
      const [w, d] = itemSize(it);
      lines.push(`  ${it.name ?? it.kind}: ${w}×${d}m at (${it.x.toFixed(1)}, ${it.z.toFixed(1)})`);
    }
    return lines.join("\n");
  }
}
