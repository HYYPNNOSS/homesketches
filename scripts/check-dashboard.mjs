import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: {width:1440,height:1000} });
page.setDefaultTimeout(20000);
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base=process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const image={name:'reference.png',mimeType:'image/png',buffer:readFileSync(new URL('../public/logo.png', import.meta.url))};
try {
 for(const [path,title] of [['/dashboard','Bring a space to life.'],['/dashboard/projects','Projects that keep moving.'],['/dashboard/assets','A quieter place for references.'],['/dashboard/settings','Make the studio yours.'],['/dashboard/text-to-sketch','Give the first idea a shape.'],['/dashboard/sketch',null]]) {
  const response=await page.goto(base+path); assert.equal(response.status(),200);
  if(title) await page.getByRole('heading',{name:title,exact:true}).waitFor();
 }
 console.log('PASS all dashboard routes render');
 await page.getByRole('link',{name:'Asset library'}).click(); await page.waitForURL('**/dashboard/assets');
 await page.locator('input[type=file]').setInputFiles(image);
 await page.getByText('Assets saved in this browser.',{exact:true}).waitFor();
 await page.reload(); await page.getByText('reference.png',{exact:true}).waitFor();
 const downloadPromise=page.waitForEvent('download'); await page.getByRole('button',{name:'Download',exact:true}).click(); assert.equal((await downloadPromise).suggestedFilename(),'reference.png');
 await page.getByRole('link',{name:'Use image'}).click(); await page.waitForURL('**/dashboard/text-to-sketch?asset=*');
 await page.getByRole('img',{name:'Attachment 1'}).waitFor();
 console.log('PASS asset upload, refresh persistence, download, attach');
 // Direction endpoint is unavailable: the original description must still reach render.
 let renderedPrompt;
 await page.route('**/api/v1/direction',route=>route.fulfill({status:503,json:{error:'offline'}}));
 await page.route('**/api/v1/render',route=>{ renderedPrompt=route.request().postDataJSON().prompt; return route.fulfill({json:{image:image.buffer.toString('base64'),mime:'image/png',model:'test',fallbackUsed:false,width:1,height:1}}); });
 await page.getByRole('textbox').fill('A warm minimal room');
 await page.getByRole('button',{name:'Start direction'}).click();
 await page.getByRole('heading',{name:'Direction generated'}).waitFor(); assert.equal(renderedPrompt,'A warm minimal room');
 await page.getByRole('button',{name:'Use in Workspace'}).click();
 await page.waitForURL('**/dashboard?asset=*');
 await page.locator('.generation-floor-plan').getByText('generated-render.png',{exact:true}).waitFor();
 await page.getByRole('link',{name:'Your projects'}).click(); await page.waitForURL('**/dashboard/projects');
 await page.getByText('A warm minimal room',{exact:true}).waitFor();
 await page.reload(); await page.getByText('A warm minimal room',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Open ↗',exact:true}).click(); await page.getByRole('img',{name:'A warm minimal room'}).waitFor();
 console.log('PASS text render fallback, archive save, refresh persistence, open');
 await page.locator('.studio-nav a[href="/dashboard"]').click(); await page.waitForURL('**/dashboard');
 const video=page.locator('.generation-video');
 await video.locator('input[type=file]').setInputFiles(image);
 await page.route('**/api/fal',route=>route.fulfill({json:{configured:false}}));
 await video.getByRole('button',{name:'Generate video'}).click();
 await video.getByRole('alert').filter({hasText:'FAL_KEY'}).waitFor();
 assert.equal(await video.getByRole('button',{name:'Generate video'}).isEnabled(),true);
 console.log('PASS missing generation key shows actionable error and allows retry');
 // Mock provider calls only. No paid requests are made.
 let failPolling=true; let submitBody; let submitTarget;
 await page.route('**/api/fal',async route=>{
   const request=route.request(), target=request.headers()['x-fal-target-url'];
   if(!target) return route.fulfill({json:{configured:true}});
   if(target.includes('/storage/upload/initiate')) return route.fulfill({json:{upload_url:base+'/test-upload',file_url:'https://example.com/input.png'}});
   if(target.includes('/status')) return route.fulfill(failPolling?{status:400,json:{message:'Generation rejected for test'}}:{json:{status:'COMPLETED'}});
   if(request.method()==='POST') { submitBody=request.postDataJSON(); submitTarget=target; return route.fulfill({json:{request_id:'job-1'}}); }
   return route.fulfill({json:submitTarget?.includes('trellis') ? {model_mesh:{url:base+'/fixture.gltf'}} : {video:{url:base+'/homewalktrough.mp4'}}});
 });
 await page.route('**/test-upload',route=>route.fulfill({status:200,body:''}));
 await video.getByRole('button',{name:'Generate video'}).click();
 await video.getByRole('alert').filter({hasText:'Generation rejected for test'}).waitFor();
 assert.equal(await video.getByRole('button',{name:'Generate video'}).isEnabled(),true);
 failPolling=false;
 await video.getByRole('button',{name:'Generate video'}).click();
 await video.locator('video').waitFor(); assert.equal(submitBody.start_image_url,'https://example.com/input.png');
 await page.getByRole('link',{name:'Your projects'}).click(); await page.getByText('Sketch to video · reference.png',{exact:true}).waitFor();
 console.log('PASS polling failure recovery, correct video payload, result player and archive');
 const positions=new Float32Array([-1,0,0,1,0,0,0,1.5,0]);
 const geometry={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{uri:'data:application/octet-stream;base64,'+Buffer.from(positions.buffer).toString('base64'),byteLength:positions.byteLength}],bufferViews:[{buffer:0,byteLength:positions.byteLength,target:34962}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-1,0,0],max:[1,1.5,0]}]};
 await page.route('**/fixture.gltf',route=>route.fulfill({json:geometry}));
 await page.locator('.studio-nav a[href="/dashboard"]').click();
 const model=page.locator('.generation-3d');
 await model.locator('input[type=file]').setInputFiles(image);
 await model.getByRole('button',{name:'Build 3D model'}).click();
 await model.locator('.model-preview-canvas canvas').waitFor();
 await model.getByText('Loading model…',{exact:true}).waitFor({state:'hidden'});
 assert.equal(await model.getByRole('alert').count(),0);
 assert.equal(submitBody.image_url,'https://example.com/input.png');
 assert.equal(submitTarget,'https://queue.fal.run/fal-ai/trellis');
 console.log('PASS 3D request schema and interactive model loading');

 await page.locator('.studio-nav a[href="/dashboard/settings"]').click(); await page.getByText('Sign in to load and update your profile.',{exact:true}).waitFor();
 await page.evaluate(()=>localStorage.setItem('homesketches_access_token','test.'+btoa(JSON.stringify({sub:'test-user'}))+'.test'));
 let profile={id:'test-user',name:'Original name',email:'test@example.com'};
 await page.route('**/api/auth/me',route=>{
  if(route.request().method()==='PATCH') { assert.equal(route.request().headers().authorization,'Bearer test.'+Buffer.from(JSON.stringify({sub:'test-user'})).toString('base64')+'.test'); profile.name=route.request().postDataJSON().name; }
  return route.fulfill({json:profile});
 });
 await page.reload(); await page.getByRole('textbox',{name:'Display name'}).fill('Updated name');
 await page.getByRole('checkbox').uncheck();
 await page.getByRole('button',{name:'Save preferences'}).click(); await page.getByRole('status').filter({hasText:'Profile saved.'}).waitFor();
 assert.equal(profile.name,'Updated name'); await page.reload(); await page.waitForFunction(()=>document.querySelector('input[type=checkbox]')?.disabled===false); assert.equal(await page.getByRole('checkbox').isChecked(),false);
 await page.getByRole('link',{name:'Your projects'}).click(); await page.getByText('No saved results yet.',{exact:false}).waitFor();
 console.log('PASS profile PATCH, notification persistence, account-scoped archive');
 await page.evaluate(()=>localStorage.removeItem('homesketches_access_token')); await page.reload();
 await page.getByRole('button',{name:'Delete Sketch to video · reference.png'}).click();
 await page.getByText('Sketch to video · reference.png',{exact:true}).waitFor({state:'hidden'});
 await page.getByRole('link',{name:'Asset library'}).click();
 await page.getByText('reference.png',{exact:true}).waitFor();
 while (await page.getByRole('button',{name:'Delete',exact:true}).count()) {
   await page.getByRole('button',{name:'Delete',exact:true}).first().click();
   await page.waitForTimeout(100);
 }
 await page.getByText('Your library is waiting for its first reference.',{exact:true}).waitFor();
 console.log('PASS project and asset deletion');
 await page.setViewportSize({width:390,height:844});
 await page.locator('.studio-nav a[href="/dashboard/settings"]').click();
 await page.getByRole('heading',{name:'Make the studio yours.'}).waitFor();
 const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,inner:innerWidth,sidebar:document.querySelector('.studio-sidebar').getBoundingClientRect().height}));
 assert.ok(overflow.sidebar<300,JSON.stringify(overflow)); assert.ok(overflow.width<=overflow.inner+1,JSON.stringify(overflow));
 console.log('PASS mobile navigation and page width');
 assert.deepEqual(errors,[]);
 console.log('PASS no uncaught browser errors');
} finally { await browser.close(); }
