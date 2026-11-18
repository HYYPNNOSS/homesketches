import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1200}});page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const base=process.env.TEST_BASE_URL??'http://localhost:3000';
const scene={unit:'m',canvas:{widthM:16,depthM:12,gridStep:.1},walls:[{id:'w1',a:[-6,-4],b:[6,-4]},{id:'w2',a:[6,-4],b:[6,4]},{id:'w3',a:[6,4],b:[-6,4]},{id:'w4',a:[-6,4],b:[-6,-4]}],rooms:[],openings:[{id:'door',type:'door',at:[-3,-4],w:1,wallId:'w1'}],items:[{id:'chair-a',kind:'chair',x:-2,z:0,rot:0},{id:'chair-b',kind:'chair',x:1,z:0,rot:0}]};
const project={unit:'m',name:'Editing and tracing',activeFloorId:'main',floors:[{id:'main',name:'Ground Floor',elevationM:0,scene}]};
let center=[0,0];
async function snapshot(){const next=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();return JSON.parse(await readFile(await(await next).path(),'utf8'));}
async function world(x,z){const box=await page.locator('.sk-canvas').boundingBox();const zoom=parseFloat(await page.getByLabel('Canvas zoom').textContent())/100;return {x:box.x+box.width/2+(x-center[0])/(20*box.width/box.height/zoom)*box.width,y:box.y+box.height/2+(z-center[1])/(20/zoom)*box.height};}
async function click(x,z,options){const p=await world(x,z);await page.mouse.click(p.x,p.y,options);}
async function drag(a,b){const start=await world(...a),end=await world(...b);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();}
async function count(n){await page.getByLabel('Selected object count').filter({hasText:`${n} selected`}).waitFor();}
async function undo(){await page.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();}
try{
 await page.goto(base+'/dashboard/sketch');await page.waitForFunction(()=>document.querySelector('.sk-import-button input')?.disabled===false);await page.locator('.sk-import-button input').first().setInputFiles({name:'objects.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.waitForFunction(()=>document.querySelector('[aria-label="Project name"]')?.value==='Editing and tracing');
 await page.getByRole('button',{name:'Select, shortcut V',exact:true}).click();await click(-2,0);await page.keyboard.down('Shift');await click(1,0);await page.keyboard.up('Shift');await count(2);
 await page.keyboard.press('Control+d');let saved=await snapshot(),objects=saved.floors[0].scene;assert.equal(objects.items.length,4);assert.equal(new Set(objects.items.map(i=>i.id)).size,4);
 const copied=objects.items.filter(i=>!['chair-a','chair-b'].includes(i.id));assert.equal(copied[1].x-copied[0].x,3);
 console.log('PASS Shift-click multi-select and keyboard duplication with new identities');
 await page.getByRole('spinbutton',{name:'Move selection X'}).fill('1');await page.getByRole('spinbutton',{name:'Move selection Z'}).fill('1');await page.getByRole('button',{name:'Move selection',exact:true}).click();
 objects=(await snapshot()).floors[0].scene;assert.equal(objects.items.find(i=>i.id==='chair-a').x,-2);assert.equal(objects.items.find(i=>i.id===copied[0].id).x,copied[0].x+1);
 const beforeDrag=structuredClone(objects.items);await drag([copied[0].x+1,copied[0].z+1],[copied[0].x+2,copied[0].z+2]);objects=(await snapshot()).floors[0].scene;assert.ok(Math.abs(objects.items.find(i=>i.id===copied[0].id).x-copied[0].x-2)<.15);assert.equal(objects.items.find(i=>i.id===copied[1].id).x-objects.items.find(i=>i.id===copied[0].id).x,3);
 await undo();assert.deepEqual((await snapshot()).floors[0].scene.items,beforeDrag);
 await page.getByRole('button',{name:'Redo (Ctrl+Shift+Z)',exact:true}).click();assert.notDeepEqual((await snapshot()).floors[0].scene.items,beforeDrag);await undo();
 await page.getByRole('button',{name:'Box select, shortcut B',exact:true}).click();await drag([-3,-1],[2,1]);await count(2);
 await page.getByRole('button',{name:'Copy',exact:true}).click();await page.getByRole('button',{name:'Paste',exact:true}).click();assert.equal((await snapshot()).floors[0].scene.items.length,6);
 await page.getByRole('button',{name:'Delete selection',exact:true}).click();assert.equal((await snapshot()).floors[0].scene.items.length,4);await undo();assert.equal((await snapshot()).floors[0].scene.items.length,6);
 console.log('PASS group drag and movement, one-step undo/redo, box selection, copy/paste and group delete');
 await page.getByRole('button',{name:'Select, shortcut V',exact:true}).click();await click(0,-4);await page.keyboard.press('Control+d');objects=(await snapshot()).floors[0].scene;assert.equal(objects.walls.length,5);assert.equal(objects.openings.length,2);const duplicateWall=objects.walls.find(w=>!scene.walls.some(original=>original.id===w.id));assert.equal(objects.openings.find(o=>o.id!=='door').wallId,duplicateWall.id);await undo();
 console.log('PASS wall duplication preserves opening links and leaves original geometry intact');
 await page.getByRole('button',{name:'Trace floor plan',exact:false}).click();await page.getByLabel('Reference floor plan image').setInputFiles({name:'blueprint.png',mimeType:'image/png',buffer:await readFile(new URL('../public/logo.png',import.meta.url))});await page.getByText(/blueprint.png · Locked/).waitFor();objects=(await snapshot()).floors[0].scene;assert.ok(objects.reference.dataUrl.startsWith('data:image/png'));assert.equal(objects.reference.calibrated,false);
 const originalReference=structuredClone(objects.reference),originalWalls=structuredClone(objects.walls);await page.getByRole('button',{name:'Calibrate scale',exact:true}).click();await page.getByText('Click the first measurement point on the image.',{exact:true}).waitFor();await click(-2,0);await click(2,0);await page.getByRole('spinbutton',{name:'Calibration distance in metres'}).fill('8');await page.getByRole('button',{name:'Apply scale',exact:true}).click();objects=(await snapshot()).floors[0].scene;
 assert.equal(objects.reference.calibrated,true);assert.ok(Math.abs(objects.reference.widthM/originalReference.widthM-2)<.03);assert.deepEqual(objects.walls,originalWalls);assert.ok(objects.canvas.widthM>=objects.reference.widthM);center=[objects.reference.center[0],objects.reference.center[1]];
 console.log('PASS locked reference import, two-point real-world calibration and automatic canvas expansion');
 const calibrated=structuredClone(objects.reference);await undo();assert.equal((await snapshot()).floors[0].scene.reference.calibrated,false);await page.getByRole('button',{name:'Redo (Ctrl+Shift+Z)',exact:true}).click();assert.deepEqual((await snapshot()).floors[0].scene.reference,calibrated);
 const opacity=page.getByRole('slider',{name:'Reference opacity'});await opacity.focus();await opacity.press('Home');await opacity.press('ArrowRight');objects=(await snapshot()).floors[0].scene;assert.ok(objects.reference.opacity<=.15);
 await page.getByRole('checkbox',{name:'Show reference image'}).uncheck();assert.equal((await snapshot()).floors[0].scene.reference.visible,false);await page.getByRole('checkbox',{name:'Show reference image'}).check();
 await page.getByRole('button',{name:'Wall, shortcut W',exact:true}).click();await click(-4,2);await click(-1,2);await page.keyboard.press('Escape');objects=(await snapshot()).floors[0].scene;assert.equal(objects.walls.length,5);assert.deepEqual(objects.reference.center,calibrated.center);
 console.log('PASS calibration undo/redo, opacity, visibility and tracing without moving the locked image');
 await page.getByText('Saved in this browser',{exact:true}).waitFor();await page.reload();await page.getByRole('textbox',{name:'Project name'}).waitFor();objects=(await snapshot()).floors[0].scene;assert.equal(objects.reference.calibrated,true);assert.equal(objects.reference.name,'blueprint.png');
 await page.getByRole('button',{name:'Trace floor plan',exact:false}).click();await page.getByRole('button',{name:'Remove reference',exact:true}).click();assert.equal((await snapshot()).floors[0].scene.reference,undefined);await undo();assert.equal((await snapshot()).floors[0].scene.reference.name,'blueprint.png');
 await page.setViewportSize({width:800,height:1200});await page.getByRole('button',{name:'Select, shortcut V',exact:true}).click();await page.getByLabel('Selected object count').waitFor();assert.equal(await page.getByRole('button',{name:'Trace floor plan',exact:false}).isVisible(),true);
 assert.deepEqual(errors,[]);console.log('PASS reference persistence, removal/undo, tablet controls and no uncaught browser errors');
}catch(error){console.error("Browser errors:",errors);console.error((await page.locator("body").innerText()).slice(0,2200));await page.screenshot({path:"/tmp/homesketches-selection-failure.png"});throw error;}finally{await browser.close();}
