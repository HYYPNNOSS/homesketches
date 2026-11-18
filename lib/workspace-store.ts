import type { GenerationKind } from "../components/dashboard/types";

export type SavedProject = {
  id: string;
  name: string;
  kind: GenerationKind | "render";
  url: string;
  sourceFiles: string[];
  design?: import("../components/sketch-space/types").Project;
  sourceImage?: string;
  renderSettings?: { look: string; style: string; light: string; notes: string; cameraId: string };
  createdAt: number;
};
export type SavedAsset = { id: string; name: string; type: string; size: number; createdAt: number; file: Blob };

export function workspaceOwner(): string {
  try {
    const token = localStorage.getItem("homesketches_access_token");
    if (token) {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const { sub } = JSON.parse(atob(payload));
      if (typeof sub === "string") return sub;
    }
  } catch { /* Unsigned visitors keep a separate workspace. */ }
  return "guest";
}

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`homesketches-workspace-${workspaceOwner()}`, 2);
    request.onupgradeneeded = () => {
      for (const name of ["projects", "assets", "designs"]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser storage is unavailable. Check your browser storage permissions."));
  });
}

async function transact<T>(store: "projects" | "assets" | "designs", mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = action(transaction.objectStore(store));
    transaction.oncomplete = () => {
      db.close();
      if (mode === "readwrite") window.dispatchEvent(new Event("workspace-updated"));
      resolve(request.result);
    };
    transaction.onabort = () => { db.close(); reject(new Error("Could not save your workspace. Browser storage may be full.")); };
    transaction.onerror = () => { /* onabort supplies the user-facing error */ };
  });
}

export async function listProjects(): Promise<SavedProject[]> {
  return (await transact<SavedProject[]>("projects", "readonly", store => store.getAll())).sort((a, b) => b.createdAt - a.createdAt);
}
export async function saveProject(project: Omit<SavedProject, "id" | "createdAt">) {
  const entry: SavedProject = { ...project, id: crypto.randomUUID(), createdAt: Date.now() };
  await transact("projects", "readwrite", store => store.put(entry));
  return entry;
}
export async function deleteProject(id: string) { await transact("projects", "readwrite", store => store.delete(id)); }
export async function listAssets(): Promise<SavedAsset[]> {
  return (await transact<SavedAsset[]>("assets", "readonly", store => store.getAll())).sort((a, b) => b.createdAt - a.createdAt);
}
export async function getAsset(id: string): Promise<SavedAsset | undefined> { return transact("assets", "readonly", store => store.get(id)); }
export async function addAsset(file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} exceeds the 20MB limit.`);
  if (!/\.(jpe?g|png|webp|pdf)$/i.test(file.name)) throw new Error("Choose JPG, PNG, WEBP, or PDF files.");
  const asset: SavedAsset = { id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, createdAt: Date.now(), file };
  await transact("assets", "readwrite", store => store.put(asset));
  return asset;
}
export async function deleteAsset(id: string) { await transact("assets", "readwrite", store => store.delete(id)); }
export function assetFile(asset: SavedAsset): File { return new File([asset.file], asset.name, { type: asset.type }); }

export type SavedDesign = { id: string; name: string; project: import("../components/sketch-space/types").Project; updatedAt: number };
export async function listDesigns(): Promise<SavedDesign[]> { return (await transact<SavedDesign[]>("designs", "readonly", store => store.getAll())).sort((a, b) => b.updatedAt - a.updatedAt); }
export async function saveDesign(project: import("../components/sketch-space/types").Project) {
  if (!project.id) throw new Error("This design needs an identity before saving.");
  const entry: SavedDesign = { id: project.id, name: project.name ?? "Untitled Project", project: structuredClone(project), updatedAt: Date.now() };
  await transact("designs", "readwrite", store => store.put(entry));
}

export async function getDesign(id: string): Promise<SavedDesign | undefined> { return transact("designs", "readonly", store => store.get(id)); }
