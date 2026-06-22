// Transform forzagarage saved car pages -> FH6-Tracker import JSON.
// Reads every *.txt / *.html in this folder, extracts the cm-data mastery JSON,
// matches the car to our dataset, and emits perks catalog + per-car trees.
const fs=require("fs");

// ---- load our canonical dataset ----
const html=fs.readFileSync("../fh6-promo-tracker.html","utf8");
const CARS=eval("["+html.match(/const CARS = \[([\s\S]*?)\n\];/)[1].replace(/\/\/[^\n]*/g,"")+"]");
CARS.forEach(c=>c.id=(c[1]+"|"+c[0]+"|"+c[2]).toLowerCase());

const norm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/['’`]/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const d=[...Array(m+1)].map((_,i)=>[i,...Array(n).fill(0)]);for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
function sim(a,b){if(a===b)return 1;if(b.startsWith(a)||a.startsWith(b))return .9;return 1-lev(a,b)/Math.max(a.length,b.length,1);}
function matchCar(year,rest){
  const om=norm(rest); let best=null,bs=-1;
  for(const c of CARS){ const dm=norm(c[1]+" "+c[2]); const ys=1-Math.min(Math.abs(c[0]-year),12)/12; const sc=sim(om,dm)*0.85+ys*0.15; if(sc>bs){bs=sc;best=c;} }
  return {car:best,score:bs};
}
const pretty=s=>(s||"").replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase());
const ROW_COST=[10,5,3,1];

const files=fs.readdirSync(".").filter(f=>/\.(txt|html)$/i.test(f));
const perks={}; const trees={}; const report=[]; let costOk=true;
for(const f of files){
  const s=fs.readFileSync(f,"utf8");
  const m=s.match(/<script type="application\/json" id="cm-data">([\s\S]*?)<\/script>/); if(!m){report.push(f+": no cm-data");continue;}
  const d=JSON.parse(m[1]);
  const title=((s.match(/class="mm-title"[^>]*>([^<]+?)\s*-\s*3D model</)||[])[1]||"").trim();
  const ym=title.match(/^(\d{4})\s+(.+)$/); if(!ym){report.push(f+": no title ("+title+")");continue;}
  const year=+ym[1], rest=ym[2];
  const {car,score}=matchCar(year,rest);
  // build cells + vals, verify cost rule
  const cells={}, vals={};
  d.cells.forEach((id,pos)=>{ if(id==null)return; const p=d.perks[id]; const key=p.perkId||("perk_"+id);
    cells[pos]=key; if(p.effect) vals[pos]=p.effect;
    const expect = pos===15?25:ROW_COST[Math.floor(pos/4)]; if(p.cost!==expect) costOk=false;
    if(!perks[key]) perks[key]={key,name:pretty(p.icon)||p.name,desc:"",icon:"",hasVar:!!p.effect,varLabel:"Effect",vars:[]};
    if(p.effect && !perks[key].vars.includes(p.effect)) perks[key].vars.push(p.effect);
  });
  trees[car.id]={cells,vals};
  report.push(`${title}  ->  ${car[0]} ${car[1]} ${car[2]} [${score.toFixed(2)}]  (${Object.keys(cells).length} perks)`);
}

const out={perks:Object.values(perks),trees};
fs.writeFileSync("fhgarage-import.json",JSON.stringify(out));
console.log("=== matches ==="); report.forEach(r=>console.log("  "+r));
console.log("cost-rule (row 10/5/3/1, BR=25) holds for all cells:", costOk);
console.log("distinct perk categories:", out.perks.length);
console.log("perk catalog sample:", out.perks.slice(0,6).map(p=>`${p.name}${p.vars.length?" ["+p.vars.join("/")+"]":""}`).join(" | "));
console.log("cars with trees:", Object.keys(trees).length);
console.log("wrote fhgarage-import.json ("+fs.statSync("fhgarage-import.json").size+" bytes)");
