"use client";
import {useState,type FormEvent} from "react";
import type {SketchEngine} from "./engine";
import type {SelectedObject} from "./selection";
export function SelectionBar({engine,objects,canPaste}:{engine:SketchEngine|null;objects:SelectedObject[];canPaste:boolean}){
  const [dx,setDx]=useState(.5),[dz,setDz]=useState(.5);
  function move(e:FormEvent){e.preventDefault();engine?.moveSelection(dx,dz);}
  return <div className="sk-selection-bar" aria-label="Selection actions"><span role="status" aria-label="Selected object count">{objects.length} selected</span><button type="button" disabled={!objects.length} onClick={()=>engine?.copySelection()} title="Ctrl/Cmd+C">Copy</button><button type="button" disabled={!canPaste} onClick={()=>engine?.pasteSelection()} title="Ctrl/Cmd+V">Paste</button><button type="button" disabled={!objects.length} onClick={()=>engine?.duplicateSelection()} title="Ctrl/Cmd+D">Duplicate</button><button type="button" disabled={!objects.length} onClick={()=>engine?.deleteSelected()}>Delete selection</button><form onSubmit={move}><label>ΔX (m)<input aria-label="Move selection X" type="number" step={.1} value={dx} onChange={e=>setDx(+e.target.value)} /></label><label>ΔZ (m)<input aria-label="Move selection Z" type="number" step={.1} value={dz} onChange={e=>setDz(+e.target.value)} /></label><button disabled={!objects.length}>Move selection</button></form><small>Shift-click to add/remove · B for box selection · drag a selected object to move the group. Rooms include boundary walls and furniture; copied openings include their wall.</small></div>;
}
