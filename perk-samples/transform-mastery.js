// Build mastery import (perks catalog + per-car trees) from forzagarage data.
// Prefers fh6-mastery-raw.json (from scrape-forzagarage-mastery.js); else reads saved page files.
// Writes fhgarage-mastery.json = {perks:[...], trees:{carId:{cells,vals,costs?}}}.
const fs=require("fs");
const html=fs.readFileSync("../fh6-promo-tracker.html","utf8");
const CARS=eval("["+html.match(/const CARS = \[([\s\S]*?)\n\];/)[1].replace(/\/\/[^\n]*/g,"")+"]");
CARS.forEach(c=>c.id=(c[1]+"|"+c[0]+"|"+c[2]).toLowerCase());
const norm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/['’`]/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
const dec=s=>(s||"").replace(/&#3?9;|&#x27;/g,"'").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">");
function dedupe(s){ const w=s.split(" "); for(let k=Math.floor(w.length/2);k>=1;k--){ if(w.slice(0,k).join(" ")===w.slice(k,2*k).join(" ")) return w.slice(k).join(" "); } return s; }
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const d=[...Array(m+1)].map((_,i)=>[i,...Array(n).fill(0)]);for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
function sim(a,b){if(a===b)return 1;if(b.startsWith(a)||a.startsWith(b))return .9;return 1-lev(a,b)/Math.max(a.length,b.length,1);}
const ourByFull={}; CARS.forEach(c=>{const k=norm(c[1]+" "+c[2]);(ourByFull[k]=ourByFull[k]||[]).push(c);});
const usedOur=new Set();
function exact(year,rest){ const keys=[norm(rest),dedupe(norm(rest))]; for(const k of keys){ const pool=(ourByFull[k]||[]).filter(c=>!usedOur.has(c.id)); if(pool.length){ pool.sort((a,b)=>Math.abs(a[0]-year)-Math.abs(b[0]-year)); return pool[0]; } } return null; }
function fuzzy(year,rest){ let best=null,bs=-1;const om=dedupe(norm(rest)); for(const c of CARS){ if(usedOur.has(c.id))continue; const ys=1-Math.min(Math.abs(c[0]-year),15)/15; const sc=sim(om,norm(c[1]+" "+c[2]))*0.85+ys*0.15; if(sc>bs){bs=sc;best=c;} } return {car:best,score:bs}; }
const pretty=s=>(s||"").replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase());
const ROW=[10,5,3,1];

// ---- gather entries ----
const entries=[];
if(fs.existsSync("fh6-mastery-raw.json")){
  JSON.parse(fs.readFileSync("fh6-mastery-raw.json","utf8")).forEach(e=>e&&e.data&&entries.push({title:dec(e.title||""),d:e.data}));
} else {
  for(const f of fs.readdirSync(".")){ if(!/\.(txt|html)$/i.test(f)&&f.indexOf(".")>=0)continue; let s; try{s=fs.readFileSync(f,"utf8");}catch(e){continue;}
    const m=s.match(/<script type="application\/json" id="cm-data">([\s\S]*?)<\/script>/); if(!m)continue;
    const t=dec(((s.match(/class="mm-title"[^>]*>([^<]+?)\s*-\s*3D model</)||[])[1]||"").trim());
    try{ entries.push({title:t,d:JSON.parse(m[1])}); }catch(e){} }
}

// ---- pass 1 exact, pass 2 fuzzy ----
const perks={}, trees={}, unmatched=[], low=[]; let matched=0,overrides=0;
const assigned=[], deferred=[];
for(const e of entries){ const ym=(e.title||"").match(/^(\d{4})\s+(.+)$/); if(!ym){unmatched.push("(no title)");continue;}
  const year=+ym[1], rest=ym[2], c=exact(year,rest);
  if(c){ usedOur.add(c.id); assigned.push([c,e.d,1,rest,year]); } else deferred.push([rest,year,e.d]); }
for(const [rest,year,d] of deferred){ const r=fuzzy(year,rest); if(r.score>=0.6){ usedOur.add(r.car.id); assigned.push([r.car,d,r.score,rest,year]); } else unmatched.push(`${year} ${rest} (best ${r.car[0]} ${r.car[1]} ${r.car[2]} ${r.score.toFixed(2)})`); }
for(const [car,d,score,rest,year] of assigned){
  matched++; if(score<0.8) low.push(`${year} ${rest} -> ${car[0]} ${car[1]} ${car[2]} ${score.toFixed(2)}`);
  const cells={},vals={},costs={};
  d.cells.forEach((id,pos)=>{ if(id==null)return; const p=d.perks[id], key=p.perkId||("perk_"+id);
    cells[pos]=key; if(p.effect) vals[pos]=p.effect;
    const exp=pos===15?25:ROW[Math.floor(pos/4)]; if(p.cost!==exp){ costs[pos]=p.cost; overrides++; }
    if(!perks[key]) perks[key]={key,name:pretty(p.icon)||p.name,desc:"",icon:"",hasVar:!!p.effect,varLabel:"Effect",vars:[]};
    if(p.effect && !perks[key].vars.includes(p.effect)) perks[key].vars.push(p.effect);
  });
  const t={cells,vals}; if(Object.keys(costs).length) t.costs=costs; trees[car.id]=t;
}
fs.writeFileSync("fhgarage-mastery.json",JSON.stringify({perks:Object.values(perks),trees}));
console.log("entries:",entries.length,"| matched:",matched,"| unmatched:",unmatched.length,"| perks:",Object.keys(perks).length,"| cost overrides:",overrides);
console.log("low-confidence ("+low.length+"):"); low.slice(0,25).forEach(x=>console.log("  "+x));
console.log("unmatched ("+unmatched.length+"):"); unmatched.slice(0,40).forEach(x=>console.log("  "+x));
console.log("wrote fhgarage-mastery.json ("+fs.statSync("fhgarage-mastery.json").size+" bytes)");
