'use strict';
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const zl=n=>(Math.round(n*100)/100).toLocaleString('pl-PL',{minimumFractionDigits:0,maximumFractionDigits:2})+' zł';
const num=v=>{if(v===''||v==null)return null;const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:null};
const uid=()=>Math.random().toString(36).slice(2,10);
const COLORS=['#A86D12','#4F5FB0','#23805F','#B4463A','#7A4FA8','#2B7FA6','#9A7A12','#B04F86','#5E7A2E','#6B6579'];
const TYPES={flakon:'Flakon',tester:'Tester',sospiro:'Sospiro'};
const GLABEL={D:'Damskie',M:'Męskie',U:'Unisex',Z:'Zestawy'};
const GONE={D:'Damskie',M:'Męskie',U:'Unisex',Z:'Zestaw'};
// Fragrantica ma w adresie numer perfum, więc idziemy przez "\" w DuckDuckGo = od razu pierwszy wynik z fragrantica.pl
const frag=q=>'https://duckduckgo.com/?q='+encodeURIComponent('\\ site:fragrantica.pl '+q.toLowerCase());
// Marki z więcej niż jednym słowem (reszta: marka = pierwsze słowo)
const BRANDS=['ACQUA DI PARMA','BOTTEGA VENETA','BY KILIAN','CALVIN KLEIN','CAROLINA HERRERA','CHRISTIAN DIOR','COSTUME NATIONAL','DOLCE & GABBANA','ESTEE LAUDER','GIORGIO ARMANI','HAUTE FRAGRANCE COMPANY','HUGO BOSS','ISSEY MIYAKE','ISSEAY MIYAKE','JEAN PAUL GAULTIER','JIMMY CHOO','JO MALONE LONDON','JO MALONE','LE LABO','LOUIS VUITTON','MAISON FRANCIS KURKDJIAN','MARC JACOBS','MATIERE PREMIERE','MICHAEL KORS','MIU MIU','MONT BLANC','NARCISO RODRIGUEZ','ORTO PARISI','PACO RABANNE','PARFUMS DE MARLY',"PENHALIGON'S",'PHILIPP PLEIN','ROBERTO CAVALLI','THIERRY MUGLER','THOMAS KOSMALA','TIZIANA TERENZI','TOM FORD','VICTORIA SECRET',"VICTORIA'S SECRET",'VIKTOR & ROLF','VIKTOR ROLF','YVES SAINT LAURENT','ZADIG & VOLTAIRE'].sort((a,b)=>b.length-a.length);
const BALIAS={'ISSEAY MIYAKE':'ISSEY MIYAKE','VIKTOR ROLF':'VIKTOR & ROLF','VICTORIA SECRET':"VICTORIA'S SECRET"};
const KEEP=new Set(['CK','DKNY','YSL','II','III','IV','VIP','NYC','XS']),LOW=new Set(['DE','DI','DU','DES','OF','AND']);
const tc=s=>s.split(' ').map((w,i)=>KEEP.has(w)||w.length===1?w:i&&LOW.has(w)?w.toLowerCase():w.toLowerCase().replace(/^([^\p{L}\d]*)((?:[ld]')?\p{L})/u,(m,a,b)=>a+b.toUpperCase())).join(' ');
// "CHRISTIAN DIOR SAUVAGE 100ML EDP PREMIUM" -> marka, model, pojemność, rodzaj, dopisek
function split(name){
  const u=name.toUpperCase().replace(/[’‘`]/g,"'").replace(/\s+/g,' ').trim();
  const br=BRANDS.find(b=>u===b||u.startsWith(b+' ')||(b.endsWith("'S")&&u.startsWith(b)))||u.split(' ')[0];
  const rest=u.slice(br.length).trim();let mo=rest,tail='';
  const vm=rest.match(/(\d+(?:[.,]\d+)?)\s*ML\b/),cm=rest.match(/(^|[^A-Z])(ED[PTC]|EXTRAIT|EAU DE (PARFUM|TOILETTE))/);
  if(vm){mo=rest.slice(0,vm.index);tail=rest.slice(vm.index+vm[0].length)}else if(cm){mo=rest.slice(0,cm.index);tail=rest.slice(cm.index)}
  const sq=tail.replace(/\(PUSZKA\)/g,'').replace(/[^A-Z]/g,'');
  const conc=/EXTRAIT/.test(sq)?'Extrait':/EAUDEPARFUM|EDP/.test(sq)?'EDP':/EAUDETOILETTE|EDT/.test(sq)?'EDT':/EDC/.test(sq)?'EDC':/PARFUM/.test(sq)?'Parfum':'';
  const ex=tail.replace(/\bED\s*(\(PUSZKA\))\s*T\b/,'$1').replace(/EAU DE (PARFUM|TOILETTE)|EXTRAIT( DE PARFUM)?|(^|[^A-Z])ED[PTC]/g,'$3 ').replace(/\(\s*/g,' (').replace(/\s+/g,' ').trim();
  mo=mo.replace(/(\s+ML)?[\s,(-]*$/,'').trim();const b=BALIAS[br]||br;
  return {br:tc(b),mo:tc(mo),vol:vm?vm[1].replace(',','.')+' ml':'',conc,ex:ex&&tc(ex),fq:(b+' '+mo).trim()};
}

/* ---------- state ---------- */
const blank=()=>({people:[],settings:{rates:{flakon:85,tester:70,sospiro:60},warehouse:'',delivery:'Za pobraniem InPost Paczkomat',locker:'',name:'',phone:'',email:'',street:'',city:'',wf:'',wt:'',ws:''}});
let S=blank();
let C={warehouse:DEFAULT_CATALOG.warehouse,items:DEFAULT_CATALOG.items,updatedAt:null};
let CAT=[],CATMAP=new Map();
const ui={sel:null,q:'',b:'all',g:'all',t:'all',limit:120,tab:'cat'};

function expand(row){const [raw,g,t,p]=row;const sm=raw.toUpperCase().match(/\+\s*(\d+)\s*Z[ŁL]/);
  const name=raw.replace(/\+\s*\d+\s*z[łl]/i,' ').replace(/\s+/g,' ').trim();
  const it={id:(t?'T:':'F:')+name.toUpperCase(),raw,name,g,t:!!t,p:!!p,s:sm?+sm[1]:0};
  it.k=it.t?'tester':it.p?'sospiro':'flakon';Object.assign(it,split(name));it.key=(it.name+' '+it.fq).toUpperCase().replace(/[’‘`]/g,"'");return it;}
function buildCat(){CAT=C.items.map(expand);CATMAP=new Map(CAT.map(i=>[i.id,i]));}

const person=id=>S.people.find(p=>p.id===id);
const unit=(p,l)=>l.o!=null?l.o:(num(p.r[l.k])||0)+l.s;
const pQty=p=>p.items.reduce((a,l)=>a+l.q,0);
const pTot=p=>p.items.reduce((a,l)=>a+unit(p,l)*l.q,0);

/* ---------- persistence (localStorage, tylko ten komputer) ---------- */
const LS='perfumy-zamowienia-v1',LSC='perfumy-katalog-v1',LST='perfumy-zakladka';
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast('Nie udało się zapisać danych')}}
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>lsSet(LS,S),250)}
window.addEventListener('beforeunload',()=>lsSet(LS,S));
function saveCatalog(){lsSet(LSC,C)}
function normalizeState(d){const b=blank();const s=Object.assign(b,d||{});s.settings=Object.assign(blank().settings,(d&&d.settings)||{});s.settings.rates=Object.assign(blank().settings.rates,s.settings.rates||{});s.people=(s.people||[]).map(p=>({id:p.id||uid(),name:p.name||'Bez imienia',paid:!!p.paid,c:p.c||0,r:Object.assign({},s.settings.rates,p.r||{}),items:(p.items||[]).map(l=>({id:l.id,n:l.n,raw:l.raw||l.n,k:l.k||'flakon',s:+l.s||0,q:Math.max(1,+l.q||1),o:l.o==null?null:+l.o}))}));return s}

