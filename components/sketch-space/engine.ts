/**
 * Three.js scene engine for Sketch Space.
 * Manages rendering, tools, camera modes, undo/redo, and autosave.
 * All operations are in metres. Y = up. X/Z = floor plane.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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
  SNAP_GRID,
  WALL_HEIGHT,
  WALL_THICKNESS,
  FURNITURE_SIZES,
  EYE_LEVEL,
  emptyScene,
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

function ortho(a: Vec2, b: Vec2, lock: boolean): Vec2 {
  if (!lock) return b;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return Math.abs(dx) >= Math.abs(dz)
    ? [b[0], a[1]]
    : [a[0], b[1]];
}

function worldToFloor(
  event: { clientX: number; clientY: number },
  camera: THREE.Camera,
  canvas: HTMLCanvasElement
): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
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
};

// ─── Main Engine Class ────────────────────────────────────────────────────────

export type EngineEventType =
  | "scene-change"
  | "tool-change"
  | "view-change"
  | "history-change";

type Listener = (data?: unknown) => void;

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
  private history: Scene[] = [];
  private historyIndex = -1;
  private MAX_HISTORY = 60;

  // Tool state
  activeTool: ToolKind = "wall";
  activeView: ViewMode = "top";
  orthogonalLock = false;
  activeFurniture: FurnitureKind = "bed";
  private drawing = false;
  private wallStart: Vec2 | null = null;
  private ghostLine: THREE.Line | null = null;
  private ghostRect: THREE.Mesh | null = null;
  private ghostDim: THREE.Sprite | null = null;
  private roomStart: Vec2 | null = null;
  private selectedId: string | null = null;
  private isDragging = false;
  private dragOffset: Vec2 = [0, 0];
  private lengthOverride: number | null = null; // metres, typed by user

  // 3D groups
  private wallGroup = new THREE.Group();
  private roomGroup = new THREE.Group();
  private openingGroup = new THREE.Group();
  private itemGroup = new THREE.Group();
  private dimGroup = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private gridGroup = new THREE.Group();

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
      this.roomGroup,
      this.wallGroup,
      this.openingGroup,
      this.itemGroup,
      this.dimGroup,
      this.ghostGroup
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

  private buildGrid() {
    this.gridGroup.clear();
    const SIZE = 250; // was 50, now 500m x 500m
    const STEP = SNAP_GRID;
    const lineMat = new THREE.LineBasicMaterial({
      color: COLORS.grid,
      transparent: true,
      opacity: 0.7,
    });
    const majorMat = new THREE.LineBasicMaterial({
      color: COLORS.gridMajor,
      transparent: true,
      opacity: 0.9,
    });
    for (let i = -SIZE; i <= SIZE; i++) {
      const isMajor = Math.round(i) % 10 === 0;
      const pts = [
        new THREE.Vector3(-SIZE * STEP, 0, i * STEP),
        new THREE.Vector3(SIZE * STEP, 0, i * STEP),
      ];
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      this.gridGroup.add(new THREE.Line(g, isMajor ? majorMat : lineMat));
    }
    for (let j = -SIZE; j <= SIZE; j++) {
      const isMajor = Math.round(j) % 10 === 0;
      const pts = [
        new THREE.Vector3(j * STEP, 0, -SIZE * STEP),
        new THREE.Vector3(j * STEP, 0, SIZE * STEP),
      ];
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      this.gridGroup.add(new THREE.Line(g, isMajor ? majorMat : lineMat));
    }
    // Floor plane for raycasting
    const floorGeo = new THREE.PlaneGeometry(SIZE * 2 * STEP, SIZE * 2 * STEP);
    const floorMat = new THREE.MeshBasicMaterial({
      color: COLORS.floor,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.name = "floor";
    this.gridGroup.add(floor);
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

  setView(mode: ViewMode) {
    this.activeView = mode;
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
      this.perspCamera.position.set(8, 8, 12);
      this.perspCamera.lookAt(0, 0, 0);
      this.scene3d.background = new THREE.Color(0xd8e4f0);
      this.setupControls();
    } else {
      this.camera = this.perspCamera;
      this.perspCamera.position.set(0, EYE_LEVEL, 6);
      this.perspCamera.lookAt(0, EYE_LEVEL, 0);
      this.scene3d.background = new THREE.Color(0xd8e4f0);
      this.setupControls();
    }
    this.onResize();
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

  private getFloorPos(e: PointerEvent): Vec2 {
    const raw = worldToFloor(
      { clientX: e.clientX, clientY: e.clientY },
      this.camera,
      this.canvas
    );
    return e.altKey ? raw : snapVec(raw);
  }

  private spacePressed = false;

  private onPointerDown = (e: PointerEvent) => {
    if (this.activeView !== "top") return; // tools only in top view
    if (e.button !== 0) return;
    if (this.spacePressed) return; // Let OrbitControls handle panning
    e.preventDefault();
    const pos = this.getFloorPos(e);
    this.handleToolDown(pos);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.activeView !== "top") return;
    if (!this.drawing && !this.isDragging) return;
    const pos = this.getFloorPos(e);
    this.handleToolMove(pos, e.shiftKey);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.activeView !== "top") return;
    if (e.button !== 0) return;
    const pos = this.getFloorPos(e);
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
      l: "label", e: "eraser", v: "select",
    };
    if (!e.ctrlKey && !e.metaKey && shortcuts[e.key]) {
      this.setTool(shortcuts[e.key]);
    }
    
    // Rotate furniture
    if (e.key === "r" || e.key === "R") {
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
    this.isDragging = false;
    this.clearGhost();
  }

  private handleToolDown(pos: Vec2) {
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
      case "label":
        this.commitLabel(pos);
        break;
      case "eraser":
        this.eraseAt(pos);
        break;
      case "select":
        this.selectAt(pos);
        break;
    }
  }

  private handleToolMove(pos: Vec2, shiftKey: boolean) {
    if (this.isDragging && this.selectedId) {
      this.dragItem(pos);
      return;
    }
    if (!this.drawing) return;
    if (this.activeTool === "wall" && this.wallStart) {
      const end = ortho(this.wallStart, pos, this.orthogonalLock || shiftKey);
      this.showWallGhost(this.wallStart, end);
    } else if (this.activeTool === "room" && this.roomStart) {
      this.showRoomGhost(this.roomStart, pos);
    }
  }

  private handleToolUp(_pos: Vec2, _shiftKey: boolean) {
    // For now, up just confirms drag
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
    if (wallLen({ id: "", a, b: end }) < 0.05) return null;
    const wall: Wall = { id: nanoid(), a, b: end };
    this.sceneData = { ...this.sceneData, walls: [...this.sceneData.walls, wall] };
    this.clearGhost();
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
    this.lengthOverride = null;
    return end;
  }

  private commitRoom(a: Vec2, b: Vec2) {
    const x = Math.min(a[0], b[0]);
    const z = Math.min(a[1], b[1]);
    const w = Math.abs(b[0] - a[0]);
    const d = Math.abs(b[1] - a[1]);
    if (w < 0.2 || d < 0.2) return;
    const room: Room = { id: nanoid(), name: "Room", x, z, w, d };
    this.sceneData = { ...this.sceneData, rooms: [...this.sceneData.rooms, room] };
    this.clearGhost();
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  private commitOpening(pos: Vec2, type: "door" | "window") {
    // Snap to nearest wall
    const wall = this.nearestWall(pos, 0.5);
    if (!wall) return;
    
    // Project exact point onto wall
    const l2 = (wall.a[0] - wall.b[0]) ** 2 + (wall.a[1] - wall.b[1]) ** 2;
    let t = 0.5;
    if (l2 > 0) {
      t = ((pos[0] - wall.a[0]) * (wall.b[0] - wall.a[0]) + (pos[1] - wall.a[1]) * (wall.b[1] - wall.a[1])) / l2;
      t = Math.max(0, Math.min(1, t));
    }
    const projX = wall.a[0] + t * (wall.b[0] - wall.a[0]);
    const projZ = wall.a[1] + t * (wall.b[1] - wall.a[1]);

    const opening: Opening = { id: nanoid(), type, at: [projX, projZ], w: type === "door" ? 0.9 : 1.2, wallId: wall.id };
    this.sceneData = { ...this.sceneData, openings: [...this.sceneData.openings, opening] };
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  private commitItem(pos: Vec2, kind: FurnitureKind) {
    const item: Item = { id: nanoid(), kind, x: pos[0], z: pos[1], rot: 0 };
    this.sceneData = { ...this.sceneData, items: [...this.sceneData.items, item] };
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
  }

  private commitLabel(pos: Vec2) {
    const text = window.prompt("Label text:");
    if (!text) return;
    const item: Item = { id: nanoid(), kind: "label", x: pos[0], z: pos[1], rot: 0, label: text };
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

  private selectAt(pos: Vec2) {
    const thr = 0.7;
    const dist = (a: Vec2, b: Vec2) => {
      const dx = a[0] - b[0];
      const dz = a[1] - b[1];
      return Math.sqrt(dx * dx + dz * dz);
    };
    // Items first
    const item = this.sceneData.items.find((it) => dist(pos, [it.x, it.z]) < thr);
    if (item) {
      this.selectedId = item.id;
      this.isDragging = true;
      this.dragOffset = [pos[0] - item.x, pos[1] - item.z];
      this.rebuildScene();
      return;
    }
    this.selectedId = null;
    this.rebuildScene();
  }

  private dragItem(pos: Vec2) {
    if (!this.selectedId) return;
    const items = this.sceneData.items.map((it) =>
      it.id === this.selectedId
        ? { ...it, x: pos[0] - this.dragOffset[0], z: pos[1] - this.dragOffset[1] }
        : it
    );
    this.sceneData = { ...this.sceneData, items };
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
    };
    this.selectedId = null;
    this.pushHistory();
    this.rebuildScene();
    this.emit("scene-change", this.sceneData);
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

  rebuildScene() {
    this.wallGroup.clear();
    this.roomGroup.clear();
    this.openingGroup.clear();
    this.itemGroup.clear();
    this.dimGroup.clear();

    this.sceneData.rooms.forEach((r) => this.buildRoom3d(r));
    this.sceneData.walls.forEach((w) => this.buildWall3d(w));
    this.sceneData.openings.forEach((o) => this.buildOpening3d(o));
    this.sceneData.items.forEach((it) => this.buildItem3d(it));
    this.autosave();
  }

  private buildWall3d(wall: Wall) {
    const len = wallLen(wall);
    if (len < 0.01) return;
    const dir = wallDir(wall);
    const mid = wallMid(wall);
    const geo = new THREE.BoxGeometry(len, WALL_HEIGHT, WALL_THICKNESS);
    const mat = new THREE.MeshLambertMaterial({ color: COLORS.wallSide });
    const mesh = new THREE.Mesh(geo, mat);
    const angle = Math.atan2(-dir.z, dir.x);
    mesh.rotation.y = angle;
    mesh.position.set(mid[0], WALL_HEIGHT / 2, mid[1]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.wallGroup.add(mesh);

    // Top edge highlight
    const edgeGeo = new THREE.BoxGeometry(len, 0.04, WALL_THICKNESS + 0.01);
    const edgeMat = new THREE.MeshBasicMaterial({ color: COLORS.wallTop });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    edgeMesh.rotation.y = angle;
    edgeMesh.position.set(mid[0], WALL_HEIGHT - 0.02, mid[1]);
    this.wallGroup.add(edgeMesh);

    // Dimension label
    const dimPos: Vec2 = [mid[0], mid[1]];
    this.addSceneDim(`${len.toFixed(2)}m`, dimPos, 0.3);
  }

  private buildRoom3d(room: Room) {
    const geo = new THREE.BoxGeometry(room.w, 0.02, room.d);
    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.roomFill,
      transparent: true,
      opacity: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(room.x + room.w / 2, 0.01, room.z + room.d / 2);
    this.roomGroup.add(mesh);

    // Room outline
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x98a878 });
    const line = new THREE.LineSegments(edges, lineMat);
    line.position.copy(mesh.position);
    this.roomGroup.add(line);

    // Room label sprite
    this.addSceneDim(room.name, [room.x + room.w / 2, room.z + room.d / 2], 0.15);
  }

  private buildOpening3d(opening: Opening) {
    const w = opening.w;
    const color = opening.type === "door" ? COLORS.door : COLORS.window;
    const geo = new THREE.BoxGeometry(w, opening.type === "window" ? 1.2 : WALL_HEIGHT, WALL_THICKNESS + 0.02);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65 });
    const mesh = new THREE.Mesh(geo, mat);
    const y = opening.type === "window" ? 1.2 : WALL_HEIGHT / 2;
    mesh.position.set(opening.at[0], y, opening.at[1]);

    if (opening.wallId) {
      const wall = this.sceneData.walls.find(w => w.id === opening.wallId);
      if (wall) {
        const dir = wallDir(wall);
        mesh.rotation.y = Math.atan2(-dir.z, dir.x);
      }
    }

    this.openingGroup.add(mesh);
  }

  private buildItem3d(item: Item) {
    if (item.kind === "label") {
      this.addSceneDim(item.label ?? "Label", [item.x, item.z], 0.3);
      return;
    }
    const [w, d] = FURNITURE_SIZES[item.kind];
    
    const group = new THREE.Group();
    group.position.set(item.x, 0, item.z);
    group.rotation.y = item.rot;

    const color = item.id === this.selectedId ? COLORS.selected : COLORS.furniture;
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

  // ─── Autosave ────────────────────────────────────────────────────────────────

  private autosave() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sceneData));
    } catch {/* quota exceeded */}
  }

  private loadAutosave() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const scene = JSON.parse(raw) as Scene;
        this.sceneData = scene;
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
      svg += `<line x1="${px(w.a[0])}" y1="${pz(w.a[1])}" x2="${px(w.b[0])}" y2="${pz(w.b[1])}" stroke="#1e2019" stroke-width="${WALL_THICKNESS * SCALE}" stroke-linecap="round"/>`;
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
