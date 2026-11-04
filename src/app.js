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
const blank=()=>({people:[],settings:{rates:{flakon:85,tester:70,sospiro:60},warehouse:'',delivery:'Za pobraniem InPost Paczkomat',locker:'',name:'',phone:'',email:'',street:'',city:'',wf:'',wt:'',ws:'',partners:['Bodzio','Adi'],lastW:0,dlv:false}});
let S=blank();
let C={warehouse:DEFAULT_CATALOG.warehouse,items:DEFAULT_CATALOG.items,updatedAt:null};
let CAT=[],CATMAP=new Map(),CATMK=new Map();
const ui={sel:null,q:'',b:'all',g:'all',t:'all',limit:120,tab:'cat',wf:'all'};

function expand(row){const [raw,g,t,p]=row;const sm=raw.toUpperCase().match(/\+\s*(\d+)\s*Z[ŁL]/);
  const name=raw.replace(/\+\s*\d+\s*z[łl]/i,' ').replace(/\s+/g,' ').trim();
  const it={id:(t?'T:':'F:')+name.toUpperCase(),raw,name,g,t:!!t,p:!!p,s:sm?+sm[1]:0};
  it.k=it.t?'tester':it.p?'sospiro':'flakon';Object.assign(it,split(name));it.key=(it.name+' '+it.fq).toUpperCase().replace(/[’‘`]/g,"'");return it;}
// klucz do rozpoznania tych samych perfum mimo drobnych zmian zapisu (spacje, PREMIUM, PUSZKA...)
const mk=id=>id.slice(0,2)+id.slice(2).toUpperCase().replace(/PREMIUM|PREMIU\b|\bLUX\b|PUSZKA/g,'').replace(/[^A-Z0-9&ĄĆĘŁŃÓŚŹŻ]/g,'');
function buildCat(){CAT=C.items.map(expand);CATMAP=new Map(CAT.map(i=>[i.id,i]));CATMK=new Map(CAT.map(i=>[mk(i.id),i]));}
const catOf=l=>CATMAP.get(l.id)||CATMK.get(mk(String(l.id||'')));
const catDesc=it=>TYPES[it.k]+(it.s?` +${it.s} zł`:'');
// 'gone' = nie ma w katalogu, 'diff' = w katalogu jest inny rodzaj (np. już nie Sospiro) albo inna dopłata
const lstat=l=>{const it=catOf(l);return !it?'gone':it.k!==l.k||it.s!==l.s?'diff':'ok'};
function problems(){const r={gone:[],diff:[]};S.people.forEach(p=>p.items.forEach(l=>{const s=lstat(l);if(s!=='ok')r[s].push({p,l})}));return r}
// podepnij pozycje z zamówień pod nowe nazwy tych samych perfum (żeby wiadomość do hurtowni miała aktualny zapis)
function relink(){let n=0;S.people.forEach(p=>{p.items.forEach(l=>{if(CATMAP.has(l.id))return;const it=catOf(l);if(it){l.id=it.id;l.n=it.name;l.raw=it.raw;n++}});
  p.items=p.items.reduce((a,l)=>{const d=a.find(x=>x.id===l.id&&x.o===l.o);if(d){d.q+=l.q;d.m+=l.m}else a.push(l);return a},[])});
  if(n)save();return n}

const person=id=>S.people.find(p=>p.id===id);
const unit=(p,l)=>l.o!=null?l.o:(num(p.r[l.k])||0)+l.s;
// l.m = ile sztuk nie przyszło w dostawie; kwota osoby liczy tylko to, co faktycznie przyszło
const arrived=l=>l.q-l.m;
const pQty=p=>p.items.reduce((a,l)=>a+l.q,0);
const pMiss=p=>p.items.reduce((a,l)=>a+l.m,0);
const pTot=p=>p.items.reduce((a,l)=>a+unit(p,l)*arrived(l),0);
const pOrd=p=>p.items.reduce((a,l)=>a+unit(p,l)*l.q,0);
const wName=w=>S.settings.partners[w]??'Bez wspólnika';
const wOpts=sel=>S.settings.partners.map((n,i)=>`<option value="${i}"${i===sel?' selected':''}>${esc(n)}</option>`).join('');
const niceName=l=>{const it=catOf(l);return (it?[it.br,it.mo,it.vol,it.conc].filter(Boolean).join(' '):l.n)+(l.k==='tester'?' (tester)':'')};
// p.pa = kwota z chwili oznaczenia "zapłacone"; jeśli potem dojdą perfumy, wychodzi dopłata, a jak czegoś nie przyślą - zwrot
const paidAmt=p=>p.paid?p.pa:0;
const owe=p=>Math.round((pTot(p)-paidAmt(p))*100)/100;
const settled=p=>p.paid&&owe(p)===0;
const payLabel=p=>!p.paid?'niezapłacone':owe(p)>0?'dopłata '+zl(owe(p)):owe(p)<0?'do zwrotu '+zl(-owe(p)):'zapłacone';
const paidBtnHtml=p=>'<span class="box"></span>'+(!p.paid?'Nie zapłacił(a)':owe(p)>0?'Brakuje '+zl(owe(p)):owe(p)<0?'Do zwrotu '+zl(-owe(p)):'Zapłacił(a)');
function togglePaid(p){if(settled(p)){p.paid=false;p.pa=null}else{p.paid=true;p.pa=pTot(p)}save();renderAll();}

/* ---------- persistence (localStorage, tylko ten komputer) ---------- */
const LS='perfumy-zamowienia-v1',LSC='perfumy-katalog-v1',LST='perfumy-zakladka';
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast('Nie udało się zapisać danych')}}
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>lsSet(LS,S),250)}
window.addEventListener('beforeunload',()=>lsSet(LS,S));
function saveCatalog(){lsSet(LSC,C)}
function normalizeState(d){const b=blank();const s=Object.assign(b,d||{});s.settings=Object.assign(blank().settings,(d&&d.settings)||{});s.settings.rates=Object.assign(blank().settings.rates,s.settings.rates||{});s.people=(s.people||[]).map(p=>({id:p.id||uid(),name:p.name||'Bez imienia',w:Math.max(0,+p.w||0),paid:!!p.paid,pa:p.pa==null?null:+p.pa,c:p.c||0,r:Object.assign({},s.settings.rates,p.r||{}),items:(p.items||[]).map(l=>({id:l.id,n:l.n,raw:l.raw||l.n,k:l.k||'flakon',s:+l.s||0,q:Math.max(1,+l.q||1),m:Math.max(0,+l.m||0),o:l.o==null?null:+l.o}))}));
  if(!Array.isArray(s.settings.partners)||!s.settings.partners.length)s.settings.partners=blank().settings.partners;
  s.people.forEach(p=>{p.items.forEach(l=>l.m=Math.min(l.m,l.q));if(p.paid&&p.pa==null)p.pa=pTot(p)});return s}

/* ---------- actions ---------- */
function addPerson(name,w){const p={id:uid(),name,w,paid:false,pa:null,c:S.people.reduce((m,x)=>Math.max(m,(x.c||0)+1),0),r:Object.assign({},S.settings.rates),items:[]};S.people.push(p);ui.sel=p.id;save();renderAll();}
function addItem(it){const p=person(ui.sel);if(!p)return;const l=p.items.find(x=>x.id===it.id);if(l)l.q++;else p.items.push({id:it.id,n:it.name,raw:it.raw,k:it.k,s:it.s,q:1,m:0,o:null});save();renderAll();}
// własne okno potwierdzenia zamiast confirm(): natywne okienko w Electronie na Windows blokuje potem pisanie w polach
function ask(msg,yes='Tak'){const d=$('#askDlg'),y=$('#askYes');$('#askText').textContent=msg;y.textContent=yes;d.showModal();y.focus();
  return new Promise(res=>{const done=v=>{d.close();res(v)};y.onclick=()=>done(true);$('#askNo').onclick=()=>done(false);d.oncancel=e=>{e.preventDefault();done(false)}})}
let toastT;function toast(m,ms=3200){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),ms)}

/* ---------- render ---------- */
function renderTally(){
  const tot=S.people.reduce((a,p)=>a+pTot(p),0),qty=S.people.reduce((a,p)=>a+pQty(p),0),miss=S.people.reduce((a,p)=>a+pMiss(p),0);
  const paid=S.people.reduce((a,p)=>a+Math.min(paidAmt(p),pTot(p)),0);
  const due=S.people.reduce((a,p)=>a+Math.max(0,owe(p)),0),back=S.people.reduce((a,p)=>a+Math.max(0,-owe(p)),0);
  const withSum=S.people.filter(p=>pTot(p)>0);
  $('#tally').innerHTML=`<div class="tally-nums">
    <div class="big">${esc(zl(tot).replace(' zł',''))}<small>zł razem</small></div>
    <div class="stat"><b>${qty}</b>szt. w zamówieniu</div>
    ${miss?`<div class="stat unpaid"><b>${miss} szt.</b>nie przyszło</div>`:''}
    <div class="stat paid"><b>${zl(paid)}</b>zapłacone</div>
    <div class="stat unpaid"><b>${zl(due)}</b>do odebrania</div>
    ${back?`<div class="stat unpaid"><b>${zl(back)}</b>do zwrotu (nadpłaty)</div>`:''}</div>
    ${withSum.length?`<div class="bar" role="img" aria-label="Udział osób w kwocie">${withSum.map(p=>`<span class="${owe(p)>0?'unp':''}" style="flex-grow:${pTot(p)};background-color:${COLORS[p.c%COLORS.length]}" title="${esc(p.name)}: ${zl(pTot(p))} (${payLabel(p)})"></span>`).join('')}</div>
    <div class="legend">${withSum.map(p=>`<span><i style="background:${COLORS[p.c%COLORS.length]}"></i>${esc(p.name)} ${zl(pTot(p))}</span>`).join('')}<span>paski w kreskę = jeszcze nie zapłacili</span></div>`:''}`;
}
const plural=n=>n+(n===1?' osoba':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?' osoby':' osób');
function renderObar(){const st=S.settings;
  const chip=(k,lab,ps)=>`<button class="chip${String(ui.wf)===String(k)?' on':''}" data-wf="${k}">${esc(lab)} <span class="cnt">${ps.length} os. · ${zl(ps.reduce((a,p)=>a+pTot(p),0))}</span></button>`;
  $('#obar').innerHTML=`<div class="seg">${chip('all','Wszyscy',S.people)}${st.partners.map((n,i)=>chip(i,n,S.people.filter(p=>p.w===i))).join('')}</div>
    <div class="obar-r"><label class="sw"><input type="checkbox" id="dlvMode"${st.dlv?' checked':''}> Po dostawie: zaznaczam braki</label><button class="btn" id="openDlv">Podsumowanie dostawy</button>
      <button class="btn" id="expP" title="Zapisz plik z osobami z tej listy, żeby wysłać go wspólnikowi">Eksportuj ${ui.wf==='all'?'wszystkich':'osoby: '+esc(wName(ui.wf))}</button>
      <button class="btn" id="impP" title="Wczytaj plik z osobami od wspólnika">Importuj osoby</button></div>`;}
function renderPeople(){
  const list=S.people.filter(p=>ui.wf==='all'||p.w===ui.wf);
  $('#pcount').textContent=list.length?plural(list.length):'';
  $('#people').innerHTML=list.length?list.map(p=>{const bad=p.items.filter(l=>lstat(l)!=='ok').length,miss=pMiss(p);return `<li class="person${p.id===ui.sel?' sel':''}" data-id="${p.id}" tabindex="0">
    <span class="dot" style="background:${COLORS[p.c%COLORS.length]}"></span>
    <span class="nm">${esc(p.name)}</span><span class="sum">${zl(pTot(p))}</span>
    <span class="meta">${pQty(p)} szt.${ui.wf==='all'?` · ${esc(wName(p.w))}`:''}${miss?` <span class="wtxt">· ${miss} nie przyszło</span>`:''}${bad?` <span class="wtxt">· ${bad} do sprawdzenia</span>`:''}</span>
    <span style="text-align:right"><button class="pill ${settled(p)?'paid':'unpaid'}" data-paid="${p.id}" title="${settled(p)?'Kliknij, aby oznaczyć jako niezapłacone':'Kliknij, gdy zapłaci całość'}">${payLabel(p)}</button></span></li>`}).join('')
    :`<li class="empty" style="padding:18px 10px"><strong>Brak osób${ui.wf==='all'?'':' od '+esc(wName(ui.wf))}</strong>Dodaj osobę poniżej.</li>`;
  $('#newW').innerHTML=wOpts(ui.wf==='all'?S.settings.lastW:ui.wf);
}
function rateInputs(rates,attr){return Object.keys(TYPES).map(k=>`<div class="rate"><label for="${attr}-${k}">${TYPES[k]}</label><div class="money"><input class="in${num(rates[k])==null?' bad':''}" title="Pusta stawka liczy się jako 0 zł" id="${attr}-${k}" ${attr}="${k}" inputmode="decimal" value="${rates[k]??''}"></div></div>`).join('')}
function renderDefaults(){$('#defRates').innerHTML=rateInputs(S.settings.rates,'data-def');
  const pi=$('#partners');if(document.activeElement!==pi)pi.value=S.settings.partners.join(', ');}
function renderPerson(){
  const el=$('#personPanel');const p=person(ui.sel);
  if(!p){el.innerHTML=`<div class="empty" style="padding:70px 24px"><strong>${S.people.length?'Wybierz osobę z listy':'Zacznij od dodania osoby'}</strong>Potem w zakładce Lista perfum klikaj perfumy, żeby dodać je do jej zamówienia.</div>`;return}
  const flag=l=>{const s=lstat(l);return s==='gone'?'<span class="b x">brak w aktualnym katalogu</span>':s==='diff'?`<button class="b x" data-sync title="Kliknij, aby przyjąć rodzaj i dopłatę z katalogu">w katalogu: ${catDesc(catOf(l))}</button>`:''};
  const dlv=S.settings.dlv;
  // w trybie dostawy: 1 szt. = ptaszek, więcej = licznik "przyszło x/y"
  const arrCell=l=>l.q===1?`<label class="arr"><input type="checkbox" data-arr${l.m?'':' checked'}> ${l.m?'nie przyszło':'przyszło'}</label>`
    :`<div class="qty"><button data-dm="1" aria-label="Przyszło mniej">−</button><span>${arrived(l)}/${l.q}</span><button data-dm="-1" aria-label="Przyszło więcej">+</button></div>`;
  el.innerHTML=`<div class="ph">
      <input class="pname" id="pname" value="${esc(p.name)}" aria-label="Imię">
      <select class="in wsel" id="pw" aria-label="Wspólnik" title="Od którego wspólnika jest ta osoba">${wOpts(p.w)}</select>
      <button class="paidbtn${settled(p)?' on':''}" id="ppaid" title="${settled(p)?'Kliknij, aby oznaczyć jako niezapłacone':'Kliknij, gdy zapłaci całość'}">${paidBtnHtml(p)}</button>
      <button class="btn" data-tab="cat">Dodaj perfumy</button>
      <button class="btn" id="pmsg" title="Tekst do wysłania tej osobie, żeby sprawdziła zamówienie">Wiadomość dla osoby</button>
      <button class="btn" id="pexp" title="Zapisz plik z tą osobą, żeby wysłać go wspólnikowi">Eksportuj</button>
      <button class="btn ghost danger" id="pdel">Usuń osobę</button></div>
    <div class="prates">${rateInputs(p.r,'data-rate')}</div>
    ${p.items.length?`<div class="lines-wrap"><table class="lines"><thead><tr><th>Perfumy</th><th>Ilość</th>${dlv?'<th>Przyszło</th>':''}<th class="r">Cena za szt.</th><th class="r">Razem</th><th><span class="sr">Usuń</span></th></tr></thead><tbody>
    ${p.items.map((l,i)=>`<tr data-i="${i}"${l.m?` class="${l.m===l.q?'gone':'part'}"`:''}><td><a class="lname" href="${esc(frag((catOf(l)||split(l.n)).fq))}" target="_blank" rel="noopener" title="Otwórz na Fragrantica">${esc(l.n)}<span class="ext" aria-hidden="true">↗</span></a><div class="badges">${l.k!=='flakon'?`<span class="b ${l.k==='tester'?'t':'p'}">${TYPES[l.k]}</span>`:''}${l.s?`<span class="b s">+${l.s} zł dopłaty</span>`:''}${l.m?`<span class="b x">nie przyszło: ${l.m} szt.</span>`:''}${flag(l)}</div></td>
      <td><div class="qty"><button data-dq="-1" aria-label="Mniej">−</button><span>${l.q}</span><button data-dq="1" aria-label="Więcej">+</button></div></td>
      ${dlv?`<td>${arrCell(l)}</td>`:''}
      <td><div class="pricecell">${l.o!=null?`<button class="reset" data-reset title="Wróć do stawki osoby">auto</button>`:''}<div class="money pricein${l.o!=null?' ov':''}"><input class="in" data-ov inputmode="decimal" value="${unit(p,l)}" aria-label="Cena za sztukę" title="${l.o!=null?'Cena ręczna':'Stawka '+TYPES[l.k].toLowerCase()+(l.s?' + dopłata '+l.s+' zł':'')}"></div></div></td>
      <td class="r" data-ls>${zl(unit(p,l)*arrived(l))}</td>
      <td class="r"><button class="x" data-rm aria-label="Usuń pozycję">×</button></td></tr>`).join('')}
    </tbody></table></div>`:`<div class="empty" style="border-top:1px solid var(--line)"><strong>${esc(p.name)} nie ma jeszcze perfum</strong>Kliknij „Dodaj perfumy”, żeby wybrać je z listy.</div>`}
    <div class="pfoot"><span class="hint">${pQty(p)} szt.${pMiss(p)?`, ${pMiss(p)} nie przyszło (zamówione za ${zl(pOrd(p))})`:''}. Zmiana stawki przelicza wszystkie pozycje bez ręcznej ceny.</span><span class="tot" id="ptot">${zl(pTot(p))}</span></div>`;
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
  $('#forBar').innerHTML=S.people.length?`<label for="forSel">Dodajesz dla</label><select class="in" id="forSel">${S.people.map(x=>`<option value="${x.id}"${x.id===ui.sel?' selected':''}>${esc(x.name)} (${esc(wName(x.w))})</option>`).join('')}</select>
    ${p?`<span class="hint">${pQty(p)} szt., ${zl(pTot(p))}</span><button class="btn ghost" data-tab="orders">Zobacz zamówienie</button>`:''}`
    :`<span class="hint">Żeby dodawać perfumy, najpierw dodaj osobę.</span><button class="btn" data-tab="orders">Dodaj osobę</button>`;}
function renderTabs(){document.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===ui.tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  $('#view-cat').hidden=ui.tab!=='cat';$('#view-orders').hidden=ui.tab!=='orders';$('#nord').textContent=S.people.length||'';
  const pr=problems();$('#nwarn').textContent=pr.gone.length+pr.diff.length||'';}
function setTab(t){ui.tab=t;lsSet(LST,t);renderTabs();window.scrollTo(0,0);}
function renderAll(){renderTally();renderTabs();renderObar();renderPeople();renderDefaults();renderPerson();renderFor();renderFilters();renderCatalog();}
function refreshNumbers(){renderTally();renderObar();renderPeople();renderFor();renderCatalog();const p=person(ui.sel);if(!p)return;
  document.querySelectorAll('#personPanel tr[data-i]').forEach(tr=>{const l=p.items[+tr.dataset.i];if(!l)return;tr.querySelector('[data-ls]').textContent=zl(unit(p,l)*arrived(l));const inp=tr.querySelector('[data-ov]');if(l.o==null&&document.activeElement!==inp)inp.value=unit(p,l)});
  const t=$('#ptot');if(t)t.textContent=zl(pTot(p));
  const pb=$('#ppaid');if(pb){pb.innerHTML=paidBtnHtml(p);pb.classList.toggle('on',settled(p))}}

/* ---------- events ---------- */
document.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)setTab(b.dataset.tab)});
$('#forBar').addEventListener('change',e=>{if(e.target.id==='forSel'){ui.sel=e.target.value;renderAll()}});
$('#addPerson').addEventListener('submit',e=>{e.preventDefault();const n=$('#newName').value.trim();if(!n)return;$('#newName').value='';addPerson(n,+$('#newW').value||0);});
$('#newW').addEventListener('change',e=>{S.settings.lastW=+e.target.value;save()});
$('#partners').addEventListener('change',e=>{const a=e.target.value.split(',').map(x=>x.trim()).filter(Boolean);
  if(a.length)S.settings.partners=a;else toast('Musi być przynajmniej jeden wspólnik');
  if(ui.wf!=='all'&&ui.wf>=S.settings.partners.length)ui.wf='all';save();renderAll();});
$('#obar').addEventListener('click',e=>{const c=e.target.closest('[data-wf]');if(c){ui.wf=c.dataset.wf==='all'?'all':+c.dataset.wf;renderAll();return}
  if(e.target.id==='openDlv')openDelivery();
  if(e.target.id==='expP')exportPeople(S.people.filter(p=>ui.wf==='all'||p.w===ui.wf),ui.wf==='all'?'wszyscy':wName(ui.wf));
  if(e.target.id==='impP')$('#impFile').click();});
$('#obar').addEventListener('change',e=>{if(e.target.id==='dlvMode'){S.settings.dlv=e.target.checked;save();renderAll()}});
$('#people').addEventListener('click',e=>{const pb=e.target.closest('[data-paid]');if(pb){togglePaid(person(pb.dataset.paid));return}
  const li=e.target.closest('.person');if(li){ui.sel=li.dataset.id;renderAll()}});
$('#people').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.person')){ui.sel=e.target.dataset.id;renderAll()}});
$('#defRates').addEventListener('input',e=>{const k=e.target.dataset.def;if(!k)return;S.settings.rates[k]=e.target.value;e.target.classList.toggle('bad',num(e.target.value)==null);save();});
$('#clearAll').addEventListener('click',async()=>{if(!S.people.length)return;if(await ask('Usunąć wszystkie osoby i ich zamówienia? Tego nie da się cofnąć.','Usuń wszystko')){S.people=[];S.settings.dlv=false;ui.sel=null;save();renderAll();toast('Zamówienie wyczyszczone')}});

const pp=$('#personPanel');
pp.addEventListener('input',e=>{const p=person(ui.sel);if(!p)return;const t=e.target;
  if(t.id==='pname'){p.name=t.value||'Bez imienia';save();renderTally();renderPeople();renderFor();renderCatalog();return}
  if(t.dataset.rate){p.r[t.dataset.rate]=t.value;t.classList.toggle('bad',num(t.value)==null);save();refreshNumbers();return}
  if(t.hasAttribute('data-ov')){const tr=t.closest('tr');const l=p.items[+tr.dataset.i];const v=num(t.value);if(v==null)return;l.o=v;t.parentElement.classList.add('ov');save();refreshNumbers();}});
pp.addEventListener('change',e=>{const t=e.target,p=person(ui.sel);if(!p)return;
  if(t.id==='pw'){p.w=+t.value;save();renderAll();return}
  if(t.hasAttribute('data-arr')){const l=p.items[+t.closest('tr').dataset.i];l.m=t.checked?0:l.q;save();renderAll();return}
  if(t.hasAttribute('data-ov'))renderPerson();});
pp.addEventListener('click',e=>{const p=person(ui.sel);if(!p)return;const t=e.target.closest('button');if(!t)return;
  if(t.id==='ppaid'){togglePaid(p);return}
  if(t.id==='pmsg'){openPm(p);return}
  if(t.id==='pexp'){exportPeople([p],p.name);return}
  if(t.id==='pdel'){ask('Usunąć '+p.name+' razem z zamówieniem?','Usuń').then(ok=>{if(ok){S.people=S.people.filter(x=>x!==p);ui.sel=S.people[0]?.id||null;save();renderAll()}});return}
  const tr=t.closest('tr');if(!tr)return;const i=+tr.dataset.i;const l=p.items[i];
  if(t.dataset.dq){l.q+= +t.dataset.dq;l.m=Math.min(l.m,l.q);if(l.q<1)p.items.splice(i,1);save();renderAll();return}
  if(t.dataset.dm){l.m=Math.min(l.q,Math.max(0,l.m+ +t.dataset.dm));save();renderAll();return}
  if(t.hasAttribute('data-rm')){p.items.splice(i,1);save();renderAll();return}
  if(t.hasAttribute('data-sync')){const it=catOf(l);if(it){l.k=it.k;l.s=it.s}save();renderAll();return}
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
    const oldK=new Set(CAT.map(i=>mk(i.id))),newK=new Set(r.items.map(i=>mk(i.id)));
    const added=[...newK].filter(k=>!oldK.has(k)).length,gone=[...oldK].filter(k=>!newK.has(k)).length;
    // podejrzanie mały plik (np. eksport tylko kilku ostatnich wiadomości) - nie podmieniaj bez pytania
    if(r.items.length<CAT.length*0.7&&!await ask(`Nowy katalog ma ${r.items.length} pozycji, a obecny ${CAT.length}. Z listy zniknie ${gone} perfum.\n\nCzy to na pewno pełny eksport kanału?`,'Podmień katalog'))return;
    C={warehouse:r.warehouse||C.warehouse,items:r.items.map(i=>[i.raw,i.g,i.t?1:0,i.p?1:0]),updatedAt:new Date().toISOString()};
    buildCat();const moved=relink();saveCatalog();renderAll();
    const pr=problems(),who=[...new Set(pr.gone.map(x=>x.p.name))];
    toast(`Katalog zaktualizowany: ${CAT.length} pozycji, ${added} nowych, ${gone} zniknęło.`
      +(moved?` ${moved} poz. w zamówieniach dopasowano do nowych nazw.`:'')
      +(pr.gone.length?` W zamówieniach brakuje ${pr.gone.length} poz. (${who.join(', ')}), oznaczone na czerwono.`:'')
      +(pr.diff.length?` ${pr.diff.length} poz. ma w katalogu inny rodzaj lub dopłatę.`:''),pr.gone.length||pr.diff.length?12000:4000);
  }catch(err){toast('Nie udało się odczytać pliku. Sprawdź, czy to eksport HTML z Telegrama.')}});

/* eksport / import osób: plik .json do przesłania wspólnikowi */
const EXP='zamowienia-perfum-osoby';
function exportPeople(ps,label){if(!ps.length){toast('Brak osób do eksportu');return}
  // wn = nazwa wspólnika; u drugiej osoby lista wspólników może mieć inną kolejność
  const data={type:EXP,v:1,at:new Date().toISOString(),people:ps.map(p=>Object.assign({},p,{wn:wName(p.w)}))};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));
  a.download=('osoby-'+label+'-'+new Date().toISOString().slice(0,10)+'.json').replace(/[\\/:*?"<>|\s]+/g,'_');
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
  toast('Zapisano plik: '+plural(ps.length)+'. Wyślij go wspólnikowi.');}
$('#impFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  let d=null;try{d=JSON.parse(await f.text())}catch(_){}
  if(!d||d.type!==EXP||!Array.isArray(d.people)||!d.people.length){toast('To nie jest plik z eksportu osób z tej aplikacji.');return}
  const inc=normalizeState({people:d.people,settings:S.settings}).people;
  inc.forEach((p,i)=>{p.wn=typeof d.people[i].wn==='string'?d.people[i].wn.trim():''});
  const dup=inc.filter(p=>person(p.id));let replace=false;
  if(dup.length)replace=await ask(`${dup.map(p=>p.name).join(', ')} ${dup.length===1?'jest':'są'} już u Ciebie (z wcześniejszego importu).\n\nZastąpić wersją z pliku? „Anuluj” pominie te osoby, a resztę doda.`,'Zastąp');
  let added=0,repl=0;
  inc.forEach(p=>{const old=person(p.id);if(old&&!replace)return;
    if(p.wn){let w=S.settings.partners.findIndex(n=>n.toLowerCase()===p.wn.toLowerCase());if(w<0){S.settings.partners.push(p.wn);w=S.settings.partners.length-1}p.w=w}
    delete p.wn;
    if(old){p.c=old.c;S.people[S.people.indexOf(old)]=p;repl++}
    else{p.c=S.people.reduce((m,x)=>Math.max(m,(x.c||0)+1),0);S.people.push(p);added++}});
  if(!added&&!repl){toast('Nic nie zaimportowano.');return}
  ui.sel=inc.find(p=>person(p.id)===p)?.id||ui.sel;ui.wf='all';
  relink();save();renderAll();
  const pr=problems();
  toast(`Zaimportowano: ${added?'dodano '+plural(added):''}${added&&repl?', ':''}${repl?'zastąpiono '+plural(repl):''}.`+(pr.gone.length?` ${pr.gone.length} poz. nie ma w Twoim katalogu (oznaczone na czerwono).`:''),pr.gone.length?9000:4000);});

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
function regen(){const r=buildMsg();$('#msgText').value=r.text;
  const pr=problems(),w=[],lst=a=>a.map(({p,l})=>`${esc(l.n)} ×${l.q} (${esc(p.name)})`).join(', ');
  if(pr.gone.length)w.push(`<b>${pr.gone.length} poz. nie ma w aktualnym katalogu</b>, a są w tej wiadomości: ${lst(pr.gone)}. Usuń je w zamówieniach osób albo z tekstu.`);
  if(pr.diff.length)w.push(`<b>${pr.diff.length} poz. ma w katalogu inny rodzaj lub dopłatę</b> niż w zamówieniu: ${lst(pr.diff)}. Ceny dla znajomych mogą się nie zgadzać.`);
  if(r.total>0&&r.total<10)w.push(`<b>${r.total} szt.</b>, a minimum w hurtowni to 10.`);
  const el=$('#msgWarn');el.innerHTML=w.map(x=>`<p>${x}</p>`).join('');el.hidden=!w.length;}
$('#openMsg').addEventListener('click',()=>{fillForm();regen();dlg.showModal();});
$('#closeMsg').addEventListener('click',()=>dlg.close());
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
$('#msgForm').addEventListener('input',e=>{const k=e.target.dataset.k;if(!k)return;S.settings[k]=e.target.value;save();regen();});
$('#regen').addEventListener('click',regen);
async function copyText(ta,ok){try{await navigator.clipboard.writeText(ta.value);toast(ok)}catch(e){ta.select();try{document.execCommand('copy');toast(ok)}catch(_){toast('Zaznacz tekst i skopiuj Ctrl+C')}}}
$('#copyMsg').addEventListener('click',()=>copyText($('#msgText'),'Skopiowano wiadomość'));

/* wiadomość dla jednej osoby: lista zamówionych perfum z kwotami i suma */
function personMsg(p){const L=[`ZAMÓWIENIE ${p.name.toUpperCase()}:`,''];
  p.items.forEach(l=>{const u=unit(p,l);L.push(`${niceName(l)}: ${l.q>1?`${l.q} x ${zl(u)} = `:''}${zl(u*l.q)}`)});
  L.push('',`RAZEM: ${zl(pOrd(p))}`);return L.join('\n')}
const pmDlg=$('#pmDlg');
function openPm(p){$('#pmTitle').textContent='Wiadomość dla: '+p.name;$('#pmText').value=personMsg(p);pmDlg.showModal();}
$('#closePm').addEventListener('click',()=>pmDlg.close());
pmDlg.addEventListener('click',e=>{if(e.target===pmDlg)pmDlg.close()});
$('#copyPm').addEventListener('click',()=>copyText($('#pmText'),'Skopiowano wiadomość'));

/* delivery: braki z paczki, ile zapłacić hurtowni i ile wziąć/oddać osobom */
const ddlg=$('#dlvDlg');
function buildDelivery(){
  const st=S.settings,wp={flakon:num(st.wf),tester:num(st.wt),sospiro:num(st.ws)};
  let ordQ=0,arrQ=0,ordW=0,arrW=0,wKnown=true;
  S.people.forEach(p=>p.items.forEach(l=>{if(wp[l.k]==null)wKnown=false;const u=(wp[l.k]||0)+l.s;ordQ+=l.q;arrQ+=arrived(l);ordW+=u*l.q;arrW+=u*arrived(l)}));
  const groups=st.partners.map((n,i)=>({n,ps:S.people.filter(p=>p.w===i)}));
  const orphan=S.people.filter(p=>!(p.w in st.partners));if(orphan.length)groups.push({n:'Bez wspólnika',ps:orphan});
  groups.forEach(g=>{g.tot=g.ps.reduce((a,p)=>a+pTot(p),0);g.col=g.ps.reduce((a,p)=>a+Math.max(0,owe(p)),0);g.ref=g.ps.reduce((a,p)=>a+Math.max(0,-owe(p)),0)});
  const L=['BRAKI W DOSTAWIE',''];
  groups.forEach(g=>{if(!g.ps.length)return;L.push(g.n.toUpperCase());
    const miss=g.ps.flatMap(p=>p.items.filter(l=>l.m).map(l=>`- ${p.name}: ${niceName(l)} x${l.m}`));
    L.push(...(miss.length?['Nie przyszło:',...miss]:['Wszystko przyszło.']));
    const set=g.ps.filter(p=>owe(p)!==0).map(p=>`- ${p.name}: ${owe(p)>0?'do zapłaty '+zl(owe(p)):'do zwrotu '+zl(-owe(p))}${p.paid?'':' (jeszcze nic nie płacił/a)'}`);
    if(set.length)L.push('Rozliczenie:',...set);L.push('')});
  if(wKnown&&ordQ)L.push(`HURTOWNIA: za to, co przyszło ${zl(arrW)}${arrW!==ordW?` (zamiast ${zl(ordW)})`:''} + wysyłka`);
  const stat=(v,lab,c='')=>`<div class="stat ${c}"><b>${v}</b>${lab}</div>`;
  const html=`${ordQ===arrQ?`<p class="hint" style="margin:0">Nie zaznaczono żadnych braków. Włącz „Po dostawie: zaznaczam braki” w zakładce Zamówienia osób i odznacz perfumy, które nie przyszły.</p>`:''}
    <h3>Sztuki</h3><div class="dstats">${stat(ordQ,'zamówione')}${stat(arrQ,'przyszło','paid')}${stat(ordQ-arrQ,'nie przyszło','unpaid')}</div>
    <h3>Hurtownia</h3>${wKnown?`<div class="dstats">${stat(zl(ordW),'za całe zamówienie')}${stat(zl(arrW),'za to, co przyszło')}</div><p class="hint" style="margin:0">Bez kosztu wysyłki.</p>`
      :`<p class="hint" style="margin:0">Uzupełnij ceny hurtowni w oknie „Wiadomość do hurtowni”, żeby policzyć tę kwotę.</p>`}
    <h3>Wspólnicy</h3>${groups.map(g=>`<div class="pcard"><div><b>${esc(g.n)}</b> <span class="hint">${plural(g.ps.length)}</span></div>
      <div class="dstats">${stat(zl(g.tot),'za to, co przyszło')}${stat(zl(g.col),'do wzięcia od osób','unpaid')}${stat(zl(g.ref),'do oddania osobom')}</div></div>`).join('')}`;
  return {text:L.join('\n').trim(),html};
}
function openDelivery(){const r=buildDelivery();$('#dlvSum').innerHTML=r.html;$('#dlvText').value=r.text;ddlg.showModal();}
$('#closeDlv').addEventListener('click',()=>ddlg.close());
ddlg.addEventListener('click',e=>{if(e.target===ddlg)ddlg.close()});
$('#copyDlv').addEventListener('click',()=>copyText($('#dlvText'),'Skopiowano podsumowanie'));

/* ---------- boot ---------- */
const ls=lsGet(LS);if(ls)S=normalizeState(ls);
const lc=lsGet(LSC);if(lc&&Array.isArray(lc.items))C=lc;
const lt=lsGet(LST);ui.tab=lt==='cat'||lt==='orders'?lt:S.people.length?'cat':'orders';
buildCat();relink();ui.sel=S.people[0]?.id||null;renderAll();
})();