/* ---------- actions ---------- */
function addPerson(name){const p={id:uid(),name,paid:false,c:S.people.reduce((m,x)=>Math.max(m,(x.c||0)+1),0),r:Object.assign({},S.settings.rates),items:[]};S.people.push(p);ui.sel=p.id;save();renderAll();}
function addItem(it){const p=person(ui.sel);if(!p)return;const l=p.items.find(x=>x.id===it.id);if(l)l.q++;else p.items.push({id:it.id,n:it.name,raw:it.raw,k:it.k,s:it.s,q:1,o:null});save();renderAll();}
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3200)}

/* ---------- render ---------- */
function renderTally(){
  const tot=S.people.reduce((a,p)=>a+pTot(p),0),qty=S.people.reduce((a,p)=>a+pQty(p),0);
  const paid=S.people.filter(p=>p.paid).reduce((a,p)=>a+pTot(p),0);
  const withSum=S.people.filter(p=>pTot(p)>0);
  $('#tally').innerHTML=`<div class="tally-nums">
    <div class="big">${esc(zl(tot).replace(' zł',''))}<small>zł razem</small></div>
    <div class="stat"><b>${qty}</b>szt. w zamówieniu</div>
    <div class="stat paid"><b>${zl(paid)}</b>zapłacone</div>
    <div class="stat unpaid"><b>${zl(tot-paid)}</b>do odebrania</div></div>
    ${withSum.length?`<div class="bar" role="img" aria-label="Udział osób w kwocie">${withSum.map(p=>`<span class="${p.paid?'':'unp'}" style="flex-grow:${pTot(p)};background-color:${COLORS[p.c%COLORS.length]}" title="${esc(p.name)}: ${zl(pTot(p))}${p.paid?' (zapłacone)':''}"></span>`).join('')}</div>
    <div class="legend">${withSum.map(p=>`<span><i style="background:${COLORS[p.c%COLORS.length]}"></i>${esc(p.name)} ${zl(pTot(p))}</span>`).join('')}<span>paski w kreskę = jeszcze nie zapłacili</span></div>`:''}`;
}
function renderPeople(){
  $('#pcount').textContent=S.people.length?S.people.length+(S.people.length===1?' osoba':S.people.length<5?' osoby':' osób'):'';
  $('#people').innerHTML=S.people.length?S.people.map(p=>`<li class="person${p.id===ui.sel?' sel':''}" data-id="${p.id}" tabindex="0">
    <span class="dot" style="background:${COLORS[p.c%COLORS.length]}"></span>
    <span class="nm">${esc(p.name)}</span><span class="sum">${zl(pTot(p))}</span>
    <span class="meta">${pQty(p)} szt.</span>
    <span style="text-align:right"><button class="pill ${p.paid?'paid':'unpaid'}" data-paid="${p.id}" title="Zmień status płatności">${p.paid?'zapłacone':'niezapłacone'}</button></span></li>`).join('')
    :`<li class="empty" style="padding:18px 10px"><strong>Brak osób</strong>Dodaj pierwszą osobę poniżej.</li>`;
}
function rateInputs(rates,attr){return Object.keys(TYPES).map(k=>`<div class="rate"><label for="${attr}-${k}">${TYPES[k]}</label><div class="money"><input class="in" id="${attr}-${k}" ${attr}="${k}" inputmode="decimal" value="${rates[k]??''}"></div></div>`).join('')}
function renderDefaults(){$('#defRates').innerHTML=rateInputs(S.settings.rates,'data-def');}
function renderPerson(){
  const el=$('#personPanel');const p=person(ui.sel);
  if(!p){el.innerHTML=`<div class="empty" style="padding:70px 24px"><strong>${S.people.length?'Wybierz osobę z listy':'Zacznij od dodania osoby'}</strong>Potem w zakładce Lista perfum klikaj perfumy, żeby dodać je do jej zamówienia.</div>`;return}
  const missing=l=>!CATMAP.has(l.id);
  el.innerHTML=`<div class="ph">
      <input class="pname" id="pname" value="${esc(p.name)}" aria-label="Imię">
      <button class="paidbtn${p.paid?' on':''}" id="ppaid"><span class="box"></span>${p.paid?'Zapłacił(a)':'Nie zapłacił(a)'}</button>
      <button class="btn" data-tab="cat">Dodaj perfumy</button>
      <button class="btn ghost danger" id="pdel">Usuń osobę</button></div>
    <div class="prates">${rateInputs(p.r,'data-rate')}</div>
    ${p.items.length?`<div class="lines-wrap"><table class="lines"><thead><tr><th>Perfumy</th><th>Ilość</th><th class="r">Cena za szt.</th><th class="r">Razem</th><th><span class="sr">Usuń</span></th></tr></thead><tbody>
    ${p.items.map((l,i)=>`<tr data-i="${i}"><td><div class="lname">${esc(l.n)}</div><div class="badges">${l.k!=='flakon'?`<span class="b ${l.k==='tester'?'t':'p'}">${TYPES[l.k]}</span>`:''}${l.s?`<span class="b s">+${l.s} zł dopłaty</span>`:''}${missing(l)?'<span class="b x">brak w nowym katalogu</span>':''}</div></td>
      <td><div class="qty"><button data-dq="-1" aria-label="Mniej">−</button><span>${l.q}</span><button data-dq="1" aria-label="Więcej">+</button></div></td>
      <td><div class="pricecell">${l.o!=null?`<button class="reset" data-reset title="Wróć do stawki osoby">auto</button>`:''}<div class="money pricein${l.o!=null?' ov':''}"><input class="in" data-ov inputmode="decimal" value="${unit(p,l)}" aria-label="Cena za sztukę" title="${l.o!=null?'Cena ręczna':'Stawka '+TYPES[l.k].toLowerCase()+(l.s?' + dopłata '+l.s+' zł':'')}"></div></div></td>
      <td class="r" data-ls>${zl(unit(p,l)*l.q)}</td>
      <td class="r"><button class="x" data-rm aria-label="Usuń pozycję">×</button></td></tr>`).join('')}
    </tbody></table></div>`:`<div class="empty" style="border-top:1px solid var(--line)"><strong>${esc(p.name)} nie ma jeszcze perfum</strong>Kliknij „Dodaj perfumy”, żeby wybrać je z listy.</div>`}
    <div class="pfoot"><span class="hint">${pQty(p)} szt. Zmiana stawki przelicza wszystkie pozycje bez ręcznej ceny.</span><span class="tot" id="ptot">${zl(pTot(p))}</span></div>`;
}
function hl(name,q){if(!q)return esc(name);let out=esc(name);q.split(/\s+/).filter(Boolean).forEach(w=>{const re=new RegExp('('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');out=out.replace(re,'<mark>$1</mark>')});return out}
function renderCatalog(){
  const q=ui.q.trim().toUpperCase().replace(/[’‘`]/g,"'");const words=q.split(/\s+/).filter(Boolean);
  const list=CAT.filter(i=>(ui.b==='all'||i.br===ui.b)&&(ui.g==='all'||i.g===ui.g)&&(ui.t==='all'||(ui.t==='T'?i.t:ui.t==='P'?i.p:!i.t))&&words.every(w=>i.key.includes(w)));
  const p=person(ui.sel);const inCart=new Map(p?p.items.map(l=>[l.id,l.q]):[]);
  $('#catInfo').textContent=`${list.length} z ${CAT.length}`;const hq=ui.q.trim();
  $('#clist').innerHTML=(list.length?`<li class="chead" aria-hidden="true"><span>Marka</span><span>Model</span><span>Płeć</span><span>Rodzaj</span><span>Pojemność</span><span></span><span class="r">Cena</span><span></span></li>`:'')
    +list.slice(0,ui.limit).map(i=>{const href=frag(i.fq);return `<li class="ci">
    <a class="cb" href="${esc(href)}" target="_blank" rel="noopener" tabindex="-1">${hl(i.br,hq)}</a>
    <a class="cm" href="${esc(href)}" target="_blank" rel="noopener" title="Otwórz na Fragrantica">${i.mo?hl(i.mo,hq):'—'}<span class="ext" aria-hidden="true">↗</span></a>
    <span class="cg">${GONE[i.g]||''}</span><span class="cc">${i.conc}</span><span class="cv">${i.vol}</span>
    <div class="badges">${i.t?'<span class="b t">Tester</span>':''}${i.p?'<span class="b p">Sospiro promo</span>':''}${i.s?`<span class="b s">+${i.s} zł</span>`:''}${i.ex?`<span class="b e">${esc(i.ex)}</span>`:''}</div>
    <span class="cpr">${p?zl((num(p.r[i.k])||0)+i.s):''}</span>
    <button class="addbtn${inCart.has(i.id)?' in-cart':''}" data-add="${esc(i.id)}" ${p?'':'disabled title="Najpierw wybierz osobę"'}>${inCart.has(i.id)?'+1 (×'+inCart.get(i.id)+')':'Dodaj'}</button></li>`}).join('')
    +(list.length>ui.limit?`<li><button class="btn more" id="more">Pokaż więcej (${list.length-ui.limit})</button></li>`:'')
    +(!list.length?`<li class="empty"><strong>Nic nie pasuje</strong>Zmień wyszukiwanie lub filtr.</li>`:'');
}
function renderFilters(){
  const g=[['all','Wszystkie'],['D','Damskie'],['M','Męskie'],['U','Unisex'],['Z','Zestawy']];
  const t=[['all','Flakony i testery'],['F','Tylko flakony'],['T','Tylko testery'],['P','Sospiro promo']];
  const bc=new Map();CAT.forEach(i=>bc.set(i.br,(bc.get(i.br)||0)+1));if(!bc.has(ui.b))ui.b='all';
  $('#bf').innerHTML=`<option value="all">Wszystkie marki</option>`+[...bc].sort((a,b)=>a[0].localeCompare(b[0],'pl')).map(([b,n])=>`<option value="${esc(b)}"${ui.b===b?' selected':''}>${esc(b)} (${n})</option>`).join('');
  $('#gf').innerHTML=g.map(([k,v])=>`<button class="chip${ui.g===k?' on':''}" data-g="${k}" aria-pressed="${ui.g===k}">${v}</button>`).join('');
  $('#tf').innerHTML=t.map(([k,v])=>`<button class="chip${ui.t===k?' on':''}" data-t="${k}" aria-pressed="${ui.t===k}">${v}</button>`).join('');
}
function renderFor(){const p=person(ui.sel);
  $('#forBar').innerHTML=S.people.length?`<label for="forSel">Dodajesz dla</label><select class="in" id="forSel">${S.people.map(x=>`<option value="${x.id}"${x.id===ui.sel?' selected':''}>${esc(x.name)}</option>`).join('')}</select>
    ${p?`<span class="hint">${pQty(p)} szt., ${zl(pTot(p))}</span><button class="btn ghost" data-tab="orders">Zobacz zamówienie</button>`:''}`
    :`<span class="hint">Żeby dodawać perfumy, najpierw dodaj osobę.</span><button class="btn" data-tab="orders">Dodaj osobę</button>`;}
function renderTabs(){document.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===ui.tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  $('#view-cat').hidden=ui.tab!=='cat';$('#view-orders').hidden=ui.tab!=='orders';$('#nord').textContent=S.people.length||'';}
function setTab(t){ui.tab=t;lsSet(LST,t);renderTabs();window.scrollTo(0,0);}
function renderAll(){renderTally();renderTabs();renderPeople();renderDefaults();renderPerson();renderFor();renderFilters();renderCatalog();}
function refreshNumbers(){renderTally();renderPeople();renderFor();renderCatalog();const p=person(ui.sel);if(!p)return;
  document.querySelectorAll('#personPanel tr[data-i]').forEach(tr=>{const l=p.items[+tr.dataset.i];if(!l)return;tr.querySelector('[data-ls]').textContent=zl(unit(p,l)*l.q);const inp=tr.querySelector('[data-ov]');if(l.o==null&&document.activeElement!==inp)inp.value=unit(p,l)});
  const t=$('#ptot');if(t)t.textContent=zl(pTot(p));}

/* ---------- events ---------- */
document.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)setTab(b.dataset.tab)});
$('#forBar').addEventListener('change',e=>{if(e.target.id==='forSel'){ui.sel=e.target.value;renderAll()}});
$('#addPerson').addEventListener('submit',e=>{e.preventDefault();const n=$('#newName').value.trim();if(!n)return;$('#newName').value='';addPerson(n);});
$('#people').addEventListener('click',e=>{const pb=e.target.closest('[data-paid]');if(pb){const p=person(pb.dataset.paid);p.paid=!p.paid;save();renderAll();return}
  const li=e.target.closest('.person');if(li){ui.sel=li.dataset.id;renderAll()}});
$('#people').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.person')){ui.sel=e.target.dataset.id;renderAll()}});
$('#defRates').addEventListener('input',e=>{const k=e.target.dataset.def;if(!k)return;S.settings.rates[k]=e.target.value;save();});
$('#clearAll').addEventListener('click',()=>{if(!S.people.length)return;if(confirm('Usunąć wszystkie osoby i ich zamówienia? Tego nie da się cofnąć.')){S.people=[];ui.sel=null;save();renderAll();toast('Zamówienie wyczyszczone')}});

const pp=$('#personPanel');
pp.addEventListener('input',e=>{const p=person(ui.sel);if(!p)return;const t=e.target;
  if(t.id==='pname'){p.name=t.value||'Bez imienia';save();renderTally();renderPeople();renderFor();renderCatalog();return}
  if(t.dataset.rate){p.r[t.dataset.rate]=t.value;save();refreshNumbers();return}
  if(t.hasAttribute('data-ov')){const tr=t.closest('tr');const l=p.items[+tr.dataset.i];const v=num(t.value);if(v==null)return;l.o=v;t.parentElement.classList.add('ov');save();refreshNumbers();}});
pp.addEventListener('change',e=>{if(e.target.hasAttribute('data-ov'))renderPerson();});
pp.addEventListener('click',e=>{const p=person(ui.sel);if(!p)return;const t=e.target.closest('button');if(!t)return;
  if(t.id==='ppaid'){p.paid=!p.paid;save();renderAll();return}
  if(t.id==='pdel'){if(confirm('Usunąć '+p.name+' razem z zamówieniem?')){S.people=S.people.filter(x=>x!==p);ui.sel=S.people[0]?.id||null;save();renderAll()}return}
  const tr=t.closest('tr');if(!tr)return;const i=+tr.dataset.i;const l=p.items[i];
  if(t.dataset.dq){l.q+= +t.dataset.dq;if(l.q<1)p.items.splice(i,1);save();renderAll();return}
  if(t.hasAttribute('data-rm')){p.items.splice(i,1);save();renderAll();return}
  if(t.hasAttribute('data-reset')){l.o=null;save();renderAll();}});

$('#q').addEventListener('input',e=>{ui.q=e.target.value;ui.limit=120;$('#clist').scrollTop=0;renderCatalog();});
$('#bf').addEventListener('change',e=>{ui.b=e.target.value;ui.limit=120;$('#clist').scrollTop=0;renderCatalog()});
$('#gf').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(b){ui.g=b.dataset.g;ui.limit=120;$('#clist').scrollTop=0;renderFilters();renderCatalog()}});
$('#tf').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(b){ui.t=b.dataset.t;ui.limit=120;$('#clist').scrollTop=0;renderFilters();renderCatalog()}});
// doczytuj kolejne pozycje, gdy lista dojedzie prawie do końca
$('#clist').addEventListener('scroll',e=>{const l=e.target;if($('#more')&&l.scrollTop+l.clientHeight>l.scrollHeight-400){ui.limit+=200;renderCatalog()}});
$('#clist').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b){const it=CATMAP.get(b.dataset.add);if(it)addItem(it);return}
  if(e.target.id==='more'){ui.limit+=200;renderCatalog()}});

/* catalog update */
$('#updCat').addEventListener('click',()=>$('#catFile').click());
$('#catFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const txt=await f.text();const doc=new DOMParser().parseFromString(txt,'text/html');const r=parseCatalog(doc);
    if(r.items.length<10){toast('W tym pliku nie znalazłem katalogu. Wrzuć eksport messages.html z kanału.');return}
    const oldIds=new Set(CAT.map(i=>i.id));
    C={warehouse:r.warehouse||C.warehouse,items:r.items.map(i=>[i.raw,i.g,i.t?1:0,i.p?1:0]),updatedAt:new Date().toISOString()};
    buildCat();const added=CAT.filter(i=>!oldIds.has(i.id)).length;const gone=[...oldIds].filter(id=>!CATMAP.has(id)).length;
    saveCatalog();renderAll();toast(`Katalog zaktualizowany: ${CAT.length} pozycji, ${added} nowych, ${gone} zniknęło`);
  }catch(err){toast('Nie udało się odczytać pliku. Sprawdź, czy to eksport HTML z Telegrama.')}});

/* wholesale message */
const dlg=$('#msgDlg');
function buildMsg(){
  const st=S.settings;const agg=new Map();
  S.people.forEach(p=>p.items.forEach(l=>{const a=agg.get(l.id)||{raw:l.raw,k:l.k,s:l.s,q:0};a.q+=l.q;agg.set(l.id,a)}));
  const arr=[...agg.values()].sort((a,b)=>a.raw.localeCompare(b.raw,'pl'));
  const perf=arr.filter(a=>a.k!=='tester'),test=arr.filter(a=>a.k==='tester');
  const total=arr.reduce((s,a)=>s+a.q,0);const sur=arr.reduce((s,a)=>s+a.s*a.q,0);
  const L=[];L.push((st.warehouse||C.warehouse||'MAGAZYN NR. 1').toUpperCase(),'');
  if(perf.length){L.push('PERFUMY','');perf.forEach(a=>L.push(`${a.q} x ${a.raw}`));L.push('')}
  if(test.length){L.push('TESTERY','');test.forEach(a=>L.push(`${a.q} x ${a.raw}`));L.push('')}
  if(!arr.length)L.push('(brak pozycji w zamówieniu)','');
  L.push(`(łączna ilość sztuk ${total} szt.)`,'','','DOSTAWA I PŁATNOŚĆ','',st.delivery||'',`Nr Paczkomatu: ${st.locker||'[NUMER]'}`,'','','DANE DO PRZESYŁKI','');
  [st.name,st.phone,st.email,st.street?st.street+',':'',st.city].filter(Boolean).forEach(x=>L.push(x));L.push('');
  const groups=[['flakon','wf',''],['sospiro','ws',' (Sospiro)'],['tester','wt',' (testery)']].map(([k,f,lab])=>({q:arr.filter(a=>a.k===k).reduce((s,a)=>s+a.q,0),p:num(st[f]),lab})).filter(g=>g.q);
  const fmt=n=>(Math.round(n*100)/100).toString().replace('.',',');
  const known=groups.every(g=>g.p!=null);
  if(groups.length===1&&!sur){const g=groups[0];L.push(`${g.q} szt. x ${g.p!=null?fmt(g.p):'[CENA]'} PLN = ${g.p!=null?fmt(g.q*g.p):'[KWOTA]'} PLN + KOSZT WYSYŁKI`)}
  else if(groups.length){groups.forEach(g=>L.push(`${g.q} szt. x ${g.p!=null?fmt(g.p):'[CENA]'} PLN = ${g.p!=null?fmt(g.q*g.p):'[KWOTA]'} PLN${g.lab}`));
    if(sur)L.push(`DOPŁATY: ${fmt(sur)} PLN`);
    L.push(`RAZEM: ${known?fmt(groups.reduce((s,g)=>s+g.q*g.p,0)+sur):'[KWOTA]'} PLN + KOSZT WYSYŁKI`)}
  return {text:L.join('\n'),total};
}
function fillForm(){$('#msgForm').querySelectorAll('[data-k]').forEach(i=>{const k=i.dataset.k;i.value=k==='warehouse'?(S.settings.warehouse||C.warehouse||''):(S.settings[k]??'')})}
function regen(){const r=buildMsg();$('#msgText').value=r.text;$('#msgHint').textContent=r.total<10&&r.total>0?`Uwaga: ${r.total} szt., minimum w hurtowni to 10.`:'Możesz poprawić tekst przed skopiowaniem.';}
$('#openMsg').addEventListener('click',()=>{fillForm();regen();dlg.showModal();});
$('#closeMsg').addEventListener('click',()=>dlg.close());
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
$('#msgForm').addEventListener('input',e=>{const k=e.target.dataset.k;if(!k)return;S.settings[k]=e.target.value;save();regen();});
$('#regen').addEventListener('click',regen);
$('#copyMsg').addEventListener('click',async()=>{const ta=$('#msgText');try{await navigator.clipboard.writeText(ta.value);toast('Skopiowano wiadomość')}catch(e){ta.select();try{document.execCommand('copy');toast('Skopiowano wiadomość')}catch(_){toast('Zaznacz tekst i skopiuj Ctrl+C')}}});

/* ---------- boot ---------- */
const ls=lsGet(LS);if(ls)S=normalizeState(ls);
const lc=lsGet(LSC);if(lc&&Array.isArray(lc.items))C=lc;
const lt=lsGet(LST);ui.tab=lt==='cat'||lt==='orders'?lt:S.people.length?'cat':'orders';
buildCat();ui.sel=S.people[0]?.id||null;renderAll();
})();
