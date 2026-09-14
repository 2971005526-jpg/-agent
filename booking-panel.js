/* Booking is a selection, never an order. Candidate changes stay separate. */
const pbStorage='jinglv-booking-panel-v1';
let pbData={chengdu:{confirmed:null,draft:null},sanya:{confirmed:null,draft:null}};
try{const saved=JSON.parse(localStorage.getItem(pbStorage));for(const k of Object.keys(pbData)){const v=saved?.[k];if(v&&(!v.confirmed||rvValid(v.confirmed))&&(!v.draft||rvValid(v.draft)))pbData[k]=v}}catch{}
if(rvCurrent){if(JSON.stringify(pbData.chengdu.confirmed?.booking)!==JSON.stringify(rvCurrent.booking))pbData.chengdu.draft=null;pbData.chengdu.confirmed=evClone(rvCurrent)}else pbData.chengdu.confirmed=null;
const pbUI={open:false,key:null,fragment:null,position:null,expanded:null,review:null,order:null,error:'',context:null,mapLock:null};
const pbKinds={out:'去程机票',back:'返程机票',hotel:'入住酒店'};
function pbPersist(){try{localStorage.setItem(pbStorage,JSON.stringify(pbData));return true}catch{pbUI.error='浏览器保存失败，尚未确认，请重试。';return false}}
function pbBase(selection=familyBooking){
  const s=evClone(selection),f=familyFlights[s.out],r=familyFlights[s.back],h=familyHotels[s.hotel];
  return {days:evClone(evStore.chengdu.days),booking:{selection:s,outDate:'10 月 1 日',backDate:'10 月 4 日',out:evClone(f.out),back:evClone(r.back),outPorts:evClone(f.ports),backPorts:[...r.ports].reverse(),hotel:h.name,room:h.room,hotelPrice:h.price,adultPrice:2*(f.op+r.bp),nights:3,delta:0}};
}
function pbModel(key=pbUI.key){
  const m=pbData[key];
  if(key==='chengdu'&&!m.confirmed&&!m.draft&&dialogue.some(x=>x.type==='family-booking')){m.draft=pbBase();pbPersist()}
  return m;
}
function pbPending(){return !!rvSession&&!['cancelled','adopted','stale'].includes(rvSession.stage)}
function pbCapture(){const sc=document.querySelector('.ev-sheet-scroll'),tabs=document.querySelector('.ev-tabs'),svg=document.querySelector('.ev-base .ev-map>svg');return {day:evActive[evKey()],scroll:sc?.scrollTop||0,tabs:tabs?.scrollLeft||0,snap:evSheetSnap,view:svg?.getAttribute('viewBox'),map:svg?.innerHTML}}
function pbInstallQuickTools(){
  const dock=document.querySelector('#bottom.ev-dong-float');if(!dock||dock.querySelector('.pb-quick-tools'))return;
  dock.insertAdjacentHTML('beforeend',`<div class="pb-quick-tools"><div id="pb-quick-menu" class="pb-quick-menu" hidden aria-label="行程小规划"><button type="button" onclick="pbQuickAction('history')">历史版本</button><button type="button" onclick="pbQuickAction('notes')">上传笔记</button><button type="button" onclick="pbQuickAction('ideas')">旅行灵感</button><button type="button" onclick="pbQuickAction('route')">顺路优化</button></div><button class="pb-quick-toggle" type="button" aria-label="展开行程小规划" aria-expanded="false" aria-controls="pb-quick-menu" onclick="pbToggleQuick()"><span aria-hidden="true"></span></button></div>`);
}
function pbToggleQuick(open){
  const menu=document.getElementById('pb-quick-menu'),button=document.querySelector('.pb-quick-toggle');if(!menu||!button)return;
  const expanded=typeof open==='boolean'?open:menu.hidden;menu.hidden=!expanded;button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',expanded?'收起行程小规划':'展开行程小规划');
}
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.pb-quick-tools'))pbToggleQuick(false)});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.pb-quick-menu:not([hidden])')){pbToggleQuick(false);document.querySelector('.pb-quick-toggle')?.focus()}});
function pbQuickDialog(title,body){
  document.getElementById('pb-quick-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='pb-quick-dialog';dialog.className='pb-quick-dialog';dialog.setAttribute('aria-labelledby','pb-quick-title');
  dialog.innerHTML=`<header><h2 id="pb-quick-title">${title}</h2><button type="button" aria-label="关闭" onclick="document.getElementById('pb-quick-dialog').close()">关闭</button></header>${body}`;
  dialog.addEventListener('close',()=>{dialog.remove();document.querySelector('.pb-quick-toggle')?.focus()});document.body.append(dialog);dialog.showModal();
}
function pbQuickAction(action){
  const key=evKey(),city=key==='sanya'?'三亚':'成都';pbToggleQuick(false);
  if(action==='history'){
    const versions=key==='chengdu'?dialogue.map((m,i)=>({m,i})).filter(({m})=>m.snapshot?.days&&m.snapshot?.booking):[];
    let body='<p>仅查看已保存的方案快照，不替换当前行程。</p>';
    if(key==='chengdu'&&rvPrevious)body+='<button class="pb-history-item" onclick="rvPreview(\'previous\')">查看上一个正式版本</button>';
    body+=versions.reverse().map(({m,i})=>`<button class="pb-history-item" onclick="rvPreview('${i}')">${m.snapshot.days.length}天方案 · 对话记录 ${i+1}<small>${esc((m.text||'行程方案快照').slice(0,65))}</small></button>`).join('');
    if(!versions.length&&!(key==='chengdu'&&rvPrevious))body+='<div class="pb-quick-empty">这趟行程暂无历史版本，当前行程保持不变。</div>';
    pbQuickDialog('历史版本',body);return;
  }
  if(action==='notes'){
    pbQuickDialog('上传笔记',`<p>导入文字笔记，或选择图片作为本地参考。图片暂不自动识别，请补充想规划的地点和要求。</p><label for="pb-note-file">选择笔记文件</label><input id="pb-note-file" type="file" accept=".txt,text/plain,image/*" onchange="pbReadNote(this)"><p id="pb-note-status" role="status"></p><img id="pb-note-preview" alt="已选笔记图片预览" hidden><label for="pb-note-text">笔记内容 / 规划要求</label><textarea id="pb-note-text" rows="5" maxlength="6000" placeholder="例如：想把这家咖啡店安排在第二天下午，别影响晚餐。"></textarea><button class="pb-note-send" type="button" onclick="pbSendNote('${key}')">带文字问东东</button><p class="pb-note-hint">文件仅在本地预览；提交时仅将文字带入原型对话，不会自动改动行程。</p>`);return;
  }
  const days=evStore[key].days;
  const route=days.map(d=>'DAY'+d.day+'：'+d.stops.map(s=>EV_META[s.meta]?.name||s.name||s.type).join('、')).join('；');
  go('dongdong');
  rvSay(action==='ideas'?`围绕这趟${city}${days.length}天行程，你想补充美食、亲子体验、拍照点，还是雨天备选？告诉我兴趣和空闲时段，先讨论建议，不改动现有安排。`:`已带上${city}当前路线：${route}。想优化哪一天？可以补充出行方式和必须保留的安排；先讨论顺路方案，确认前不更改行程。`);
}
async function pbReadNote(input){
  const file=input.files?.[0],dialog=input.closest('dialog'),status=dialog.querySelector('#pb-note-status'),preview=dialog.querySelector('#pb-note-preview');
  preview.hidden=true;preview.removeAttribute('src');if(!file)return;
  if(file.size>5*1024*1024){status.textContent='文件超过5MB，请选择较小的文件。';input.value='';return}
  if(file.type.startsWith('image/')){
    const url=URL.createObjectURL(file);preview.onload=preview.onerror=()=>URL.revokeObjectURL(url);preview.src=url;preview.hidden=false;status.textContent='已在本地选择图片，请在下方补充文字要求。';
  }else if(file.type==='text/plain'||/\.txt$/i.test(file.name)){
    try{const text=await file.text();if(!dialog.isConnected||input.files[0]!==file)return;dialog.querySelector('#pb-note-text').value=text.slice(0,6000);status.textContent=text.length>6000?'已读取前6000字，请检查后提交。':'文字已读取，可编辑后提交。'}catch{status.textContent='读取失败，请重新选择文件。'}
  }else{status.textContent='请选择TXT文字或图片文件。';input.value=''}
}
function pbSendNote(key){
  const dialog=document.getElementById('pb-quick-dialog'),input=dialog?.querySelector('#pb-note-text'),text=input?.value.trim();
  if(!text){dialog.querySelector('#pb-note-status').textContent='请先填写文字笔记或规划要求。';input.focus();return}
  dialog.close();go('dongdong');
  dialogue.push({role:'user',text:'这是我的'+(key==='sanya'?'三亚':'成都')+'行程参考笔记：\n'+text});
  rvSay('已收到你的文字笔记。你希望优先安排哪些地点、放在哪一天？先讨论可行性，不直接改动当前行程。');
}
function pbTripOverview(key){
  const days=evStore[key].days,city=key==='sanya'?'三亚':'成都';
  const first=days[0]?.date;
  const dates=first?first.replace(/\s/g,'')+'出发':'出发日期待定';
  const origin=key==='sanya'?'深圳':state.origin;
  const pace=key==='sanya'?'海岛慢游':state.pace==='轻松一点'?'宽松节奏':state.pace||'节奏待定';
  const people=key==='chengdu'&&!rvCurrent&&Number.isInteger(state.people)&&state.people>0?state.people+'人出行，':'';
  const template=document.createElement('template');template.innerHTML=evRouteOverview(key);
  const reason=template.content.querySelector('.ev-route-reason')?.textContent.replace(/^推荐理由/,'')||'按兴趣安排活动，留出休息与自由探索的时间。';
  const note=people+reason+(key==='sanya'?' 海上活动留意天气与预约要求。':' 交通与住宿以最终确认的方案为准。');
  return `<section class="pb-trip-overview" aria-labelledby="pb-trip-title"><h1 id="pb-trip-title">${city}${days.length}日${key==='sanya'?'海岛假期':'慢旅行'}</h1><div class="pb-trip-idea"><h2>出行思路</h2><button type="button" onclick="pbEditTripIdea()" aria-label="修改出发日期">修改</button></div><div class="pb-trip-tags"><span>${days.length}天</span><span>${esc(origin?origin+'出发':'出发地待定')}</span><span>${esc(pace)}</span><span class="pb-trip-date ${first?'':'is-pending'}">${esc(dates)}</span></div><p class="pb-trip-description">${esc(note)}</p></section>`;
}
let pbCalendar=null;
function pbISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function pbParseDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
  const d=new Date(value+'T12:00:00');return Number.isFinite(d.getTime())&&pbISO(d)===value?d:null;
}
function pbStartDate(key){
  const first=evStore[key].days[0];
  if(pbParseDate(first?.isoDate))return first.isoDate;
  const parts=first?.date?.match(/(\d+)\s*月\s*(\d+)\s*日/),year=pbParseDate(state.start)?.getFullYear()||new Date().getFullYear();
  const value=parts?year+'-'+parts[1].padStart(2,'0')+'-'+parts[2].padStart(2,'0'):state.start;
  return pbParseDate(value)?value:pbISO(new Date());
}
function pbEditTripIdea(){
  const key=evKey(),selected=pbStartDate(key);
  pbCalendar={key,selected,month:selected.slice(0,7)+'-01'};
  pbQuickDialog('修改出发日期',`<p>选择新的出发日期，${evStore[key].days.length}天行程将整体顺延，地点与顺序不变。</p><div id="pb-calendar"></div><p class="pb-calendar-hint">仅调整行程日期；机票、酒店需按新日期另行确认，不会自动改签或重新核价。</p><p id="pb-date-error" role="alert"></p><div class="pb-date-actions"><button type="button" onclick="document.getElementById('pb-quick-dialog').close()">取消</button><button type="button" class="pb-note-send" onclick="pbSaveDate()">确认修改</button></div>`);
  const dialog=document.getElementById('pb-quick-dialog');
  dialog.classList.add('pb-date-dialog');
  dialog.addEventListener('close',()=>{pbCalendar=null;document.querySelector('.pb-trip-idea button')?.focus({preventScroll:true})});
  pbDrawCalendar();
}
function pbDrawCalendar(){
  const c=pbCalendar,month=pbParseDate(c.month),year=month.getFullYear(),m=month.getMonth();
  const count=new Date(year,m+1,0).getDate(),offset=(month.getDay()+6)%7;
  document.getElementById('pb-calendar').innerHTML=`<div class="pb-calendar-head"><button type="button" aria-label="上个月" onclick="pbCalendarMonth(-1)">‹</button><strong aria-live="polite">${year}年${m+1}月</strong><button type="button" aria-label="下个月" onclick="pbCalendarMonth(1)">›</button></div><div class="pb-calendar-week">${['一','二','三','四','五','六','日'].map(w=>`<span>${w}</span>`).join('')}</div><div class="pb-calendar-days">${'<span></span>'.repeat(offset)}${Array.from({length:count},(_,i)=>{const value=pbISO(new Date(year,m,i+1));return `<button type="button" data-date="${value}" aria-label="${year}年${m+1}月${i+1}日" aria-pressed="${value===c.selected}" onclick="pbSelectDate('${value}')">${i+1}</button>`}).join('')}</div><p class="pb-date-selected" aria-live="polite">出发日期：${c.selected.replace(/-/g,' / ')}</p>`;
}
function pbCalendarMonth(delta){
  const d=pbParseDate(pbCalendar.month);d.setMonth(d.getMonth()+delta);
  if(d.getFullYear()<1000||d.getFullYear()>9998)return;
  pbCalendar.month=pbISO(d);pbDrawCalendar();
  document.querySelector(`[aria-label="${delta<0?'上':'下'}个月"]`)?.focus();
}
function pbSelectDate(value){
  if(!pbParseDate(value))return;
  pbCalendar.selected=value;pbDrawCalendar();document.querySelector(`[data-date="${value}"]`)?.focus();
}
function pbSaveDate(){
  const c=pbCalendar;if(!c||c.key!==evKey())return;
  const start=pbParseDate(c.selected),dialog=document.getElementById('pb-quick-dialog');
  if(!start){document.getElementById('pb-date-error').textContent='请选择有效日期。';return}
  if(c.selected===pbStartDate(c.key)){dialog.close();return}
  const key=c.key,m=evStore[key],days=evClone(m.days),savedAt=new Date().toISOString();
  days.forEach((day,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);day.date=(d.getMonth()+1)+' 月 '+d.getDate()+' 日';day.isoDate=pbISO(d)});
  try{localStorage.setItem('jinglv-editor-v3-'+key,rvEditorPayload(key,days,savedAt))}catch{document.getElementById('pb-date-error').textContent='保存失败，原日期未改变，请重试。';return}
  const context=pbCapture(),overviewScroll=document.querySelector('.pb-trip-overview')?.scrollTop||0;
  m.days=days;m.saved=evClone(days);m.savedAt=savedAt;
  if(key==='chengdu'&&rvCurrent)rvCurrent.days=evClone(days);
  evError='';dialog.close();render();
  pbOldSnap(context.snap);
  const sc=document.querySelector('.ev-sheet-scroll'),tabs=document.querySelector('.ev-tabs'),svg=document.querySelector('.ev-base .ev-map>svg');
  if(sc)sc.scrollTop=context.scroll;if(tabs)tabs.scrollLeft=context.tabs;
  const overview=document.querySelector('.pb-trip-overview');if(overview)overview.scrollTop=overviewScroll;
  if(svg&&context.view){svg.setAttribute('viewBox',context.view);pbUI.mapLock={key,view:context.view}}
  document.querySelector('.pb-trip-idea button')?.focus({preventScroll:true});
  toast('出发日期已更新，机票酒店需按新日期另行确认');
}
function pbInstall(){
  const sheet=document.querySelector('.ev-sheet'),tabs=sheet?.querySelector('.ev-tabs');if(!sheet||!tabs)return;
  const key=evKey();
  pbInstallQuickTools();
  sheet.querySelectorAll('.ev-sheet-context').forEach(node=>node.remove());
  tabs.querySelectorAll('.ev-booking-tab').forEach(node=>node.remove());
  sheet.querySelector('.pb-trip-overview')?.remove();
  (sheet.querySelector('.pb-nav')||tabs).insertAdjacentHTML('beforebegin',pbTripOverview(key));
  if(!sheet.querySelector('.pb-nav')){
    const nav=document.createElement('div');nav.className='pb-nav';tabs.before(nav);nav.append(tabs);
    const pin=document.createElement('div');pin.className='pb-pin';pin.innerHTML='<button id="pb-entry" class="pb-entry" role="tab" aria-controls="pb-panel" aria-selected="false" onclick="pbOpen()">预订清单</button>';nav.append(pin);
    tabs.querySelectorAll('[data-ev-day]').forEach(b=>{b.querySelector('strong').textContent='DAY'+b.dataset.evDay});
    tabs.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){tabs.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
  }
  const entry=sheet.querySelector('#pb-entry');
  entry.querySelector('.pb-dot')?.remove();
  if(key==='chengdu'&&pbPending())entry.insertAdjacentHTML('beforeend','<span class="pb-dot">待确认</span>');
  if(pbUI.open&&pbUI.key===key){pbUI.fragment=null;pbSwapIn()}else{pbUI.open=false;pbUI.fragment=null}
}
function pbOpen(){
  if(pbUI.open)return;
  pbUI.key=evKey();pbUI.position=pbCapture();pbUI.open=true;pbUI.expanded=null;pbUI.review=null;pbUI.order=null;pbUI.error='';pbSwapIn();
}
function pbSwapIn(){
  const sc=document.querySelector('.ev-sheet-scroll');if(!sc)return;
  pbUI.fragment=document.createDocumentFragment();while(sc.firstChild)pbUI.fragment.append(sc.firstChild);
  document.querySelectorAll('.ev-tabs [role="tab"]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false')});
  document.getElementById('pb-entry')?.setAttribute('aria-selected','true');pbPaint();sc.scrollTop=0;
}
function pbPaint(){
  if(!pbUI.open||!['plan','sanya-detail'].includes(screen))return;
  const sc=document.querySelector('.ev-sheet-scroll');if(!sc)return;
  const top=sc.scrollTop,rows=[...sc.querySelectorAll('.pb-cards')].map(e=>e.scrollLeft);
  sc.innerHTML=pbMarkup();sc.scrollTop=top;sc.querySelectorAll('.pb-cards').forEach((e,i)=>e.scrollLeft=rows[i]||0);
}
function pbBack(day=null){
  const p=pbUI.position,key=pbUI.key,sc=document.querySelector('.ev-sheet-scroll');pbUI.open=false;pbUI.order=null;pbUI.review=null;pbUI.expanded=null;pbUI.error='';
  if(day!==null){pbUI.mapLock=null;pbUI.fragment=null;evDay(day);return}
  if(sc&&pbUI.fragment){sc.replaceChildren(pbUI.fragment);pbUI.fragment=null;sc.scrollTop=p?.scroll||0}
  const tabs=document.querySelector('.ev-tabs');if(tabs){tabs.scrollLeft=p?.tabs||0;tabs.querySelectorAll('[role="tab"]').forEach(b=>{const active=b.id==='ev-tab-'+(p?.day===0?'ov':p?.day);b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))})}
  document.getElementById('pb-entry')?.setAttribute('aria-selected','false');
  if(p?.snap)pbOldSnap(p.snap);
  const svg=document.querySelector('.ev-base .ev-map>svg');if(svg&&p?.view){svg.innerHTML=p.map;svg.setAttribute('viewBox',p.view);pbUI.mapLock={key,view:p.view}}
  document.getElementById('pb-entry')?.focus({preventScroll:true});
}
function pbVisit(kind){const m=pbModel(),s=m.confirmed||m.draft;if(!s)return;const date=kind==='out'?s.booking.outDate:s.booking.backDate;const d=evStore[pbUI.key].days.find(d=>d.date.replace(/\s/g,'')===date.replace(/\s/g,''));if(d)pbBack(d.day);else{pbUI.error='当前行程中没有这一天，请先确认配套规划。';pbPaint()}}
function pbHotelMap(){
  const s=pbModel().confirmed||pbModel().draft;if(!s)return;
  const pos=[{x:136,y:100},{x:285,y:174},{x:180,y:150}][s.booking.selection.hotel];
  const svg=document.querySelector('.ev-base .ev-map>svg');if(!svg)return;
  svg.querySelector('#pb-hotel-marker')?.remove();svg.insertAdjacentHTML('beforeend',`<g id="pb-hotel-marker"><circle cx="${pos.x}" cy="${pos.y}" r="15" fill="#345f9d" stroke="white" stroke-width="3"/><text x="${pos.x}" y="${pos.y+5}" text-anchor="middle" fill="white" font-size="12">住</text><text x="${pos.x}" y="${pos.y-22}" text-anchor="middle" class="pb-map-label">酒店所在商圈 · 示意位置</text></g>`);
  evSetSnap('half');svg.setAttribute('viewBox',`${pos.x-150} ${pos.y-80} 300 600`);pbUI.mapLock={key:pbUI.key,view:svg.getAttribute('viewBox')};toast('已标出酒店所在商圈，非实际酒店坐标');
}
const pbOldRender=render;
render=function(){if(pbUI.open&&document.querySelector('.pb-content')){const p=pbUI.position;if(p)p.tabs=document.querySelector('.ev-tabs')?.scrollLeft||0}pbOldRender.apply(this,arguments);pbInstall()};
const pbOldDay=evDay;
evDay=function(day){pbUI.open=false;pbUI.fragment=null;pbUI.mapLock=null;pbOldDay(day);document.getElementById('ev-tab-'+(day===0?'ov':day))?.scrollIntoView({block:'nearest',inline:'nearest'})};
const pbOldFit=evMapFit;
evMapFit=function(){if(pbUI.mapLock&&pbUI.mapLock.key===evKey()&&['plan','sanya-detail'].includes(screen)){document.querySelector('.ev-base .ev-map>svg')?.setAttribute('viewBox',pbUI.mapLock.view);return}if(pbUI.open&&pbUI.position?.view){document.querySelector('.ev-base .ev-map>svg')?.setAttribute('viewBox',pbUI.position.view);return}pbOldFit()};
const pbOldSnap=evSetSnap;
evSetSnap=function(s){pbUI.mapLock=null;pbOldSnap(s)};
const pbOldGo=go;
go=function(s){pbUI.open=false;pbUI.fragment=null;pbUI.mapLock=null;pbOldGo(s)};
function pbMarkup(){
  const m=pbModel(),confirmed=!!m.confirmed,s=m.draft||m.confirmed;
  let h='<section id="pb-panel" class="pb-content" role="tabpanel" aria-labelledby="pb-entry"><div class="pb-top"><button class="text" onclick="pbBack()">‹ 返回行程</button><span class="pb-status">'+(confirmed?(m.draft?'更换待确认 · 原组合保留':'已确认 · 未预订'):s?'推荐待确认':'尚未搭配机酒')+'</span></div><div class="pb-top"><h2>预订清单</h2></div>';
  if(pbUI.key==='chengdu'&&pbPending())h+='<div class="pb-notice">有待确认的新方案。当前清单与行程不变。<button class="text" onclick="pbToDong()">去东东继续确认 →</button></div>';
  if(pbUI.order)return h+pbOrderMarkup()+'</section>';
  if(!s)return h+'<div class="pb-empty"><h3>让机酒配合这趟行程</h3><p>带上当前路线和已知出行条件，让东东搭配合适的机票与酒店。只补充缺少的信息。</p><button class="primary" onclick="pbToDong()">搭配机票酒店</button></div></section>';
  h+='<p class="pb-note">'+(confirmed?'当前组合尚未预订。':'选择后可继续确认整组机酒。')+'</p>';
  h+=Object.keys(pbKinds).map(kind=>pbGroup(kind,s,confirmed)).join('');
  const b=s.booking,total=bookingTotal(b);
  h+=`<div class="pb-summary booking-submit" aria-live="polite"><p class="booking-estimate">预计总价（机酒）¥${total.toLocaleString()}</p><div class="booking-submit-actions"><button class="booking-submit-adjust" type="button" onclick="pbToDong()">调整</button><button class="primary booking-submit-authorize" type="button" onclick="pbOneClickOrder()"><span>预算¥${total.toLocaleString()}</span><strong>授权下定</strong></button></div></div>`;
  if(pbUI.review)h+=pbReviewMarkup();
  if(pbUI.error)h+=`<p class="pb-error" role="alert">${esc(pbUI.error)}</p>`;

  if(m.draft&&confirmed)h+='<button class="text gap" onclick="pbCancelChange()">取消更换，保留当前组合</button>';
  h+='<div class="pb-actions"><button class="text" onclick="pbToDong()">调整出行要求 →</button></div></section>';return h;
}
function pbOneClickOrder(){toast('已进入机酒订单确认')}
function pbGroup(kind,s,confirmed){
  const b=s.booking,all=!confirmed||pbUI.expanded===kind,indices=all?[0,1,2]:[b.selection[kind]];
  return `<section class="pb-group"><div class="pb-group-head"><h3>${pbKinds[kind]}</h3>${confirmed?`<button class="text" onclick="pbExpand('${kind}')">${all?'收起':'更换'}</button>`:'<span class="pb-note">3 个方案 · 左右滑动</span>'}</div><div class="pb-cards ${all?'':'pb-single'}">${indices.map(i=>pbCard(kind,i,s,all,confirmed)).join('')}</div></section>`;
}
function pbCard(kind,i,s,all,confirmed){
  const b=s.booking,selected=b.selection[kind]===i,hotel=kind==='hotel',f=familyFlights[i],h=familyHotels[i],out=kind==='out';
  const times=selected?b[kind]:out?(b.nights===4?b.out:f.out):f.back;
  const ports=selected?b[out?'outPorts':'backPorts']:out?f.ports:[...f.ports].reverse();
  const price=hotel?(selected?b.hotelPrice:Math.round(h.price*b.nights/3)):out?f.op+(b.outExtra||0)/2:f.bp;
  let body=hotel?familyHotelProduct(h,selected?b.hotel:h.name,selected?b.room:h.room,price,selected,b.outDate,b.backDate,b.nights,b.tagContext||{}):familyFlightProduct(kind,f,times,ports,price,selected,out?b.outDate:b.backDate,b.tagContext||{});
  if(all)body+=`<button class="${selected?'secondary':'text'}" aria-pressed="${selected}" onclick="pbChoose('${kind}',${i})">${selected?'已选择':'选择'}</button>`;
  if(confirmed&&!all&&!pbModel().draft)body+=`<div class="pb-actions"><button class="primary" onclick="pbStartOrder('${kind}')">预订${hotel?'酒店':out?'去程':'返程'}</button><button class="text" onclick="${hotel?'pbHotelMap()':`pbVisit('${kind}')`}">${hotel?'地图看位置':out?'查看抵达当天':'查看返程当天'}</button></div>`;
  return `<article class="pb-card ${hotel?'hotel-offer ':''}${selected?'pb-selected selected':''}">${body}</article>`;
}

