// Parser eksportu HTML z Telegrama -> lista perfum
function parseCatalog(doc){
  const norm=s=>s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const items=[];const promo=new Set();const seen=new Set();let warehouse='';const dropped=[];
  doc.querySelectorAll('div.text').forEach(div=>{
    const lines=[];let cur='';
    const walk=n=>{
      for(const c of n.childNodes){
        if(c.nodeType===3){cur+=c.nodeValue;}
        else if(c.nodeType===1){
          const t=c.tagName.toLowerCase();
          if(t==='br'){lines.push(cur);cur='';}
          else if(t==='blockquote'||t==='div'||t==='p'){lines.push(cur);cur='';walk(c);lines.push(cur);cur='';}
          else walk(c);
        }
      }
    };
    walk(div);lines.push(cur);
    if(/CENIE PROMOCYJNEJ/i.test(div.textContent)){lines.forEach(x=>{x=norm(x).toUpperCase();if(/\d\s*ML/.test(x))promo.add(x);});return;}
    let gender=null,tester=false;
    for(let raw of lines){
      const l=norm(raw);if(!l)continue;const u=l.toUpperCase();
      if(!warehouse){const m=u.match(/^(MAGAZYN\s+NR\.?\s*\d+)/);if(m)warehouse=m[1];}
      let m;
      if((m=u.match(/^(TESTERY\s+)?(DAMSKIE|MĘSKIE|MESKIE|UNISEX)$/))){tester=!!m[1];gender=m[2][0]==='D'?'D':m[2][0]==='U'?'U':'M';continue;}
      if(/^ZESTAWY/.test(u)){gender=/KREM/.test(u)?null:'Z';tester=false;continue;}
      if(!gender)continue;
      if(/OBECNIE BRAK/.test(u))continue;
      if(/^\d+\s*ML\b/.test(u)&&items.length&&items[items.length-1]._open){const prev=items.pop();seen.delete(prev.id);raw=prev.raw+' '+l;}else if(/DEZODORANT|TOREBKA|OPAKOWANIE|PROMOCJ|CENIE/.test(u)||(u.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/g)||[]).length<6){dropped.push(l);continue;}else raw=l;
      const R=norm(raw),U=R.toUpperCase();const sm=U.match(/\+\s*(\d+)\s*Z[ŁL]/);const surcharge=sm?+sm[1]:0;
      const name=norm(R.replace(/\+\s*\d+\s*z[łl]/i,' '));
      const id=(tester?'T:':'F:')+name.toUpperCase();
      if(seen.has(id))continue;seen.add(id);
      items.forEach(x=>delete x._open);items.push({id,raw:R,name,g:gender,t:tester,s:surcharge,_open:true});
    }
  });
  items.forEach(x=>{delete x._open;x.p=!x.t&&promo.has(x.name.toUpperCase());});
  return {warehouse,items,dropped};
}
