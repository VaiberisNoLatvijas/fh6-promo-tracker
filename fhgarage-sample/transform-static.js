// Build static car config (PI / rarity / stats) for all cars from the saved car-list page.
// Primary source: the complete site-search-index JSON (year/make/model/class/PI).
// Joined: per-cell attributes for rarity + power/speed/weight/drive.
const fs=require("fs");
const html=fs.readFileSync("../fh6-promo-tracker.html","utf8");
const CARS=eval("["+html.match(/const CARS = \[([\s\S]*?)\n\];/)[1].replace(/\/\/[^\n]*/g,"")+"]");
CARS.forEach(c=>c.id=(c[1]+"|"+c[0]+"|"+c[2]).toLowerCase());
const norm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/['’`]/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const d=[...Array(m+1)].map((_,i)=>[i,...Array(n).fill(0)]);for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
function sim(a,b){if(a===b)return 1;if(b.startsWith(a)||a.startsWith(b))return .9;return 1-lev(a,b)/Math.max(a.length,b.length,1);}
const ourByKey={}; CARS.forEach(c=>{const k=norm(c[1])+"|"+norm(c[2]);(ourByKey[k]=ourByKey[k]||[]).push(c);});
const usedOur=new Set();
function exactId(year,make,model){
  const pool=(ourByKey[norm(make)+"|"+norm(model)]||[]).filter(c=>!usedOur.has(c.id));
  if(!pool.length) return null;
  pool.sort((a,b)=>Math.abs(a[0]-year)-Math.abs(b[0]-year)); return pool[0];
}
function fuzzyId(year,make,model){
  let best=null,bs=-1; const om=norm(make+" "+model);
  for(const c of CARS){ if(usedOur.has(c.id))continue; const ys=1-Math.min(Math.abs(c[0]-year),15)/15; const sc=sim(om,norm(c[1]+" "+c[2]))*0.8+ys*0.2; if(sc>bs){bs=sc;best=c;} }
  return {car:best,score:bs};
}
const s=fs.readFileSync("cars-list-source.txt","utf8");
const RARMAP={common:"common",rare:"rare",epic:"epic",legendary:"legendary"};
const attr=(blob,name)=>{const m=blob.match(new RegExp('data-'+name+'="([^"]*)"'));return m?m[1]:"";};
// per-cell attributes keyed by make|year|pi (the card URL slug differs from the index slug)
const cellRe=/<div class="car-cell"([^>]*)>/g;
const cellByKey={}; let cm;
while((cm=cellRe.exec(s))){ const b=cm[1]; cellByKey[attr(b,"make")+"|"+attr(b,"year")+"|"+attr(b,"pi")]={rarity:attr(b,"rarity"),power:+attr(b,"power")||undefined,speed:+attr(b,"speed")||undefined,weight:+attr(b,"weight")||undefined,drive:attr(b,"drive")||undefined}; }
// complete index; PASS 1 exact (make|model, nearest year), PASS 2 fuzzy for leftovers
const index=JSON.parse(s.match(/id="site-search-index">([\s\S]*?)<\/script>/)[1]);
const cfg={}; const unmatched=[]; const low=[]; let matched=0,withRarity=0;
const assigned=[], deferred=[];
index.forEach(e=>{ const c=exactId(e.y,e.k,e.m); if(c){ usedOur.add(c.id); assigned.push([e,c,1]); } else deferred.push(e); });
deferred.forEach(e=>{ const r=fuzzyId(e.y,e.k,e.m); if(r.score>=0.6){ usedOur.add(r.car.id); assigned.push([e,r.car,r.score]); } else unmatched.push(`${e.y} ${e.k} ${e.m} (best ${r.car[0]} ${r.car[1]} ${r.car[2]} ${r.score.toFixed(2)})`); });
assigned.forEach(([e,car,score])=>{
  matched++; if(score<0.78) low.push(`${e.y} ${e.k} ${e.m} -> ${car[0]} ${car[1]} ${car[2]} ${score.toFixed(2)}`);
  const cell=cellByKey[`${e.k}|${e.y}|${e.p}`]||{};
  const rec={ pi:e.p||undefined, power:cell.power, speed:cell.speed, weight:cell.weight, drive:cell.drive||undefined };
  const rk=RARMAP[(cell.rarity||"").toLowerCase()]; if(rk){ rec.rarity=rk; withRarity++; }
  Object.keys(rec).forEach(k=>rec[k]===undefined&&delete rec[k]);
  cfg[car.id]=rec;
});
const notCovered=CARS.filter(c=>!usedOur.has(c.id));
fs.writeFileSync("fhgarage-static.json",JSON.stringify(cfg));
console.log("index entries:",index.length,"| matched:",matched,"| with rarity:",withRarity,"| unmatched:",unmatched.length);
console.log("low-confidence ("+low.length+"):"); low.slice(0,20).forEach(x=>console.log("  "+x));
console.log("unmatched ("+unmatched.length+"):"); unmatched.forEach(x=>console.log("  "+x));
console.log("our cars NOT covered ("+notCovered.length+"):"); notCovered.forEach(c=>console.log("  "+c[0]+" "+c[1]+" "+c[2]));
console.log("records:",Object.keys(cfg).length,"|",fs.statSync("fhgarage-static.json").size,"bytes");