function pbExpand(kind){pbUI.expanded=pbUI.expanded===kind?null:kind;pbUI.review=null;pbPaint()}
function pbChoose(kind,i){
  if(!pbKinds[kind]||!Number.isInteger(i)||i<0||i>2)return;
  const m=pbModel(),old=m.draft,s=evClone(m.draft||m.confirmed),b=s.booking;
  b.selection[kind]=i;
  if(kind==='hotel'){b.hotel=familyHotels[i].name;b.room=familyHotels[i].room;b.hotelPrice=Math.round(familyHotels[i].price*b.nights/3)}
  else{const f=familyFlights[i];b[kind]=evClone(kind==='out'&&b.nights===4?b.out:f[kind]);b[kind==='out'?'outPorts':'backPorts']=kind==='out'?evClone(f.ports):[...f.ports].reverse()}
  b.adultPrice=2*(familyFlights[b.selection.out].op+familyFlights[b.selection.back].bp)+(b.outExtra||0);b.delta=0;m.draft=s;
  if(!pbPersist())m.draft=old;pbUI.review=null;pbPaint();
}
function pbCancelChange(){const m=pbModel(),old=m.draft;m.draft=null;if(!pbPersist())m.draft=old;pbUI.review=null;pbUI.expanded=null;pbPaint()}
function pbAnchored(s,source=evStore.chengdu.days){
  const days=evClone(source),b=s.booking;
  for(const d of days)d.stops=d.stops.filter(st=>!['pb-arrival','pb-departure','rv-arrival','rv-departure','cd-0-0','cd-3-1'].includes(st.uid));
  const find=date=>days.find(d=>d.date.replace(/\s/g,'')===date.replace(/\s/g,''));
  const first=find(b.outDate),last=find(b.backDate);if(!first||!last)throw Error('机票日期与行程不一致，需要重新生成完整规划');
  first.stops.unshift({uid:'pb-arrival',type:'flight',anchor:'arrival',time:b.out[1],title:'北京 → 成都 · '+b.outPorts[1]+'抵达',desc:'模拟航班；落地后预留60分钟',meta:null});
  last.stops.push({uid:'pb-departure',type:'flight',anchor:'departure',time:b.back[0],title:'成都 → 北京 · '+b.backPorts[0]+'出发',desc:'模拟航班；提前120分钟到机场',meta:null});return days;
}
function pbImpact(s){
  let days;try{days=pbAnchored(s)}catch(e){return {notes:[e.message],issues:[e.message],days:null}}
  const notes=[],issues=days.flatMap(d=>evSchedule(d).issues.map(x=>'DAY '+d.day+'：'+x));
  for(const d of days){const before=evSchedule(evStore.chengdu.days.find(x=>x.day===d.day));const after=evSchedule(d);if(after.rows.some(r=>{const old=before.rows.find(x=>x.st.uid===r.st.uid);return old&&old.start!==r.start}))notes.push('DAY '+d.day+' 的游玩时段会因航班缓冲而变化')}
  const current=pbModel().confirmed;if(!current||current.booking.selection.hotel!==s.booking.selection.hotel)notes.push('酒店商圈与接驳需重新核对，示意地图不能代替实际路程');
  return {days,notes,issues};
}
function pbReview(){const m=pbModel();if(!m.draft)return;pbUI.error='';pbUI.review={base:JSON.stringify(rvSnapshot()),impact:pbImpact(m.draft)};pbPaint()}
function pbReviewMarkup(){
  const m=pbModel(),b=m.draft.booking,old=m.confirmed?.booking,i=pbUI.review.impact,delta=old?b.adultPrice+b.hotelPrice-old.adultPrice-old.hotelPrice:null;
  return `<div class="pb-notice"><h3>确认前核对</h3><p>${delta===null?'首次搭配，没有已确认组合可对比':delta===0?'已知小计不变':(delta>0?'增加':'减少')+' ¥'+Math.abs(delta)}</p>${[...i.notes,...i.issues].map(x=>'<p>'+esc(x)+'</p>').join('')}${i.notes.length||i.issues.length?'<p>原行程暂不改动。可自行调整后再核对，或让东东生成配套候选，采用后才同步。</p><button class="primary" onclick="pbReplan()">交给东东重新规划</button><button class="text gap" onclick="pbBack()">我自己调整行程</button>':'<p>未发现游玩时段变化；确认后同步航班抵返节点，尚不下单。</p><button class="primary" onclick="pbCommit()">确认这组机酒</button>'}</div>`;
}
function pbApply(next,base){
  if(JSON.stringify(rvSnapshot())!==JSON.stringify(base)){pbUI.error='行程已有变化，请重新核对，旧候选未覆盖当前方案。';return false}
  if(!rvValid(next)){pbUI.error='方案校验未通过，尚未保存。';return false}
  const time=new Date().toISOString(),previous=evClone(base);
  try{localStorage.setItem(rvStorageKey,JSON.stringify({revision:1,days:next.days,booking:next.booking,previous,savedAt:time}))}catch{pbUI.error='浏览器保存失败，当前方案未改变，请重试。';return false}
  rvPrevious=previous;rvCurrent=evClone(next);familyBooking=evClone(next.booking.selection);
  Object.assign(evStore.chengdu,{days:evClone(next.days),saved:evClone(next.days),savedAt:time,history:[]});
  pbData.chengdu={confirmed:evClone(next),draft:null};state.stage='options';pbUI.error='';
  // The editor record above is authoritative; obsolete drafts are rejected on reload.
  pbPersist();return true;
}
function pbCommit(){
  const m=pbModel();if(!m.draft||!pbUI.review)return;
  if(JSON.stringify(rvSnapshot())!==pbUI.review.base){pbUI.error='行程已变化，请再次核对';pbUI.review=null;pbPaint();return}
  const i=pbImpact(m.draft);if(i.notes.length||i.issues.length){pbUI.review.impact=i;pbPaint();return}
  const next=evClone(m.draft);next.days=i.days;
  if(pbApply(next,JSON.parse(pbUI.review.base))){pbUI.review=null;pbUI.expanded=null;render()}else pbPaint();
}
function pbToDong(){
  const key=pbUI.key||evKey();pbUI.context={key,position:pbUI.position||pbCapture(),days:evClone(evStore[key].days),booking:evClone(pbModel(key).draft||pbModel(key).confirmed),people:state.people};
  go('dongdong');
  if(key!=='chengdu'){rvSay('已带上三亚行程。当前原型只有北京往返成都的模拟商品，不会套用到三亚，也不会显示虚构价格。',['返回预订清单']);return}
  if(pbPending()){rvSay('继续刚才的候选，正式行程与机酒尚未改变。',pbNextChoices());return}
  if(pbModel('chengdu').draft||pbModel('chengdu').confirmed){rvSay('已带上当前行程、所选机酒、日期与两大两小的示例条件。你想调整什么？未改动的条件继续沿用。',['我想早一天到成都','返回预订清单']);return}
  const days=evStore.chengdu.days;
  if(days.length!==4||days[0].date!=='10 月 1 日'||days.at(-1).date!=='10 月 4 日'){rvSay('当前日期不是10月1日至4日，原型暂不能匹配该日期的机酒。保留你的行程，不生成假推荐。',['返回预订清单']);return}
  rvSay('已带上成都10月1日至4日的路线。当前可体验北京出发、2位成人与2位儿童的模拟机酒；你的出发地和同行人数符合这个示例吗？',['按北京出发、2大2小体验模拟推荐','返回预订清单']);
}
function pbReturn(){
  const c=pbUI.context,key=c?.key||'chengdu';go(key==='sanya'?'sanya-detail':'plan');
  if(c?.position){evActive[key]=Math.min(c.position.day,evStore[key].days.length);render();pbOldSnap(c.position.snap);const sc=document.querySelector('.ev-sheet-scroll');if(sc)sc.scrollTop=c.position.scroll;const tabs=document.querySelector('.ev-tabs');if(tabs)tabs.scrollLeft=c.position.tabs;const svg=document.querySelector('.ev-base .ev-map>svg');if(svg&&c.position.view){svg.innerHTML=c.position.map;svg.setAttribute('viewBox',c.position.view)}}
  pbOpen();
}
function pbNextChoices(){return rvSession?.stage==='booking'?['确认这组候选机酒','先保留原方案']:rvSession?.stage==='booking-confirmed'?['生成完整候选规划','先保留原方案']:rvSession?.stage==='plan'?['采用这版方案','先保留原方案']:['返回预订清单']}
function pbReplan(){
  const m=pbModel();if(!m.draft||!pbUI.review)return;
  if(pbUI.review.base!==JSON.stringify(rvSnapshot())){pbUI.review=null;pbUI.error='行程已变化，请重新核对';pbPaint();return}
  if(pbPending()){pbUI.error='还有未结束的候选，请先去东东继续或取消，再发起新候选。';pbPaint();return}
  const base=rvSnapshot(),candidate=evClone(m.draft);candidate.days=null;
  pbUI.context={key:'chengdu',position:pbUI.position};rvFreeze();
  rvSession={id:++rvSerial,stage:'booking',sameDates:true,base,candidate};go('dongdong');
  rvReply('已带上待选机酒与原行程。请先确认候选机酒，再生成配套规划；采用整版前，原行程与已确认机酒不会改变。',['确认这组候选机酒','先保留原方案'],{session:rvSession.id,kind:'booking',snapshot:evClone(candidate)});rvPaint();
}
const pbOldPlan=rvPlan;
rvPlan=function(){
  if(rvSession?.stage!=='booking-confirmed')return;
  rvJob('plan',s=>{
    let source=evClone(s.base.days);
    if(!s.sameDates){source=source.map(d=>({...d,day:d.day+1}));source.unshift({day:1,date:s.candidate.booking.outDate,theme:'提前抵达 · 入住休息',stops:[{uid:'rv-rest',type:'rest',anchor:null,title:'酒店寄存行李 / 入住与自由活动',desc:'入住时间与房型需确认',meta:null}]})}
    let days=pbAnchored(s.candidate,source),moves=[];
    // Only candidate days are rearranged. Never remove attractions to hide conflicts.
    for(let pass=0;pass<30;pass++){
      const bad=days.find(d=>evSchedule(d).issues.length);if(!bad)break;
      const stop=[...bad.stops].reverse().find(x=>x.type==='spot');if(!stop)break;
      let target=null;
      for(const d of days){if(d===bad)continue;const trial=evClone(d),index=trial.stops.findIndex(x=>x.anchor==='departure');trial.stops.splice(index<0?trial.stops.length:index,0,stop);if(!evSchedule(trial).issues.length){target=d;break}}
      if(!target)break;
      bad.stops.splice(bad.stops.indexOf(stop),1);const index=target.stops.findIndex(x=>x.anchor==='departure');target.stops.splice(index<0?target.stops.length:index,0,stop);moves.push((EV_META[stop.meta]?.name||stop.title)+'：DAY '+bad.day+' → DAY '+target.day);
    }
    const issues=days.flatMap(d=>evSchedule(d).issues.map(x=>'DAY '+d.day+'：'+x));
    if(issues.length){s.stage='booking-confirmed';rvReply('这些景点暂时无法全部排入当前航班时间：'+issues.join('；')+'。没有删除景点或覆盖原方案。可保留原方案，自行调整后再试。',['返回预订清单','先保留原方案'],{session:s.id});return}
    s.candidate.days=days;s.candidate.booking.delta=0;if(!rvValid(s.candidate))throw Error('Invalid candidate');s.stage='plan';
    rvReply('完整候选规划已生成，抵达后留60分钟、返程提前120分钟。'+(moves.length?'为避开时间冲突，建议调整：'+moves.join('；')+'。':'保留全部景点及原有景点日期。')+'酒店接驳仍需按实际地址核实；这只是候选，采用后才同步机酒和行程。',['采用这版方案','先保留原方案'],{session:s.id,kind:'plan',snapshot:evClone(s.candidate)});
  });
};
rvAdopt=function(){
  const s=rvSession;if(!s||!['plan','save-failed'].includes(s.stage))return;
  if(!pbApply(s.candidate,s.base)){s.stage=pbUI.error.includes('已有变化')?'stale':'save-failed';rvSay(pbUI.error,s.stage==='stale'?['返回预订清单']:['重试采用','先保留原方案']);return}
  s.stage='adopted';evActive.chengdu=0;pbUI.context=null;
  rvReply('已采用这版：'+s.candidate.booking.outDate+'抵达，'+s.candidate.booking.backDate+'返程，'+s.candidate.days.length+'天'+s.candidate.booking.nights+'晚。行程与机酒已一起保存。未下单、未扣款。',['查看更新后的行程','查看上一版'],{kind:'adopted',snapshot:evClone(s.candidate)});rvPaint();
};
const pbOldReply=rvBookingReply;
rvBookingReply=function(s){pbOldReply(s);const m=dialogue.at(-1);m.choices=['确认这组候选机酒','去程想再早一点','先保留原方案'];m.followup='先确认候选机酒，再单独生成完整规划；采用整版后才更新当前行程。'};
const pbOldRvChoose=rvChoose;
rvChoose=function(kind,index,id,messageIndex){
  if(!rvSession?.sameDates){pbOldRvChoose(kind,index,id,messageIndex);return}
  const s=rvSession,m=dialogue[messageIndex];
  if(aiBusy||s.id!==id||s.stage!=='booking'||m?.session!==id||messageIndex!==dialogue.findLastIndex(x=>x.kind==='booking'&&x.session===id)||!pbKinds[kind]||!Number.isInteger(index)||index<0||index>2)return;
  const b=s.candidate.booking,f=familyFlights[index],h=familyHotels[index];b.selection[kind]=index;
  if(kind==='hotel'){b.hotel=h.name;b.room=h.room;b.hotelPrice=Math.round(h.price*b.nights/3)}else{b[kind]=evClone(kind==='out'&&b.nights===4?b.out:f[kind]);b[kind==='out'?'outPorts':'backPorts']=kind==='out'?evClone(f.ports):[...f.ports].reverse()}
  b.adultPrice=2*(familyFlights[b.selection.out].op+familyFlights[b.selection.back].bp)+(b.outExtra||0);b.delta=b.adultPrice+b.hotelPrice-s.base.booking.adultPrice-s.base.booking.hotelPrice;m.snapshot=evClone(s.candidate);render();
};
const pbOldAsk=askDong;
askDong=function(text){
  const t=text.trim();if(!t||aiBusy)return;
  if(t==='返回预订清单'){pbReturn();return}
  if(t==='查看更新后的行程'){go('plan');return}
  if(t==='再推荐一组机酒'){
    dialogue.push({role:'user',text:t});familyBooking={out:(familyBooking.out+1)%3,back:(familyBooking.back+1)%3,hotel:(familyBooking.hotel+1)%3};
    const model=pbModel('chengdu');model.draft=pbBase(familyBooking);pbPersist();dialogue.push({role:'assistant',type:'family-booking',snapshot:evClone(model.draft)});render();return;
  }
  if(t==='按北京出发、2大2小体验模拟推荐'){
    dialogue.push({role:'user',text:t});const m=pbModel('chengdu');if(!m.confirmed&&!m.draft){m.draft=pbBase();pbPersist()}
    dialogue.push({role:'assistant',type:'family-booking',snapshot:evClone(m.draft||m.confirmed)});rvSay('这里保留三行九张推荐卡作为参考。到预订清单点选、比较和确认；推荐不等于已确认。',['返回预订清单']);return;
  }
  const s=rvSession;
  if(s&&pbPending()){
    if(/先保留|不改了|取消|暂不|不要调整/.test(t)){s.stage='cancelled';dialogue.push({role:'user',text:t});rvSay('已取消本次候选，当前机酒与行程保持不变。',['返回预订清单']);return}
    if(s.stage==='booking'&&/确认|按这组|这组.*(可以|行)|^(可以|好的|就这个|行|没有|没有了|没有其他要求)/.test(t)){
      dialogue.push({role:'user',text:t});s.stage='booking-confirmed';rvSay('已确认这组候选机酒，但还没有采用。下一步生成完整规划，供你看完后决定。',['生成完整候选规划','先保留原方案']);return;
    }
    if(s.stage==='booking-confirmed'&&/生成|规划|安排|^(可以|好的)$/.test(t)){dialogue.push({role:'user',text:t});rvPlan();return}
    if(s.stage==='booking-confirmed'&&/(更早|再早|早一点)/.test(t)&&!s.sameDates){s.early=true;rvMatch();return}
    if(['plan','save-failed'].includes(s.stage)&&/采用|就用这版|用新版|^(可以|好的|确认)$/.test(t)){dialogue.push({role:'user',text:t});rvAdopt();return}
    if(s.stage==='failed'&&/重试/.test(t)){if(s.retry==='plan'){s.stage='booking-confirmed';rvPlan()}else rvMatch();return}
  }
  if(pbUI.context&&!pbModel(pbUI.context.key).confirmed&&!pbModel(pbUI.context.key).draft&&!/(提前|早)(一|1)天/.test(t)){
    dialogue.push({role:'user',text:t});rvSay('已收到你的条件，但当前原型不能查询这组条件的真实商品。只支持明确选择北京往返成都、两大两小的示例，不会替换成不符合要求的推荐。',pbUI.context.key==='chengdu'?['按北京出发、2大2小体验模拟推荐','返回预订清单']:['返回预订清单']);return;
  }
  pbOldAsk(text);
};
const pbOldDong=views.dongdong;
views.dongdong=function(){dialogue.forEach(m=>{if(m.type==='family-booking'&&!m.snapshot)m.snapshot=evClone(pbModel('chengdu').draft||pbModel('chengdu').confirmed||pbBase())});return pbOldDong()};
const pbOldMessage=rvMessage;
rvMessage=function(m,i){if(m.kind==='history-booking')return '<section class="ai-recommend"><div class="ai-byline">✧ <strong>东东帮你搭配机酒</strong></div><p class="ai-overview">我按北京出发、10月1日至4日、2大2小的条件，优先挑了时间合适的直飞航班，以及靠近市区行程的酒店。每一项都可以单独更换，先看看这组搭配是否合适。</p>'+rvBookingCard(m.snapshot,'')+'<div class="natural-followup booking-followup"><p>这组机酒你觉得合适吗？如果想调整航班时间、酒店位置或房型，直接告诉我就好。</p></div><div class="ai-followups booking-followup-chips"><button type="button" onclick="askDong(\'我想早一天出发\')"><span>✧</span>想早一天出发</button><button type="button" onclick="askDong(\'再推荐一组机酒\')"><span>✧</span>再推荐一组机酒</button></div></section>';return pbOldMessage(m,i)};
function pbStartOrder(kind){
  const m=pbModel();if(!m.confirmed||m.draft){pbUI.error='请先完成更换确认，待选商品不能预订。';pbPaint();return}
  pbUI.order={kind,stage:'info',booking:evClone(m.confirmed.booking),values:{ageA:'',ageB:'',rooms:'1'}};pbUI.error='';pbPaint();document.querySelector('.ev-sheet-scroll').scrollTop=0;
}
function pbOrderMarkup(){
  const o=pbUI.order,b=o.booking,hotel=o.kind==='hotel',v=o.values;
  let h='<div class="pb-notice"><h3>'+pbKinds[o.kind]+' · 模拟预订</h3><p>'+esc(hotel?b.hotel+' · '+b.room+' · '+b.outDate+'至'+b.backDate:(o.kind==='out'?'北京 → 成都':'成都 → 北京')+' · '+b[o.kind+'Date']+' · '+b[o.kind].join('—'))+'</p></div>';
  if(o.stage==='info')h+=`<form class="pb-form" onsubmit="event.preventDefault();pbOrderNext(this)"><p class="pb-note">沿用示例2位成人、2位儿童。使用成人A/B、儿童A/B演示称呼，不收集真实姓名、证件或电话。只补充本次模拟缺少的信息。</p><label>儿童A年龄（0—17岁）<input name="ageA" type="number" min="0" max="17" step="1" value="${esc(v.ageA)}" required></label><label>儿童B年龄（0—17岁）<input name="ageB" type="number" min="0" max="17" step="1" value="${esc(v.ageB)}" required></label>${hotel?'<label>计划房间数<select name="rooms"><option value="1">1间（能否入住4人待核实）</option><option value="2">2间（需重新报价）</option></select></label>':''}<button class="primary gap" type="submit">查看价格、库存与退改说明</button></form>`;
  else if(o.stage==='rules')h+=`<div class="pb-notice"><h3>下单前核对（演示）</h3><p>儿童年龄：${v.ageA}岁、${v.ageB}岁。${hotel?'计划'+v.rooms+'间房。':''}</p><p>${hotel?'当前仅有1间 / '+b.nights+'晚参考价 ¥'+b.hotelPrice+'；选择2间不能直接按倍数认定报价，房型人数与早餐待核实。':'成人单程参考价 ¥'+(familyFlights[b.selection[o.kind]][o.kind==='out'?'op':'bp']+(o.kind==='out'?(b.outExtra||0)/2:0))+'；儿童票与婴儿票尚未报价。'}</p><p>未查询实时价格与库存；行李、退改、入住资格与其他规则均未获得真实确认。</p><p>此处不能支付，不生成订单，也不表示商品已锁定。</p><button class="primary" onclick="pbUI.order.stage='done';pbPaint()">完成本次模拟</button><button class="text gap" onclick="pbUI.order.stage='info';pbPaint()">返回补充信息</button></div>`;
  else h+='<div class="pb-empty"><h3>本次模拟已结束</h3><p>没有真实订单、没有支付或扣款，也没有锁定库存。其他商品需分别预订。</p></div>';
  return h+'<button class="text gap" onclick="pbUI.order=null;pbUI.error=\'\';pbPaint()">返回预订清单</button>'+(pbUI.error?'<p class="pb-error">'+esc(pbUI.error)+'</p>':'');
}
function pbOrderNext(form){
  if(!form.reportValidity())return;const values=Object.fromEntries(new FormData(form));
  if(!['ageA','ageB'].every(k=>values[k]!==''&&Number.isInteger(+values[k])&&+values[k]>=0&&+values[k]<=17)){pbUI.error='请填写0—17之间的整数年龄';pbPaint();return}
  pbUI.order.values={...values,rooms:values.rooms||'1'};pbUI.order.stage='rules';pbUI.error='';pbPaint();
}
render();
