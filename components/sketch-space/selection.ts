import { itemSize, emptyScene, type Scene, type Vec2 } from "./types";
export type SelectionKind = "wall" | "room" | "opening" | "item" | "camera";
export type SelectedObject = { id: string; type: SelectionKind };
export type PlanBounds = { minX: number; maxX: number; minZ: number; maxZ: number };
const segmentDistance = (p: Vec2, a: Vec2, b: Vec2) => {
  const dx=b[0]-a[0], dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);
};
export function objectBounds(scene: Scene, object: SelectedObject): PlanBounds | null {
  let points: Vec2[]=[];
  if(object.type==='wall'){const w=scene.walls.find(w=>w.id===object.id);if(w)points=[w.a,w.b];}
  if(object.type==='room'){const r=scene.rooms.find(r=>r.id===object.id);if(r)points=[[r.x,r.z],[r.x+r.w,r.z+r.d]];}
  if(object.type==='opening'){const o=scene.openings.find(o=>o.id===object.id);if(o)points=[o.at];}
  if(object.type==='camera'){const c=scene.virtualCameras?.find(c=>c.id===object.id);if(c)points=[c.position,c.targetPosition];}
  if(object.type==='item'){
    const i=scene.items.find(i=>i.id===object.id);
    if(i){const [w,d]=itemSize(i), sc=i.scale??1, c=Math.cos(i.rot), s=Math.sin(i.rot);points=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>[i.x+sc*(x*c+z*s),i.z+sc*(-x*s+z*c)] as Vec2);}
  }
  if(!points.length)return null;
  return {minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))};
}
export function allObjects(scene: Scene): SelectedObject[]{
  return [...scene.walls.map(w=>({id:w.id,type:'wall' as const})),...scene.rooms.map(r=>({id:r.id,type:'room' as const})),...scene.openings.map(o=>({id:o.id,type:'opening' as const})),...scene.items.map(i=>({id:i.id,type:'item' as const})),...(scene.virtualCameras??[]).map(c=>({id:c.id,type:'camera' as const}))];
}
export function hitObject(scene: Scene, point: Vec2): SelectedObject | null {
  for(const item of [...scene.items].reverse()){
    const dx=point[0]-item.x,dz=point[1]-item.z,c=Math.cos(item.rot),s=Math.sin(item.rot),[w,d]=itemSize(item),sc=item.scale??1;
    if(Math.abs(dx*c-dz*s)<=Math.max(.25,w*sc/2)&&Math.abs(dx*s+dz*c)<=Math.max(.25,d*sc/2))return {id:item.id,type:'item'};
  }
  const opening=scene.openings.find(o=>Math.hypot(point[0]-o.at[0],point[1]-o.at[1])<Math.max(.3,o.w/2));
  if(opening)return {id:opening.id,type:'opening'};
  const camera=scene.virtualCameras?.find(c=>Math.hypot(point[0]-c.position[0],point[1]-c.position[1])<.5);
  if(camera)return {id:camera.id,type:'camera'};
  const wall=scene.walls.find(w=>segmentDistance(point,w.a,w.b)<Math.max(.15,(w.thickness??.15)/2+.1));
  if(wall)return {id:wall.id,type:'wall'};
  const room=scene.rooms.find(r=>point[0]>=r.x&&point[0]<=r.x+r.w&&point[1]>=r.z&&point[1]<=r.z+r.d);
  return room?{id:room.id,type:'room'}:null;
}
export function objectsInBox(scene: Scene, a: Vec2, b: Vec2): SelectedObject[]{
  const minX=Math.min(a[0],b[0]),maxX=Math.max(a[0],b[0]),minZ=Math.min(a[1],b[1]),maxZ=Math.max(a[1],b[1]);
  return allObjects(scene).filter(object=>{const box=objectBounds(scene,object);return box&&box.minX>=minX-.001&&box.maxX<=maxX+.001&&box.minZ>=minZ-.001&&box.maxZ<=maxZ+.001;});
}
/** Rooms carry their enclosure and furnishings; openings keep their supporting walls. */
export function expandSelection(scene: Scene, selected: SelectedObject[], includeSupportingWalls = true): SelectedObject[]{
  const result=new Map(selected.map(o=>[o.id,o]));
  for(const room of scene.rooms.filter(r=>result.has(r.id))){
    const inside=(p:Vec2)=>p[0]>=room.x-.001&&p[0]<=room.x+room.w+.001&&p[1]>=room.z-.001&&p[1]<=room.z+room.d+.001;
    const edge=(p:Vec2)=>inside(p)&&(Math.abs(p[0]-room.x)<.001||Math.abs(p[0]-room.x-room.w)<.001||Math.abs(p[1]-room.z)<.001||Math.abs(p[1]-room.z-room.d)<.001);
    for(const w of scene.walls)if(edge(w.a)&&edge(w.b))result.set(w.id,{id:w.id,type:'wall'});
    for(const i of scene.items)if(inside([i.x,i.z]))result.set(i.id,{id:i.id,type:'item'});
  }
  for(const o of scene.openings)if(includeSupportingWalls&&result.has(o.id)&&o.wallId)result.set(o.wallId,{id:o.wallId,type:'wall'});
  for(const o of scene.openings)if(o.wallId&&result.has(o.wallId))result.set(o.id,{id:o.id,type:'opening'});
  return [...result.values()];
}
export function selectionBounds(scene: Scene, selected: SelectedObject[]): PlanBounds | null {
  const boxes=selected.map(o=>objectBounds(scene,o)).filter(b=>b!==null);
  if(!boxes.length)return null;
  return {minX:Math.min(...boxes.map(b=>b.minX)),maxX:Math.max(...boxes.map(b=>b.maxX)),minZ:Math.min(...boxes.map(b=>b.minZ)),maxZ:Math.max(...boxes.map(b=>b.maxZ))};
}
export function clampMovement(scene: Scene, selected: SelectedObject[], delta: Vec2): Vec2 {
  const box=selectionBounds(scene,selected),canvas=scene.canvas??{widthM:16,depthM:12};
  if(!box)return [0,0];
  if(box.maxX-box.minX>canvas.widthM+.001||box.maxZ-box.minZ>canvas.depthM+.001)throw new Error('The selection is larger than this canvas. Enlarge the canvas first.');
  return [Math.max(-canvas.widthM/2-box.minX,Math.min(canvas.widthM/2-box.maxX,delta[0])),Math.max(-canvas.depthM/2-box.minZ,Math.min(canvas.depthM/2-box.maxZ,delta[1]))];
}
export function translateObjects(scene: Scene, selected: SelectedObject[], delta: Vec2): Scene {
  const ids=new Set(selected.map(o=>o.id)),[dx,dz]=delta;
  const shift=(p:Vec2):Vec2=>[p[0]+dx,p[1]+dz];
  return {...scene,walls:scene.walls.map(w=>ids.has(w.id)?{...w,a:shift(w.a),b:shift(w.b)}:w),rooms:scene.rooms.map(r=>ids.has(r.id)?{...r,x:r.x+dx,z:r.z+dz}:r),items:scene.items.map(i=>ids.has(i.id)?{...i,x:i.x+dx,z:i.z+dz}:i),openings:scene.openings.map(o=>ids.has(o.id)?{...o,at:shift(o.at)}:o),virtualCameras:scene.virtualCameras?.map(c=>ids.has(c.id)?{...c,position:shift(c.position),targetPosition:shift(c.targetPosition)}:c)};
}
export function copyObjects(scene: Scene, selection: SelectedObject[]): Scene {
  const ids=new Set(expandSelection(scene,selection).map(o=>o.id));
  return structuredClone({...emptyScene(),walls:scene.walls.filter(w=>ids.has(w.id)),rooms:scene.rooms.filter(r=>ids.has(r.id)),items:scene.items.filter(i=>ids.has(i.id)),openings:scene.openings.filter(o=>ids.has(o.id)),virtualCameras:scene.virtualCameras?.filter(c=>ids.has(c.id))});
}
export function pasteObjects(scene: Scene, clipboard: Scene, offset: Vec2): {scene:Scene;selected:SelectedObject[]} {
  const copy=structuredClone(clipboard),objects=allObjects(copy),ids=new Map(objects.map(o=>[o.id,crypto.randomUUID()]));
  copy.walls.forEach(w=>{w.id=ids.get(w.id)!;});copy.rooms.forEach(r=>{r.id=ids.get(r.id)!;});copy.items.forEach(i=>{i.id=ids.get(i.id)!;delete i.connectsToFloorId;});
  copy.openings.forEach(o=>{o.id=ids.get(o.id)!;o.wallId=o.wallId?ids.get(o.wallId):undefined;});copy.virtualCameras?.forEach(c=>{c.id=ids.get(c.id)!;c.name=`${c.name} copy`;});
  const selected=allObjects(copy);copy.canvas=scene.canvas;
  const moved=translateObjects(copy,selected,clampMovement(copy,selected,offset));
  return {scene:{...scene,walls:[...scene.walls,...moved.walls],rooms:[...scene.rooms,...moved.rooms],items:[...scene.items,...moved.items],openings:[...scene.openings,...moved.openings],virtualCameras:[...(scene.virtualCameras??[]),...(moved.virtualCameras??[])]},selected};
}
