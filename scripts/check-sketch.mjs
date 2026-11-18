import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
const base=process.env.TEST_BASE_URL??'http://localhost:3000';
const scene={unit:'m',canvas:{widthM:10,depthM:8,gridStep:.1},walls:[{id:'w1',a:[0,0],b:[10,0],color:0xf3f4f6},{id:'w2',a:[10,0],b:[10,8]},{id:'w3',a:[10,8],b:[0,8]},{id:'w4',a:[0,8],b:[0,0]}],rooms:[{id:'r1',name:'Living',x:0,z:0,w:10,d:8}],openings:[{id:'o1',type:'door',wallId:'w1',at:[2,0],w:1}],items:[{id:'i1',kind:'sofa',x:7,z:6,rot:Math.PI/4,scale:1.5}],virtualCameras:[{id:'c1',name:'Entrance',position:[2,2],targetPosition:[7,4],heightM:1.6,fov:55},{id:'c2',name:'Window',position:[7,4],targetPosition:[2,2],heightM:1.6,fov:65}]};
const project={unit:'m',name:'Review apartment',activeFloorId:'ground',floors:[{id:'ground',name:'Ground Floor',elevationM:0,scene:structuredClone(scene)},{id:'upper',name:'Upper Floor',elevationM:3,scene:structuredClone(scene)}]};
async function fileInput(value){await page.locator('.sk-import-button input').setInputFiles({name:'design.json',mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});}
async function exported(){const next=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();return JSON.parse(await readFile(await (await next).path(),'utf8'));}
async function world(x,z){const box=await page.locator('.sk-canvas').boundingBox();const zoom=parseFloat(await page.getByLabel('Canvas zoom').textContent())/100;return {x:box.x+box.width/2+x/(20*box.width/box.height/zoom)*box.width,y:box.y+box.height/2+z/(20/zoom)*box.height};}
async function clickWorld(x,z){const p=await world(x,z);await page.mouse.click(p.x,p.y);}
async function nameIs(name){await page.waitForFunction(name=>document.querySelector('input[aria-label="Project name"]')?.value===name,name);}
try{
 await page.goto(base+'/dashboard/sketch');await page.getByRole('textbox',{name:'Project name'}).waitFor();await page.waitForFunction(()=>document.querySelector('.sk-import-button input')?.disabled===false);
 await fileInput(project);await nameIs('Review apartment');
 let saved=await exported();assert.equal(saved.floors.length,2);assert.equal(saved.floors[0].scene.walls[0].color,0xf3f4f6);assert.deepEqual(saved.floors[0].scene.walls[0].a,[-5,-4]);assert.deepEqual(saved.floors[0].scene.walls[0].b,[5,-4]);assert.ok(parseFloat(await page.getByLabel('Canvas zoom').textContent())>100);
 console.log('PASS import validation, coordinate centering, multiple floors and automatic fit');
 await fileInput('{broken');await page.getByRole('alert').filter({hasText:'not valid JSON'}).waitFor();assert.deepEqual((await exported()).floors,saved.floors);
 const invalid=structuredClone(project);invalid.floors[0].scene.walls[0].a=['bad',0];await fileInput(invalid);await page.getByRole('alert').filter({hasText:'invalid'}).waitFor();assert.deepEqual((await exported()).floors,saved.floors);
 console.log('PASS invalid imports leave the current design intact');
 await page.getByRole('button',{name:'Clear all — reset scene',exact:true}).click();assert.equal((await exported()).floors[0].scene.walls.length,0);
 await page.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();assert.equal((await exported()).floors[0].scene.walls.length,4);
 await page.getByRole('button',{name:'Redo (Ctrl+Shift+Z)',exact:true}).click();assert.equal((await exported()).floors[0].scene.walls.length,0);
 await page.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();
 await page.getByRole('button',{name:/^Upper Floor/}).click();await page.getByRole('button',{name:'Delete floor Upper Floor',exact:true}).click();assert.equal((await exported()).floors.length,1);
 await page.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();assert.equal((await exported()).floors.length,2);
 await page.getByRole('button',{name:/^Ground Floor/}).click();
 console.log('PASS Clear, redo, floor deletion and cross-floor undo');
 await page.getByRole('button',{name:'Select, shortcut V',exact:true}).click();await clickWorld(-1,-4);await page.getByRole('region',{name:'Wall Section properties'}).waitFor();
 await clickWorld(0,0);await page.getByRole('region',{name:'Room properties'}).waitFor();
 await page.getByRole('textbox',{name:'Room name',exact:true}).fill('Living & dining');await page.getByRole('button',{name:'Apply room changes'}).click();assert.equal((await exported()).floors[0].scene.rooms[0].name,'Living & dining');
 console.log('PASS selection along complete walls and room inspector');
 await page.getByRole('button',{name:'Fit to plan',exact:true}).click();const old=await world(-5,-4),next=await world(-4,-4);await page.mouse.move(old.x,old.y);await page.mouse.down();await page.mouse.move(next.x,next.y,{steps:12});await page.mouse.up();
 saved=await exported();const active=saved.floors.find(f=>f.id===saved.activeFloorId).scene;assert.deepEqual(active.walls[0].a,active.walls[3].b);assert.ok(active.walls[0].a[0]>-5);assert.ok(active.openings[0].at[0]>-3);
 console.log('PASS shared-junction movement keeps walls and door attached');
 await clickWorld(0,0);await page.getByRole('region',{name:'Room properties'}).waitFor();
 await page.getByRole('spinbutton',{name:'Room width',exact:true}).fill('8');await page.getByRole('spinbutton',{name:'Room depth',exact:true}).fill('6');await page.getByRole('button',{name:'Apply room changes'}).click();
 const resized=(await exported()).floors.find(f=>f.id==='ground').scene;assert.equal(resized.rooms[0].w,8);assert.equal(resized.rooms[0].d,6);
 console.log('PASS precise room dimensions');

 const name=page.getByRole('textbox',{name:'Project name'});await name.fill('Apartment edited');await name.press('Enter');await page.getByText('Saved in this browser',{exact:true}).waitFor();await page.reload();await nameIs('Apartment edited');
 await page.getByRole('button',{name:'Save a copy',exact:true}).click();await nameIs('Apartment edited copy');await page.getByRole('button',{name:'Open',exact:true}).click();
 await page.getByRole('combobox',{name:'Saved designs'}).waitFor();
 const options=await page.getByRole('combobox',{name:'Saved designs'}).locator('option').allTextContents();await page.getByRole('combobox',{name:'Saved designs'}).selectOption({index:options.findIndex(x=>x.startsWith('Apartment edited ·'))});await page.getByRole('button',{name:'Open design',exact:true}).click();await nameIs('Apartment edited');
 console.log('PASS named autosave, refresh restoration, Save a copy and opening designs');
 await page.route('**/api/v1/render',async route=>route.fulfill({json:{image:(await readFile(new URL('../public/logo.png',import.meta.url))).toString('base64'),mime:'image/png',model:'test'}}));
 await page.getByRole('button',{name:'Render with Roomwright AI',exact:true}).click();await page.getByRole('img',{name:'Rendered result',exact:true}).waitFor();assert.ok((await page.locator('.sk-compare-overlay img').getAttribute('src')).startsWith('data:image/png;base64,'));
 console.log('PASS actual source image preserved for render comparison');
 await page.getByRole('button',{name:'Cameras',exact:true}).click();await page.getByRole('button',{name:'Move Window earlier',exact:true}).click();assert.equal((await exported()).floors.find(f=>f.id==='ground').scene.virtualCameras[0].name,'Window');
 await page.getByRole('spinbutton',{name:'Walkthrough duration'}).fill('3');const movie=page.waitForEvent('download',{timeout:20000});await page.getByRole('button',{name:'Record WebM walkthrough',exact:true}).click();assert.ok((await movie).suggestedFilename().endsWith('.webm'));
 console.log('PASS camera ordering and timed walkthrough recording');
 const glb=page.waitForEvent('download');await page.getByRole('button',{name:'Export scene as GLB 3D model',exact:true}).click();const bytes=await readFile(await (await glb).path());assert.equal(bytes.readUInt32LE(0),0x46546c67);const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.ok(gltf.nodes.some(n=>n.name==='floor-slab-ground'));assert.ok(gltf.nodes.some(n=>n.name==='floor-slab-upper'));
 const svg=page.waitForEvent('download');await page.getByRole('button',{name:'Export vector SVG floor plan',exact:true}).click();const vector=await readFile(await (await svg).path(),'utf8');assert.ok(vector.includes('rotate(45'));assert.ok(vector.includes('Living &amp; dining'));
 console.log('PASS GLB exports both floors; SVG preserves furniture rotation and labels');
 await page.setViewportSize({width:800,height:1100});assert.equal(await page.locator('.sk-design-panel').isVisible(),false);await page.getByRole('button',{name:'Render & design',exact:true}).click();assert.equal(await page.locator('.sk-design-panel').isVisible(),true);
 await page.getByRole('button',{name:'Materials',exact:true}).click();await page.locator('.sk-design-panel input[type=file]').setInputFiles({name:'surface.png',mimeType:'image/png',buffer:await readFile(new URL('../public/logo.png',import.meta.url))});
 await page.waitForTimeout(300);assert.ok((await exported()).floors.find(f=>f.id==='ground').scene.rooms[0].materialId.startsWith('data:image/png'));

 await page.getByRole('button',{name:'New',exact:true}).click();await nameIs('Untitled Project');
 await page.getByRole('button',{name:'Enclosed room, shortcut R',exact:true}).click();await clickWorld(-2,-2);await clickWorld(2,2);
 const enclosed=(await exported()).floors[0].scene;assert.equal(enclosed.rooms.length,1);assert.equal(enclosed.walls.length,4);
 await page.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();assert.equal((await exported()).floors[0].scene.walls.length,0);
 console.log('PASS enclosed-room drawing and undo');
 assert.deepEqual(errors,[]);console.log('PASS tablet panel, custom textures and no uncaught browser errors');
}finally{await browser.close();}
