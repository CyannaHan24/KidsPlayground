import './style.css';
import jsQR from 'jsqr';
import {prepareScanSound,playScanDing} from './scan-sound.js';
import QRCode from 'qrcode';
import {initialProducts,total,validateProducts} from './model.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let offlineReady=false;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{toast(t('储存空间不可用，请导出备份','Storage unavailable. Please export a backup.'))}}
let products;try{products=validateProducts(read('market-products',initialProducts))}catch{products=structuredClone(initialProducts)}
let basket=read('market-basket',{});if(!basket||typeof basket!=='object'||Array.isArray(basket))basket={};
basket=Object.fromEntries(Object.entries(basket).filter(([id,q])=>products.some(p=>p.id===id)&&Number.isInteger(q)&&q>0&&q<=99));
let lang=read('market-lang','zh')==='en'?'en':'zh',page='home',stream,scanFrame,payment=null,receipt=null;
let scanSession=0,lastCode=null,lastSeen=0,lastAdded=0;
let basketOrder=Object.keys(basket).reverse();
let feedbackUntil=0,feedbackTimer;
const t=(zh,en)=>lang==='zh'?zh:en;
const money=n=>'¥'+(n/100).toFixed(2);
const name=p=>lang==='zh'?p.zh:p.en;
const unit=p=>lang==='zh'?p.unitZh:p.unitEn;
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800)}
function persist(){save('market-basket',basket)}
function add(id,delta=1,fromScan=false){
 const p=products.find(p=>p.id===id);
 if(!p){toast(t('找不到商品，请在商品管理中添加此编号','Unknown product. Add this ID in Products.'));return}
 if(delta>0&&basket[id]>=99){setScanStatus(t('这个商品已经有 99 件啦','This product already has 99 items'));return false}
 const isNew=!basket[id];
 basket[id]=Math.max(0,Math.min(99,(basket[id]||0)+delta));
 if(!basket[id]){delete basket[id];basketOrder=basketOrder.filter(x=>x!==id)}
 else if(isNew||fromScan)basketOrder=[id,...basketOrder.filter(x=>x!==id)];
 persist();updateBasket();
 if(isNew||fromScan)$('#basket-items').scrollTop=0;
 if(delta>0){setScanStatus(t(`已加入 ${p.zh} · 移开后可再扫一次`,`${p.en} added · Move it away to scan again`));navigator.vibrate?.(60)}
 return true;
}
function countItems(){return Object.values(basket).reduce((a,b)=>a+b,0)}
function basketRows(){return basketOrder.filter(id=>basket[id]).map(id=>products.find(p=>p.id===id)).filter(Boolean).map(p=>`<article class="basket-row" data-item="${esc(p.id)}"><span class="mini-art ${esc(p.color||'blue')}">${esc(p.emoji)}</span><div class="item-info"><strong>${esc(name(p))}</strong><small>${money(p.price)} / ${esc(unit(p))}</small></div><div class="item-end"><b>${money(p.price*basket[p.id])}</b><div class="stepper"><button data-minus="${esc(p.id)}" aria-label="${esc(t('减少','Reduce')+' '+name(p))}">−</button><span>${basket[p.id]}</span><button data-add="${esc(p.id)}" aria-label="${esc(t('增加','Add')+' '+name(p))}">+</button></div></div></article>`).join('')||`<div class="empty"><span>🛍️</span><h3>${t('购物篮在等你哦','Your basket is waiting')}</h3><p>${t('把玩具上的二维码对准镜头','Show a toy’s QR code to the camera')}</p></div>`}
function updateBasket(){
 const list=$('#basket-items');if(!list)return;
 const scroll=list.scrollTop;list.innerHTML=basketRows();list.scrollTop=scroll;
 $('.badge').textContent=countItems();$('#item-count').textContent=countItems()+' '+t('件商品','items');
 $('.total strong').textContent=money(total(products,basket));$('#checkout').disabled=!countItems();$('#clear').disabled=!countItems();
 list.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));list.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>add(b.dataset.minus,-1));
}
function navigate(next){if(next==='shop')prepareScanSound();page=next;render()}
function render(){
 stopScanner();document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.body.className='page-'+page;
 $('#app').innerHTML=`<div class="app-shell"><header><button id="home" class="home-button" aria-label="${t('返回首页','Home')}" ${page==='home'?'hidden':''}>‹</button><a class="brand" href="#"><img src="./icon.svg" alt=""><span>${t('小小超市','Little Market')}<small>LITTLE MARKET · PLAY & LEARN</small></span></a><button id="language" class="language">${lang==='zh'?'中 / EN':'中文 / EN'}</button></header><main>${page==='home'?homeView():page==='shop'?shopView():`<div class="management-scroll">${page==='products'?catalogView():labelsView()}</div>`}</main></div><div id="toast" role="status"></div><dialog id="modal"></dialog><div id="scan-feedback" class="scan-feedback" role="status" aria-live="polite" aria-atomic="true" hidden></div>`;
 $('#language').onclick=()=>{lang=lang==='zh'?'en':'zh';save('market-lang',lang);render()};$('.brand').onclick=e=>{e.preventDefault();navigate('home')};$('#home').onclick=()=>navigate('home');
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
 if(page==='shop'){
  updateBasket();$('#clear').onclick=()=>{if(confirm(t('清空购物篮吗？','Empty the basket?'))){basket={};basketOrder=[];persist();updateBasket()}};
  $('#checkout').onclick=()=>{payment=null;showPayment()};$('#manual').onclick=manualEntry;$('#retry-camera').onclick=startScanner;startScanner();
 }
 if(page==='labels'){document.querySelectorAll('[data-qr]').forEach(c=>QRCode.toCanvas(c,c.dataset.qr,{width:180,margin:2,errorCorrectionLevel:'M'}));$('#print').onclick=()=>window.print()}
 if(page==='products')bindCatalog();
}
function homeView(){return `<section class="welcome"><div class="welcome-logo"><img src="./icon.svg" alt=""><span class="sparkle">✦</span><div class="eyebrow">LITTLE MARKET</div><h1>${t('欢迎光临，小小收银员！','Hello, little cashier!')}</h1><p>${t('扫一扫，数一数，快乐购物吧。','Scan, count, and play shop.')}</p></div><button class="start-button" data-page="shop"><span>🧺</span><strong>${t('开始收银','Start checkout')}</strong><span>→</span></button><div class="welcome-bottom"><span class="offline">● ${offlineReady?t('可离线玩','Offline ready'):t('准备离线…','Preparing offline…')}</span><div class="management-buttons"><button data-page="products">✎ ${t('商品管理','Manage products')}</button><button data-page="labels">▣ ${t('二维码贴纸','QR labels')}</button></div><small>${t('小小超市 · 大大的想象力','Little market. Big imagination.')}</small></div></section>`}
function shopView(){return `<section class="checkout-screen"><section class="scanner" aria-label="${t('商品扫码区','Product scanner')}"><div class="camera-view"><video id="video" playsinline muted autoplay></video><div class="scan-guide" aria-hidden="true"></div><span class="camera-label">${t('扫码区','SCAN HERE')}</span><button id="retry-camera" hidden>${t('重试相机','Retry camera')}</button></div><div class="scanner-bottom"><p id="scan-status" role="status">${t('正在打开相机…','Opening camera…')}</p><button id="manual">${t('输入编号','Enter ID')}</button></div></section><section class="basket"><div class="section-title"><h2>🧺 ${t('购物篮','My basket')} <span class="badge">0</span></h2><button class="text-button" id="clear">${t('清空','Clear')}</button></div><div id="basket-items" class="basket-items" tabindex="0" aria-label="${t('购物篮商品，可滚动','Basket items, scrollable')}"></div></section><div class="basket-footer"><div class="total"><div>${t('合计','Total')}<small id="item-count"></small></div><strong></strong></div><button class="primary" id="checkout">${t('去结账','Check out')} <span>→</span></button><p class="pretend">${t('只是游戏，不会产生真实付款','Just pretend. No real payments.')}</p></div></section>`}
function labelsView(){return `<section class="panel"><div class="section-title"><div><h2>${t('给玩具贴上身份牌','Give your toys a little label')}</h2><p>${t('二维码只包含商品编号，修改商品后无需重印。','Codes contain only an ID. Edit products without reprinting.')}</p></div><button class="primary compact" id="print">${t('打印','Print')}</button></div><div id="labels" class="labels">${products.map(p=>`<div class="label"><canvas data-qr="${esc(p.id)}"></canvas><strong>${esc(p.id)}</strong><small>${esc(name(p))} / ${esc(lang==='zh'?p.en:p.zh)}</small></div>`).join('')}</div></section>`}
function catalogView(){return `<section class="panel"><div class="section-title"><div><h2>${t('我的商品','My products')}</h2><p>${t('信息只保存在这台设备上，记得导出备份。','Saved on this device. Export a backup to keep it safe.')}</p></div></div><div class="tools"><button id="export">↓ ${t('导出备份','Export backup')}</button><button id="import">↑ ${t('导入备份','Import backup')}</button><input id="file" type="file" accept="application/json" hidden><button id="new-product">+ ${t('添加商品','Add product')}</button></div><div class="catalog">${products.map(p=>`<button class="catalog-item" data-edit="${esc(p.id)}"><span>${esc(p.emoji)}</span><strong>${esc(name(p))}</strong><small>${esc(p.id)}</small><b>${money(p.price)}</b><span>✎</span></button>`).join('')}</div></section>`}
function bindCatalog(){document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));$('#new-product').onclick=()=>editProduct();$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(products,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='little-market-products.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1000000)throw Error();const data=validateProducts(JSON.parse(await file.text()));if(!confirm(t('用备份替换商品并清空购物篮？','Replace products and empty the basket?')))return;products=data;basket={};save('market-products',products);persist();render();toast(t('导入成功','Backup imported'))}catch{toast(t('备份格式不正确','Invalid backup file'))}}}
function modal(html){const d=$('#modal');d.innerHTML=html;d.querySelector('[data-close]')?.addEventListener('click',()=>d.close());if(!d.open)d.showModal();return d}
function editProduct(id){const p=products.find(p=>p.id===id)||{id:'P'+String(Math.max(0,...products.map(p=>Number(p.id.slice(1))))+1).padStart(3,'0'),zh:'',en:'',price:0,unitZh:'个',unitEn:'item',emoji:'🧸',color:'blue'};const d=modal(`<button class="close" data-close aria-label="Close">×</button><h2>${t('编辑商品','Edit product')}</h2><form id="edit"><label>${t('商品编号（二维码内容）','Product ID (QR content)')}<input name="id" value="${esc(p.id)}" pattern="P[0-9]{3,6}" required ${id?'readonly':''}></label><label>中文名称<input name="zh" value="${esc(p.zh)}" maxlength="40" required></label><label>English name<input name="en" value="${esc(p.en)}" maxlength="60" required></label><label>${t('价格（元）','Price (CNY)')}<input name="price" type="number" min="0" max="100000" step="0.01" value="${p.price/100}" required></label><div class="form-pair"><label>中文单位<input name="unitZh" maxlength="12" value="${esc(p.unitZh)}" required></label><label>English unit<input name="unitEn" maxlength="20" value="${esc(p.unitEn)}" required></label></div><label>${t('商品表情','Product emoji')}<input name="emoji" maxlength="12" value="${esc(p.emoji)}" required></label><button class="primary">${t('保存商品','Save product')}</button></form>`);$('#edit').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));const updated={...p,...data,price:Math.round(Number(data.price)*100)};const next=id?products.map(x=>x.id===id?updated:x):[...products,updated];try{validateProducts(next);products=next;save('market-products',products);d.close();render();toast(t('商品已保存','Product saved'))}catch{toast(t('请检查编号和商品信息，编号不能重复','Check product details. IDs must be unique.'))}}}
function showPayment(){modal(`<button class="close" data-close aria-label="Close">×</button><div class="payment-heading"><span>🛍️</span><h2>${t('今天买得真开心！','What a lovely shop!')}</h2><p>${t('选择一种游戏付款方式','Choose a pretend payment method')}</p><strong>${money(total(products,basket))}</strong></div><div class="payment-options">${[['cash','💵','现金','Cash'],['qr','▣','扫码支付','QR payment'],['card','💳','银行卡','Card']].map(([id,icon,zh,en])=>`<button data-pay="${id}"><span>${icon}</span>${t(zh,en)}<b>→</b></button>`).join('')}</div><p class="pretend">${t('游戏付款 · 不使用真实账户','Play money only · No real accounts')}</p>`);document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>{payment=b.dataset.pay;paymentDetail()})}
function paymentDetail(){const amount=total(products,basket);modal(`<button class="close" data-close aria-label="Close">×</button><div class="payment-heading"><span>${payment==='cash'?'💵':payment==='card'?'💳':'▣'}</span><h2>${payment==='cash'?t('现金付款','Pay with cash'):payment==='card'?t('请刷一下玩具卡','Tap your pretend card'):t('假装扫一扫付款','Pretend to scan and pay')}</h2><strong>${money(amount)}</strong><p>${payment==='cash'?t('收到了多少现金？','How much cash did you receive?'):t('这是游戏付款，点击下面的按钮完成。','This is pretend payment. Tap below to finish.')}</p></div>${payment==='cash'?`<label>${t('收到现金（元）','Cash received (CNY)')}<input id="cash" type="number" step="0.01" min="${amount/100}" value="${amount/100}"></label><p id="change" aria-live="polite"></p>`:''}<button class="primary" id="finish">${payment==='cash'?t('收款完成','Accept cash'):payment==='card'?t('已刷玩具卡','Pretend card tapped'):t('游戏付款完成','Pretend payment complete')}</button>`);if(payment==='cash'){const update=()=>{const raw=$('#cash').value;const received=Math.round(Number(raw)*100);const valid=raw!==''&&Number.isSafeInteger(received)&&received>=amount;$('#change').textContent=valid?t('找零：','Change: ')+money(received-amount):t('现金不够哦','A little more cash is needed');$('#finish').disabled=!valid};$('#cash').oninput=update;update()}$('#finish').onclick=()=>{receipt={items:products.filter(p=>basket[p.id]).map(p=>({...p,qty:basket[p.id]})),total:amount,method:payment,change:payment==='cash'?Math.round(Number($('#cash').value)*100)-amount:null};basket={};basketOrder=[];persist();stopScanner();updateBasket();showReceipt()}}
function showReceipt(){const d=modal(`<div class="receipt"><span class="celebrate">🎉</span><div class="eyebrow">LITTLE MARKET</div><h2>${t('结账成功！','All paid!')}</h2><p>${t('谢谢光临，小小收银员真棒。','Thank you! You’re a wonderful cashier.')}</p><div class="receipt-lines">${receipt.items.map(p=>`<div><span>${esc(name(p))} × ${p.qty}</span><b>${money(p.price*p.qty)}</b></div>`).join('')}<div class="receipt-total"><strong>${t('合计','Total')}</strong><strong>${money(receipt.total)}</strong></div>${receipt.change!==null?`<div><span>${t('找零','Change')}</span><b>${money(receipt.change)}</b></div>`:''}</div><p>${t('游戏付款已完成','Pretend payment complete')}</p><button class="primary" data-close>${t('迎接下一位顾客','Next customer')} →</button></div>`);d.addEventListener('close',()=>{if(page==='shop')startScanner()},{once:true})}
function clearScanFeedback(){
 clearTimeout(feedbackTimer);feedbackUntil=0;
 const popup=$('#scan-feedback');if(popup){popup.hidden=true;popup.innerHTML=''}
}
function showScanFeedback(product){
 clearScanFeedback();feedbackUntil=performance.now()+1000;
 const popup=$('#scan-feedback');
 popup.innerHTML=`<div class="scan-confirmation"><div class="scan-confirmed">✓ ${t('扫码成功','Item scanned')}</div><span class="confirmation-art ${esc(product.color||'blue')}">${esc(product.emoji)}</span><h2>${esc(name(product))}</h2><p>${money(product.price)} / ${esc(unit(product))} · ${esc(product.id)}</p><strong>${t('购物篮数量','In your basket')} × ${basket[product.id]}</strong></div>`;
 popup.hidden=false;playScanDing();
 feedbackTimer=setTimeout(clearScanFeedback,1000);
}
function setScanStatus(message){const el=$('#scan-status');if(el&&el.textContent!==message)el.textContent=message}
function stopScanner(){clearScanFeedback();scanSession++;cancelAnimationFrame(scanFrame);stream?.getTracks().forEach(track=>track.stop());stream=null}
function manualEntry(){const d=modal(`<button class="close" data-close aria-label="Close">×</button><h2>${t('输入商品编号','Enter product ID')}</h2><p>${t('例如 P001，可在二维码贴纸上找到。','For example P001, printed on your QR label.')}</p><form id="manual-form"><label>${t('商品编号','Product ID')}<input id="manual-id" placeholder="P001" autocapitalize="characters" required></label><p id="manual-error" role="status"></p><button class="primary">${t('添加商品','Add product')}</button></form>`);$('#manual-form').onsubmit=e=>{e.preventDefault();const id=$('#manual-id').value.trim().toUpperCase();if(!products.some(p=>p.id===id)){$('#manual-error').textContent=t('未知编号，请先在商品管理中添加','Unknown ID. Add it in Products first.');return}add(id);d.close()}}
async function startScanner(){
 stopScanner();if(page!=='shop'||document.hidden)return;
 const session=scanSession;lastCode=null;lastSeen=0;lastAdded=-Infinity;
 const failed=()=>{setScanStatus(t('无法使用相机，请允许权限或输入编号','Camera unavailable. Allow access or enter an ID.'));$('#retry-camera').hidden=false};
 if(!navigator.mediaDevices?.getUserMedia){failed();return}
 $('#retry-camera').hidden=true;setScanStatus(t('正在打开相机…','Opening camera…'));
 try{
  const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480}},audio:false});
  if(session!==scanSession||page!=='shop'||document.hidden){media.getTracks().forEach(track=>track.stop());return}
  stream=media;const video=$('#video');video.srcObject=media;await video.play();if(session!==scanSession)return;
  setScanStatus(t('一个二维码放框内 · 扫完移开再扫','One QR inside the frame · Move it away after scanning'));
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d',{willReadFrequently:true});let lastFrame=0,lastVideoTime=-1,candidate=null,candidateCount=0;
  const tick=time=>{
   if(session!==scanSession)return;
   const paused=$('#modal').open||time<feedbackUntil;
   if(paused){candidate=null;candidateCount=0}
   if(!paused&&time-lastFrame>=200&&video.readyState>=2&&video.currentTime!==lastVideoTime){
    lastFrame=time;lastVideoTime=video.currentTime;
    // Decode only the centered square indicated by the guide. The preview shows
    // the full camera image, so cropped-out labels cannot silently win a scan.
    const side=Math.floor(Math.min(video.videoWidth,video.videoHeight)*0.85);
    const sx=(video.videoWidth-side)/2,sy=(video.videoHeight-side)/2;
    const scale=Math.min(video.clientWidth/video.videoWidth,video.clientHeight/video.videoHeight);
    const guide=$('.scan-guide');guide.style.width=side*scale+'px';guide.style.height=side*scale+'px';
    canvas.width=Math.min(side,480);canvas.height=canvas.width;
    ctx.drawImage(video,sx,sy,side,side,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const code=jsQR(pixels.data,canvas.width,canvas.height);
    if(code){
     const id=code.data;lastSeen=time;
     if(id===lastCode){candidate=null;candidateCount=0}
     else{
      candidateCount=candidate===id?candidateCount+1:1;candidate=id;
      if(candidateCount>=2&&time-lastAdded>=1100){
       lastCode=id;candidate=null;candidateCount=0;
       const product=products.find(p=>p.id===id);
       if(product){lastAdded=time;if(add(id,1,true))showScanFeedback(product)}
       else setScanStatus(t('未知商品编号：','Unknown product ID: ')+id.slice(0,30));
      }
     }
    }else{
     candidate=null;candidateCount=0;
     if(time-lastSeen>=1000){lastCode=null;setScanStatus(t('把一个二维码放进框内','Place one QR code inside the frame'))}
    }
   }
   scanFrame=requestAnimationFrame(tick);
  };scanFrame=requestAnimationFrame(tick);
 }catch{if(session!==scanSession)return;stopScanner();failed()}
}
document.addEventListener('click',()=>{if(page==='shop')prepareScanSound()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScanner();else if(page==='shop')startScanner()});
function fitViewport(){document.documentElement.style.setProperty('--app-height',window.innerHeight+'px')}
window.addEventListener('resize',fitViewport);fitViewport();

render();
if(import.meta.env.PROD&&'serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{offlineReady=true;const badge=$('.offline');if(badge)badge.textContent='● '+t('可离线玩','Offline ready')}).catch(()=>{const badge=$('.offline');if(badge)badge.textContent=t('在线模式','Online mode')});}
