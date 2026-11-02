import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {test,expect} from '@playwright/test';
test.use({viewport:{width:360,height:600}});
async function manual(page,id){await page.locator('#manual').click();await page.locator('#manual-id').fill(id);await page.locator('#manual-form .primary').click()}
async function start(page){await page.locator('[data-page="shop"]').click()}
async function fakeCamera(page){const images={};for(const id of ['P001','P002','P003','P004'])images[id]=await QRCode.toDataURL(id,{width:400,margin:4});await page.addInitScript(images=>{
 window.cameraCalls=0;window.testTracks=[];window.scanCanvas=null;
 navigator.mediaDevices.getUserMedia=async()=>{window.cameraCalls++;const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.style='position:fixed;left:-9999px;width:1px;height:1px';document.body.append(canvas);window.scanCanvas=canvas;window.showCode=async id=>{const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,400,400);if(id){const image=new Image();image.src=images[id];await image.decode();ctx.drawImage(image,120,120,160,160)}};await window.showCode(null);const stream=canvas.captureStream(0);const track=stream.getVideoTracks()[0];setInterval(()=>{canvas.getContext('2d').drawImage(canvas,0,0);track.requestFrame()},100);window.testTracks.push(...stream.getTracks());return stream};
 },images)}
test('home, basket, bilingual payments, local product mapping and offline restart',async({page,context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await fakeCamera(page);await page.goto('/');
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await expect(page.locator('.offline')).toContainText('可离线玩');
 await expect(page.locator('.start-button')).toBeVisible();expect(await page.evaluate(()=>window.cameraCalls)).toBe(0);await start(page);
 for(const id of ['P001','P002','P003','P004'])await manual(page,id);
 await expect(page.locator('.total strong')).toHaveText('¥25.00');await expect(page.locator('.basket-row').first()).toHaveAttribute('data-item','P004');
 await page.locator('[data-add="P001"]').click();await page.locator('[data-minus="P002"]').click();await expect(page.locator('.total strong')).toHaveText('¥33.00');
 expect(await page.evaluate(()=>window.cameraCalls)).toBe(1);
 await page.locator('#language').click();await page.reload();await start(page);await expect(page.locator('.total strong')).toHaveText('¥33.00');
 await page.locator('#checkout').click();await page.locator('[data-pay="cash"]').click();await page.locator('#cash').fill('20');await expect(page.locator('#finish')).toBeDisabled();await page.locator('#cash').fill('50');await expect(page.locator('#change')).toContainText('¥17.00');await page.locator('#finish').click();await expect(page.locator('.receipt')).toContainText('All paid!');await page.locator('[data-close]').click();await expect(page.locator('.badge')).toHaveText('0');
 for(const method of ['qr','card']){await manual(page,'P001');await page.locator('#checkout').click();await page.locator(`[data-pay="${method}"]`).click();await page.locator('#finish').click();await expect(page.locator('.receipt')).toContainText('¥10.00');await page.locator('[data-close]').click()}
 await page.locator('#home').click();await page.locator('[data-page="products"]').click();await page.locator('[data-edit="P001"]').click();await page.locator('[name="zh"]').fill('苹果');await page.locator('[name="en"]').fill('Apple');await page.locator('[name="price"]').fill('5');await page.locator('#edit .primary').click();await page.locator('#home').click();await start(page);await manual(page,'P001');await expect(page.locator('.total strong')).toHaveText('¥5.00');
 await context.setOffline(true);await page.reload();await expect(page.locator('h1')).toContainText('Hello');await start(page);await expect(page.locator('.total strong')).toHaveText('¥5.00');await expect(page.locator('.basket-row')).toContainText('Apple');await manual(page,'P002');await expect(page.locator('.total strong')).toHaveText('¥7.00');expect(errors).toEqual([]);
});
test('QR labels decode to bare IDs',async({page})=>{await page.goto('/');await page.locator('[data-page="labels"]').click();await expect(page.locator('canvas')).toHaveCount(4);await page.waitForFunction(()=>document.querySelector('canvas')?.width===180);const images=await page.locator('canvas').evaluateAll(canvases=>canvases.map(c=>({id:c.dataset.qr,width:c.width,height:c.height,data:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)})));for(const image of images){expect(jsQR(new Uint8ClampedArray(image.data),image.width,image.height)?.data).toBe(image.id)}});
test('continuous scanning deduplicates, rearms, pauses during payment and releases on home',async({page})=>{
 await fakeCamera(page);await page.goto('/');await start(page);await page.waitForFunction(()=>!!window.showCode);await page.evaluate(()=>window.showCode('P003'));await expect(page.locator('.badge')).toHaveText('1');
 await page.waitForTimeout(2200);await expect(page.locator('.badge')).toHaveText('1');
 await page.evaluate(()=>window.showCode(null));await page.waitForTimeout(1300);await page.evaluate(()=>window.showCode('P003'));await expect(page.locator('.badge')).toHaveText('2');
 await page.evaluate(()=>window.showCode('P001'));await expect(page.locator('.badge')).toHaveText('3');await expect(page.locator('.basket-row').first()).toHaveAttribute('data-item','P001');
 expect(await page.evaluate(()=>window.cameraCalls)).toBe(1);
 await page.evaluate(()=>window.showCode('P003'));await expect(page.locator('.badge')).toHaveText('4');await expect(page.locator('.basket-row').first()).toHaveAttribute('data-item','P003');await expect(page.locator('[data-item="P003"] .stepper span')).toHaveText('3');expect(await page.locator('#basket-items').evaluate(el=>el.scrollTop)).toBe(0);
 await page.locator('#checkout').click();await page.evaluate(()=>window.showCode('P002'));await page.waitForTimeout(1400);await expect(page.locator('.badge')).toHaveText('4');await page.locator('[data-close]').click();await expect(page.locator('.badge')).toHaveText('5');
 await page.locator('#home').click();expect(await page.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended'))).toBe(true);
});
for(const size of [{width:360,height:560},{width:360,height:640},{width:412,height:732},{width:640,height:360}]){
 test(`only basket scrolls at ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);await fakeCamera(page);await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await start(page);for(const id of ['P001','P002','P003','P004'])await manual(page,id);
 const bounds=await page.evaluate(()=>{const r=document.querySelector('#checkout').getBoundingClientRect();const v=document.querySelector('.scanner').getBoundingClientRect();const b=document.querySelector('.basket-items');b.scrollTop=1000;return {fits:r.bottom<=innerHeight&&r.top>=0&&v.top>=0,scroll:b.scrollTop,body:document.documentElement.scrollHeight,height:innerHeight}});
 if(size.height>size.width){const visibleItems=await page.evaluate(()=>document.querySelector('.basket-items').clientHeight/document.querySelector('.basket-row').getBoundingClientRect().height);expect(visibleItems).toBeGreaterThanOrEqual(2.5)}
 expect(bounds.fits).toBe(true);expect(bounds.scroll).toBeGreaterThan(0);expect(bounds.body).toBeLessThanOrEqual(bounds.height);
 await page.screenshot({path:`/tmp/market-checkout-${size.width}x${size.height}.png`});
 });
}
test('denied camera keeps the fixed checkout usable through manual IDs',async({page})=>{await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError')}});await page.goto('/');await start(page);await expect(page.locator('#retry-camera')).toBeVisible();await manual(page,'P001');await expect(page.locator('.total strong')).toHaveText('¥10.00');await expect(page.locator('#checkout')).toBeInViewport()});
test('payment buttons work when older browsers reject reopening an open dialog',async({page})=>{
 test.setTimeout(12000);
 await page.addInitScript(()=>{const original=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){if(this.open)throw new DOMException('Dialog already open','InvalidStateError');return original.call(this)}});
 await fakeCamera(page);await page.goto('/');await start(page);await manual(page,'P001');
 for(const method of ['cash','card','qr']){
  await page.locator('#checkout').click();await page.locator(`[data-pay="${method}"]`).click();await page.locator('[data-close]').click();await expect(page.locator('#modal')).not.toBeVisible();
  await page.locator('#checkout').click();await page.locator(`[data-pay="${method}"]`).click();await page.locator('#finish').click();await expect(page.locator('.receipt')).toBeVisible();await page.locator('[data-close]').click();await manual(page,'P001');
 }
});
test('successful scans ding once and show product feedback for one second before resuming',async({page})=>{
 await page.addInitScript(()=>{
  window.scanSounds=[];const start=OscillatorNode.prototype.start;
  OscillatorNode.prototype.start=function(...args){window.scanSounds.push({state:this.context.state});return start.apply(this,args)};
 });
 await fakeCamera(page);await page.goto('/');await start(page);await page.waitForFunction(()=>!!window.showCode);
 await page.evaluate(()=>{window.feedbackTimes=[];new MutationObserver(()=>{window.feedbackTimes.push({hidden:document.querySelector('#scan-feedback').hidden,time:performance.now()})}).observe(document.querySelector('#scan-feedback'),{attributes:true,attributeFilter:['hidden']})});
 await page.evaluate(()=>window.showCode('P001'));
 await expect(page.locator('#scan-feedback')).toBeVisible();await expect(page.locator('#scan-feedback')).toContainText('牛奶');await expect(page.locator('#scan-feedback')).toContainText('¥10.00');await expect(page.locator('#scan-feedback')).toContainText('× 1');
 const sounds=await page.evaluate(()=>window.scanSounds);expect(sounds).toHaveLength(1);expect(sounds[0].state).toBe('running');
 await page.waitForTimeout(300);await expect(page.locator('#scan-feedback')).toBeVisible();
 // A new code appearing during the confirmation must not interrupt it or add early.
 await page.evaluate(()=>window.showCode('P002'));await page.waitForTimeout(250);await expect(page.locator('.badge')).toHaveText('1');await expect(page.locator('#scan-feedback')).toContainText('牛奶');
 await expect(page.locator('.badge')).toHaveText('2');await expect(page.locator('#scan-feedback')).toContainText('水');
 const times=await page.evaluate(()=>window.feedbackTimes);const shown=times.find(t=>!t.hidden);const hidden=times.find(t=>t.hidden&&t.time>shown.time);expect(hidden.time-shown.time).toBeGreaterThanOrEqual(950);expect(hidden.time-shown.time).toBeLessThan(1600);
 await expect(page.locator('#scan-feedback')).toBeHidden();await page.waitForTimeout(1300);await expect(page.locator('.badge')).toHaveText('2');expect(await page.evaluate(()=>window.scanSounds.length)).toBe(2);
 await page.locator('#home').click();await expect(page.locator('#scan-feedback')).toBeHidden();
});
test('scanning and visual confirmation still work when audio is unavailable',async({page})=>{
 await page.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined});await fakeCamera(page);await page.goto('/');await start(page);await page.waitForFunction(()=>!!window.showCode);await page.evaluate(()=>window.showCode('P003'));await expect(page.locator('#scan-feedback')).toContainText('可乐');await expect(page.locator('.badge')).toHaveText('1');await expect(page.locator('#scan-feedback')).toBeHidden();
});
test('ignores off-target labels and confirms the centered QR product',async({page})=>{
 const images={};for(const id of ['P001','P002'])images[id]=await QRCode.toDataURL(id,{width:400,margin:4});
 await page.addInitScript(images=>{navigator.mediaDevices.getUserMedia=async()=>{
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');canvas.style='position:fixed;left:-9999px;width:1px;height:1px';document.body.append(canvas);
  window.showTarget=async centered=>{ctx.fillStyle='white';ctx.fillRect(0,0,640,480);const milk=new Image();milk.src=images.P001;await milk.decode();ctx.drawImage(milk,10,10,96,96);if(centered){const water=new Image();water.src=images.P002;await water.decode();ctx.drawImage(water,210,130,220,220)}};
  await window.showTarget(false);const stream=canvas.captureStream(0);const track=stream.getVideoTracks()[0];setInterval(()=>{ctx.drawImage(canvas,0,0);track.requestFrame()},100);return stream;
 }},images);
 await page.goto('/');await start(page);await page.waitForFunction(()=>!!window.showTarget);await page.waitForTimeout(1600);await expect(page.locator('.badge')).toHaveText('0');
 await page.evaluate(()=>window.showTarget(true));await expect(page.locator('.badge')).toHaveText('1');await expect(page.locator('.basket-row')).toHaveAttribute('data-item','P002');await expect(page.locator('#scan-feedback')).toContainText('水');await expect(page.locator('#scan-feedback')).toContainText('P002');
});
test('a stalled video frame cannot confirm a product',async({page})=>{
 await fakeCamera(page);await page.addInitScript(()=>{const descriptor=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{configurable:true,get(){return window.releaseFrames?descriptor.get.call(this):0}})});
 await page.goto('/');await start(page);await page.waitForFunction(()=>!!window.showCode);await page.evaluate(()=>window.showCode('P001'));await page.waitForTimeout(1400);await expect(page.locator('.badge')).toHaveText('0');await page.evaluate(()=>{window.releaseFrames=true});await expect(page.locator('.badge')).toHaveText('1');await expect(page.locator('#scan-feedback')).toContainText('P001');
});
test('repository PNG pictures are precached and old local catalogs work offline without losing custom products',async({page,context})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('market-products'))localStorage.setItem('market-products',JSON.stringify([
 {id:'P001',zh:'牛奶',en:'Milk',price:1250,unitZh:'瓶',unitEn:'bottle',emoji:'🥛',color:'blue'},
 {id:'P002',zh:'玩具车',en:'Toy car',price:2500,unitZh:'个',unitEn:'item',emoji:'🚗',color:'aqua'},
 {id:'P003',zh:'可乐',en:'Coke',price:300,unitZh:'瓶',unitEn:'bottle',emoji:'🥤',color:'pink'},
 {id:'P004',zh:'面条',en:'Noodles',price:1000,unitZh:'包',unitEn:'pack',emoji:'🍜',color:'yellow'}
 ]))});
 await fakeCamera(page);await page.goto('/');await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
 const pngCached=await page.evaluate(async()=>{for(const key of await caches.keys()){const cache=await caches.open(key);for(const req of await cache.keys()){if(/product-icons-.*\.png$/.test(new URL(req.url).pathname)){const response=await cache.match(req);return response.ok&&(await response.blob()).size>0}}}return false});expect(pngCached).toBe(true);
 await context.setOffline(true);await page.locator('[data-page="products"]').click();await expect(page.locator('[data-edit="P001"] .picture-milk')).toHaveCount(1);await expect(page.locator('[data-edit="P003"] .picture-cola')).toHaveCount(1);await expect(page.locator('[data-edit="P002"] .product-picture')).toHaveCount(0);await expect(page.locator('[data-edit="P002"]')).toContainText('玩具车');await expect(page.locator('[data-edit="P001"]')).toContainText('¥12.50');
 const loaded=await page.locator('.picture-cola').evaluate(el=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src=getComputedStyle(el).backgroundImage.slice(5,-2)}));expect(loaded).toBe(true);
 await page.locator('[data-edit="P003"]').click();await page.locator('[name="art"]').selectOption('');await page.locator('#edit .primary').click();await expect(page.locator('[data-edit="P003"] .product-picture')).toHaveCount(0);
 await page.locator('#home').click();await start(page);await manual(page,'P001');await expect(page.locator('.basket-row .picture-milk')).toHaveCount(1);await page.screenshot({path:'/tmp/market-product-pictures.png'});
});
