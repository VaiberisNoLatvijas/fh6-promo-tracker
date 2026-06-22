// FH6 Horizon Promo Tracker - auto-split from index.html.
// Classic scripts share top-level const/let bindings; load order (cars-data -> mastery-data -> app) matters.

// Attach a stable id + tag to each car
CARS.forEach(c => {
  c.id = (c[1]+"|"+c[0]+"|"+c[2]).toLowerCase();
  c.tag = (typeof c[4] === "string") ? c[4] : ""; // "barn" | "fe" | ""
});

let done = loadDone();
let owned = loadOwned();
let activeClass = "ALL";
let query = "";
let hideFEFlag = false;
let photoFilter = "all";   // all | yes | no
let ownFilter = "all";     // all | yes | no
let groupMode = "maker";   // class | maker | year | country  (default: maker, like the game)
let dir = "asc";           // asc | desc

function loadDone(){
  try{
    const s=localStorage.getItem(STORE_KEY);
    if(s===null) return new Set(PRESET_PHOTO); // seed from screenshots on first run
    return new Set(JSON.parse(s));
  }catch(e){ return new Set(); }
}
function saveDone(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify([...done])); }catch(e){} }
function loadOwned(){
  try{
    const s=localStorage.getItem(OWN_KEY);
    if(s===null) return new Set(PRESET_OWNED); // seed from screenshots on first run
    return new Set(JSON.parse(s));
  }catch(e){ return new Set(); }
}
function saveOwned(){ try{ localStorage.setItem(OWN_KEY, JSON.stringify([...owned])); }catch(e){} }
let _custom=null;
function loadCustom(){
  if(_custom===null){ try{ const c=JSON.parse(localStorage.getItem(CUSTOM_KEY)||"{}"); _custom={add:c.add||[], edit:c.edit||{}, del:c.del||[]}; }catch(e){ _custom={add:[], edit:{}, del:[]}; } }
  return _custom;
}
function saveCustom(c){ _custom=c; try{ localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)); }catch(e){} }

// LIST = built-in CARS with edits applied + user-added cars, minus hidden ones.
// Each item is [year,maker,model,class] plus .id (stable), .tag, .co (country), .custom.
let LIST=[];
function buildList(){
  const cu=loadCustom(), editMap=cu.edit, del=new Set(cu.del);
  LIST=[];
  CARS.forEach(c=>{
    if(del.has(c.id)) return;
    const e=editMap[c.id];
    const a=[ e?e.y:c[0], e?e.mk:c[1], e?e.md:c[2], e?e.cl:c[3] ];
    a.id=c.id; a.tag=e?(e.tag||""):c.tag; a.co=e?(e.co||COUNTRY[e.mk]||"Other"):(COUNTRY[c[1]]||"Other"); a.custom=false;
    LIST.push(a);
  });
  cu.add.forEach(x=>{
    if(del.has(x.id)) return;
    const a=[x.y,x.mk,x.md,x.cl]; a.id=x.id; a.tag=x.tag||""; a.co=x.co||COUNTRY[x.mk]||"Other"; a.custom=true;
    LIST.push(a);
  });
}

// ---- car config (rarity / flags / price / name) + images ----
const CARCFG_KEY="fh6_carcfg_v1", FLAGS_KEY="fh6_flags_v1";
let _cfg=null;
function loadCfg(){ if(_cfg===null){ try{ _cfg=JSON.parse(localStorage.getItem(CARCFG_KEY))||{}; }catch(e){ _cfg={}; } } return _cfg; }
function saveCfg(o){ _cfg=o; try{ localStorage.setItem(CARCFG_KEY,JSON.stringify(o)); }catch(e){} }
// merge baked-in static data (PI/rarity/stats) with the user's stored edits (stored wins)
function carCfg(id){ const s=loadCfg()[id], p=PRESET_CFG[id]; return (s&&p)?Object.assign({},p,s):(s||p||{}); }
const FLAG_SEED=[{key:"barn",label:"Barn Find",color:"#ffb86b"},{key:"treasure",label:"Treasure",color:"#7fe0b0"},{key:"fe",label:"Forza Edition",color:"#c9a6ff"},{key:"dlc",label:"DLC",color:"#6fb1ff"},{key:"mastery",label:"Mastery-locked",color:"#ff9bd0"}];
let _flags=null;
function loadFlags(){ if(_flags===null){ try{ const f=JSON.parse(localStorage.getItem(FLAGS_KEY)); _flags=Array.isArray(f)&&f.length?f:FLAG_SEED.slice(); }catch(e){ _flags=FLAG_SEED.slice(); } } return _flags; }
function saveFlags(f){ _flags=f; try{ localStorage.setItem(FLAGS_KEY,JSON.stringify(f)); }catch(e){} }
function flagBy(k){ return loadFlags().find(f=>f.key===k); }
const RARITY=[{key:"common",label:"Common",color:"#36d399"},{key:"rare",label:"Rare",color:"#6fb1ff"},{key:"epic",label:"Epic",color:"#c77dff"},{key:"legendary",label:"Legendary",color:"#ff9d3c"}];
function rarityBy(k){ return RARITY.find(r=>r.key===k); }
function carFlags(c){ const cf=carCfg(c.id); if(cf.flags&&cf.flags.length) return cf.flags; return c.tag?[c.tag]:[]; }
function fmtCr(n){ return (+n).toLocaleString("en-US"); }
// images live in IndexedDB (too big for localStorage)
let IMAGES={}, IMGDB=null;
function idbOpen(cb){ try{ const rq=indexedDB.open("fh6img",1); rq.onupgradeneeded=()=>rq.result.createObjectStore("images"); rq.onsuccess=()=>{IMGDB=rq.result;cb&&cb();}; rq.onerror=()=>{cb&&cb();}; }catch(e){ cb&&cb(); } }
function idbPutImg(id,d){ if(!IMGDB)return; try{ IMGDB.transaction("images","readwrite").objectStore("images").put(d,id); }catch(e){} }
function idbDelImg(id){ if(!IMGDB)return; try{ IMGDB.transaction("images","readwrite").objectStore("images").delete(id); }catch(e){} }
function idbAllImgs(cb){ if(!IMGDB){cb({});return;} try{ const out={},rq=IMGDB.transaction("images","readonly").objectStore("images").openCursor(); rq.onsuccess=()=>{const c=rq.result; if(c){out[c.key]=c.value;c.continue();}else cb(out);}; rq.onerror=()=>cb(out); }catch(e){ cb({}); } }

const $ = s => document.querySelector(s);
const listEl = $("#list");

function classCounts(){
  const tot={}, dn={};
  CLASS_ORDER.forEach(c=>{tot[c]=0;dn[c]=0;});
  LIST.forEach(c=>{ if(hideFEFlag && c.tag==="fe") return; tot[c[3]]=(tot[c[3]]||0)+1; if(done.has(c.id)) dn[c[3]]=(dn[c[3]]||0)+1; });
  return {tot,dn};
}

function baseCars(){ return hideFEFlag ? LIST.filter(c=>c.tag!=="fe") : LIST; }

function renderChips(){
  const {tot,dn}=classCounts();
  const base=baseCars();
  const allDone=base.filter(c=>done.has(c.id)).length;
  const chips=[["ALL","All",base.length,allDone]];
  CLASS_ORDER.forEach(c=>chips.push([c,c,tot[c],dn[c]]));
  $("#chips").innerHTML = chips.map(([k,lbl,t,d])=>
    `<button class="chip ${activeClass===k?'active':''}" data-c="${k}">${lbl}<span class="n">${d}/${t}</span></button>`
  ).join("");
  $("#chips").querySelectorAll(".chip").forEach(b=>{
    b.onclick=()=>{ activeClass=b.dataset.c; renderChips(); renderList(); };
  });
}

function renderProgress(){
  const base=baseCars();
  const total=base.length;
  const d=base.filter(c=>done.has(c.id)).length;
  const o=base.filter(c=>owned.has(c.id)).length;
  const pct = total? Math.round(d/total*100):0;
  $("#photoN").textContent=d; $("#photoT").textContent=total;
  $("#ownN").textContent=o;   $("#ownT").textContent=total;
  $("#progBar").style.width = pct+"%";
}

const FILTERS=[
  {key:"photo",label:"Shot",opts:[["all","All"],["yes","Yes"],["no","No"]]},
  {key:"own",label:"Owned",opts:[["all","All"],["yes","Yes"],["no","No"]]},
];
function renderFchips(){
  let h="";
  FILTERS.forEach((f,i)=>{
    if(i) h+=`<span class="fsep"></span>`;
    h+=`<span class="flabel">${f.label}</span>`;
    const cur = f.key==="photo"?photoFilter:ownFilter;
    f.opts.forEach(([v,lbl])=>{
      h+=`<button class="fchip ${cur===v?'active':''}" data-f="${f.key}" data-v="${v}">${lbl}</button>`;
    });
  });
  const el=$("#fchips"); el.innerHTML=h;
  el.querySelectorAll(".fchip").forEach(b=>{
    b.onclick=()=>{
      if(b.dataset.f==="photo") photoFilter=b.dataset.v; else ownFilter=b.dataset.v;
      renderFchips(); renderList();
    };
  });
}

const GROUPS=[["class","Class"],["maker","Maker"],["year","Year"],["country","Country"]];
function renderGchips(){
  let h=`<span class="flabel">Group</span>`;
  GROUPS.forEach(([v,lbl])=>{
    h+=`<button class="fchip ${groupMode===v?'active':''}" data-g="${v}">${lbl}</button>`;
  });
  h+=`<span class="fsep"></span><button class="fchip" data-dir="1">${dir==="asc"?"▲ Asc":"▼ Desc"}</button>`;
  const el=$("#gchips"); el.innerHTML=h;
  el.querySelectorAll("[data-g]").forEach(b=>{ b.onclick=()=>{ groupMode=b.dataset.g; renderGchips(); renderList(); }; });
  el.querySelector("[data-dir]").onclick=()=>{ dir = dir==="asc"?"desc":"asc"; renderGchips(); renderList(); };
}

function matches(c){
  if(hideFEFlag && carFlags(c).includes("fe")) return false;
  if(activeClass!=="ALL" && c[3]!==activeClass) return false;
  if(photoFilter==="yes" && !done.has(c.id)) return false;
  if(photoFilter==="no"  &&  done.has(c.id)) return false;
  if(ownFilter==="yes"   && !owned.has(c.id)) return false;
  if(ownFilter==="no"    &&  owned.has(c.id)) return false;
  if(query){
    const hay=(c[1]+" "+c[2]+" "+c[0]+" "+c[3]).toLowerCase();
    return query.split(/\s+/).every(t=>hay.includes(t));
  }
  return true;
}

function flagBadges(c){
  let h = carFlags(c).map(k=>{ const f=flagBy(k); return f?`<span class="flagb" style="background:${f.color}22;color:${f.color};border:1px solid ${f.color}55">${f.label}</span>`:""; }).join("");
  if(c.custom) h += '<span class="badge custom">Custom</span>';
  return h;
}
function rowHtml(c){
  const on=done.has(c.id), ow=owned.has(c.id), cf=carCfg(c.id);
  const rc=cf.rarity?rarityBy(cf.rarity):null;
  const img=IMAGES[c.id]?`<img class="rthumb" src="${IMAGES[c.id]}" alt="">`:"";
  const nm=cf.name||`${c[1]} ${c[2]}`;
  const accent=rc?`border-left:4px solid ${rc.color};padding-left:9px;`:"";
  return `<div class="row ${on?'done':''}" data-id="${c.id}" style="${accent}">
    <span class="box"><svg viewBox="0 0 24 24" fill="none" stroke="#0b0d12" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg></span>
    ${img}
    <span class="info"><span class="nm">${nm}${flagBadges(c)}</span><span class="sub">${c[0]} · ${c[1]} · Class ${c[3]}${cf.pi?` · PI ${cf.pi}`:""} · ${countryOf(c)}</span></span>
    <button class="edit" title="Edit">Edit</button>
    <button class="own ${ow?'on':''}">${ow?'Owned':'Own'}</button>
  </div>`;
}
function groupKeyOf(c){
  if(groupMode==="class")   return c[3];
  if(groupMode==="maker")   return c[1];
  if(groupMode==="country") return countryOf(c);
  return String(c[0]); // year
}
function groupTitle(k){ return groupMode==="class" ? `Class ${k}` : k; }
function sortWithin(arr){
  arr.sort((a,b)=>{
    if(groupMode==="maker") return b[0]-a[0] || a[2].localeCompare(b[2]);  // year descending within maker
    if(groupMode==="year")  return a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]);
    // class or country: by maker, then year
    return a[1].localeCompare(b[1]) || a[0]-b[0];
  });
}
function renderList(){
  const map=new Map();
  for(const c of LIST){ if(!matches(c)) continue; const k=groupKeyOf(c); (map.get(k)||map.set(k,[]).get(k)).push(c); }

  let keys=[...map.keys()];
  if(groupMode==="class")      keys=CLASS_ORDER.filter(k=>map.has(k));
  else if(groupMode==="year")  keys.sort((a,b)=>(+a)-(+b));
  else                         keys.sort((a,b)=>a.localeCompare(b));
  if(dir==="desc") keys.reverse();

  let html="";
  for(const k of keys){
    const arr=map.get(k); sortWithin(arr);
    const dn=arr.filter(c=>done.has(c.id)).length;
    html+=`<section class="group"><div class="ghead"><h2>${groupTitle(k)}</h2><span class="gcount">${dn}/${arr.length}</span></div><div class="card">`;
    for(const c of arr) html+=rowHtml(c);
    html+=`</div></section>`;
  }
  listEl.innerHTML = html || `<div class="empty">No cars match.<br>Try clearing the search or filter.</div>`;
}

listEl.addEventListener("click", e=>{
  const row=e.target.closest(".row"); if(!row) return;
  const id=row.dataset.id;
  if(e.target.closest(".edit")){ openEdit(id); return; }
  if(e.target.closest(".own")){
    // toggle OWNED
    if(owned.has(id)) owned.delete(id); else owned.add(id);
    saveOwned();
    const btn=row.querySelector(".own"); btn.classList.toggle("on", owned.has(id));
    renderProgress();
    if(ownFilter!=="all") renderList();
    return;
  }
  // toggle PHOTOGRAPHED
  if(done.has(id)) done.delete(id); else done.add(id);
  saveDone();
  row.classList.toggle("done", done.has(id));
  renderProgress(); renderChips();
  if(photoFilter!=="all") renderList();
});

// search
const searchEl=$("#search");
searchEl.addEventListener("input", ()=>{
  query=searchEl.value.trim().toLowerCase();
  $("#clrBtn").style.display = query? "block":"none";
  renderList();
});
$("#clrBtn").onclick=()=>{ searchEl.value=""; query=""; $("#clrBtn").style.display="none"; renderList(); searchEl.focus(); };

// ---- Menu sheet ----
const scrim=$("#scrim"), sheet=$("#sheet");
function openSheet(){ scrim.classList.add("open"); sheet.classList.add("open"); }
function closeSheet(){ scrim.classList.remove("open"); sheet.classList.remove("open"); showMenu(); }
$("#menuBtn").onclick=openSheet;
scrim.onclick=closeSheet;
$("#gMenuBtn").onclick=openSheet; $("#mMenuBtn").onclick=openSheet;
document.querySelectorAll(".sheetx").forEach(b=>{ b.onclick=()=>({sheet:closeSheet,pk:closePk,pc:closePC,fl:closeFL}[b.dataset.close]||function(){})(); });

function showMenu(){ $("#sheetMain").style.display="block"; $("#sheetIO").style.display="none"; $("#sheetEdit").style.display="none"; $("#sheetAbout").style.display="none"; $("#sheetTheme").style.display="none"; }
function showIO(){ $("#sheetMain").style.display="none"; $("#sheetIO").style.display="block"; $("#sheetEdit").style.display="none"; $("#sheetAbout").style.display="none"; $("#sheetTheme").style.display="none"; }
function showEdit(){ $("#sheetMain").style.display="none"; $("#sheetIO").style.display="none"; $("#sheetEdit").style.display="block"; $("#sheetAbout").style.display="none"; $("#sheetTheme").style.display="none"; }
$("#aboutBtn").onclick=()=>{ $("#sheetMain").style.display="none"; $("#sheetAbout").style.display="block"; };
$("#aboutBack").onclick=showMenu;

// ---- Add / edit cars (Car Config) ----
(function initEditForm(){
  $("#edCl").innerHTML = CLASS_ORDER.map(c=>`<option value="${c}">${c}</option>`).join("");
  $("#coList").innerHTML = [...new Set(Object.values(COUNTRY))].sort().map(c=>`<option value="${c}">`).join("");
  $("#edRarity").innerHTML = `<option value="">None</option>`+RARITY.map(r=>`<option value="${r.key}">${r.label}</option>`).join("");
})();
let editId=null, edImgState={changed:false,data:null};
function buildFlagChecks(sel){
  $("#edFlags").innerHTML = loadFlags().map(f=>`<label><input type="checkbox" value="${f.key}" ${sel.includes(f.key)?"checked":""}><span class="rdot" style="background:${f.color}"></span>${f.label}</label>`).join("");
}
function selectedFlags(){ return [...$("#edFlags").querySelectorAll("input:checked")].map(i=>i.value); }
function showEdImg(d){ const el=$("#edImgPrev"); if(d){ el.src=d; el.style.display="block"; } else { el.removeAttribute("src"); el.style.display="none"; } }
function updateDisc(){ const v=parseInt($("#edPrice").value,10); $("#edDisc").innerHTML = v>0 ? `With 5% home discount: <b style="color:var(--good)">${fmtCr(Math.round(v*0.95))}</b> CR` : ""; }
function resizeImg(file,max,cb){ const fr=new FileReader(); fr.onload=()=>{ const im=new Image(); im.onload=()=>{ const s=Math.min(1,max/Math.max(im.width,im.height)); const cw=Math.max(1,Math.round(im.width*s)),ch=Math.max(1,Math.round(im.height*s)); const cv=document.createElement("canvas"); cv.width=cw; cv.height=ch; cv.getContext("2d").drawImage(im,0,0,cw,ch); try{ cb(cv.toDataURL("image/jpeg",0.82)); }catch(e){ cb(fr.result); } }; im.onerror=()=>cb(fr.result); im.src=fr.result; }; fr.readAsDataURL(file); }
$("#edImg").onchange=e=>{ const f=e.target.files[0]; if(!f)return; resizeImg(f,280,d=>{ edImgState={changed:true,data:d}; showEdImg(d); }); };
$("#edImgClear").onclick=()=>{ edImgState={changed:true,data:null}; showEdImg(null); $("#edImg").value=""; };
$("#edPrice").oninput=updateDisc;
function openEdit(id){
  const c=LIST.find(x=>x.id===id); if(!c) return;
  editId=id; const cf=carCfg(id);
  $("#editTitle").textContent="Edit car";
  $("#edY").value=c[0]; $("#edMk").value=c[1]; $("#edMd").value=c[2]; $("#edCl").value=c[3]; $("#edCo").value=countryOf(c);
  $("#edName").value=cf.name||""; $("#edRarity").value=cf.rarity||""; $("#edPrice").value=(cf.price!=null?cf.price:"");
  $("#edPI").value=cf.pi!=null?cf.pi:""; $("#edPower").value=cf.power!=null?cf.power:""; $("#edSpeed").value=cf.speed!=null?cf.speed:""; $("#edWeight").value=cf.weight!=null?cf.weight:""; $("#edDrive").value=cf.drive||"";
  buildFlagChecks(carFlags(c)); updateDisc();
  edImgState={changed:false,data:null}; showEdImg(IMAGES[id]||null); $("#edImg").value="";
  $("#edDelete").style.display="flex"; $("#edOpenTree").style.display="flex";
  openSheet(); showEdit();
}
function openAdd(){
  editId=null;
  $("#editTitle").textContent="Add a car";
  $("#edY").value=""; $("#edMk").value=""; $("#edMd").value=""; $("#edCl").value="A"; $("#edCo").value="";
  $("#edName").value=""; $("#edRarity").value=""; $("#edPrice").value="";
  $("#edPI").value=""; $("#edPower").value=""; $("#edSpeed").value=""; $("#edWeight").value=""; $("#edDrive").value="";
  buildFlagChecks([]); updateDisc();
  edImgState={changed:false,data:null}; showEdImg(null); $("#edImg").value="";
  $("#edDelete").style.display="none"; $("#edOpenTree").style.display="none";
  openSheet(); showEdit();
}
$("#edCancel").onclick=showMenu;
$("#edOpenTree").onclick=()=>{ if(editId==null)return; const id=editId; closeSheet(); switchTab("mastery"); openCarTree(id); };
$("#edSave").onclick=()=>{
  const y=parseInt($("#edY").value,10), mk=$("#edMk").value.trim(), md=$("#edMd").value.trim();
  const cl=$("#edCl").value, co=$("#edCo").value.trim()||"Other";
  if(!mk||!md||!y){ alert("Please fill in year, manufacturer and model."); return; }
  const cu=loadCustom(); let id=editId;
  if(editId===null){ id="x"+Date.now().toString(36)+Math.floor(Math.random()*1e4); cu.add.push({id,y,mk,md,cl,co,tag:""}); }
  else { const a=cu.add.find(z=>z.id===editId); if(a) Object.assign(a,{y,mk,md,cl,co}); else cu.edit[editId]={y,mk,md,cl,co}; }
  saveCustom(cu);
  const cfg=loadCfg(); const name=$("#edName").value.trim(), rarity=$("#edRarity").value, price=parseInt($("#edPrice").value,10), fl=selectedFlags();
  const pi=parseInt($("#edPI").value,10), power=parseInt($("#edPower").value,10), speed=parseInt($("#edSpeed").value,10), weight=parseInt($("#edWeight").value,10), drive=$("#edDrive").value;
  const rec={}; if(name)rec.name=name; if(rarity)rec.rarity=rarity; if(fl.length)rec.flags=fl; if(price>0)rec.price=price;
  if(pi>0)rec.pi=pi; if(power>0)rec.power=power; if(speed>0)rec.speed=speed; if(weight>0)rec.weight=weight; if(drive)rec.drive=drive;
  if(Object.keys(rec).length) cfg[id]=rec; else delete cfg[id];
  saveCfg(cfg);
  if(edImgState.changed){ if(edImgState.data){ IMAGES[id]=edImgState.data; idbPutImg(id,edImgState.data); } else { delete IMAGES[id]; idbDelImg(id); } }
  buildList(); renderAll(); if(!$("#viewGarage").hidden) renderGarage(); closeSheet();
};
$("#edDelete").onclick=()=>{
  if(editId===null) return;
  if(!confirm("Remove this car from the tracker?")) return;
  const cu=loadCustom(); const i=cu.add.findIndex(z=>z.id===editId);
  if(i>=0) cu.add.splice(i,1); else if(!cu.del.includes(editId)) cu.del.push(editId);
  owned.delete(editId); done.delete(editId); saveOwned(); saveDone();
  const cfg=loadCfg(); delete cfg[editId]; saveCfg(cfg);
  delete IMAGES[editId]; idbDelImg(editId);
  saveCustom(cu); buildList(); renderAll(); if(!$("#viewGarage").hidden) renderGarage(); closeSheet();
};

// ---- flags manager ----
let flEditKey=null;
function openFL(){ flShowList(); $("#flScrim").classList.add("open"); $("#flSheet").classList.add("open"); }
function closeFL(){ $("#flScrim").classList.remove("open"); $("#flSheet").classList.remove("open"); }
$("#flScrim").onclick=closeFL; $("#edFlagsManage").onclick=openFL; $("#flClose").onclick=closeFL;
function flShowList(){
  $("#flListView").style.display="block"; $("#flEditView").style.display="none";
  $("#flItems").innerHTML=loadFlags().map(f=>`<div class="perkitem" data-k="${f.key}"><span class="rdot" style="background:${f.color}"></span><span class="pn"><b>${f.label}</b></span><span style="color:var(--muted);font-size:12px">Edit</span></div>`).join("");
  $("#flItems").querySelectorAll(".perkitem").forEach(el=>el.onclick=()=>flEdit(el.dataset.k));
}
function flPrevUpdate(){ const col=$("#flColor").value, el=$("#flPrev"); el.style.background=col+"22"; el.style.color=col; el.style.border="1px solid "+col+"55"; el.textContent=$("#flLabel").value||"Preview"; }
function flEdit(key){ flEditKey=key; const f=key?flagBy(key):null;
  $("#flEditTitle").textContent=key?"Edit flag":"Add flag";
  $("#flLabel").value=f?f.label:""; $("#flColor").value=f?f.color:"#7c5cff"; flPrevUpdate();
  $("#flDel").style.display=key?"flex":"none";
  $("#flListView").style.display="none"; $("#flEditView").style.display="block";
}
$("#flColor").oninput=flPrevUpdate; $("#flLabel").oninput=flPrevUpdate;
$("#flAdd").onclick=()=>flEdit(null); $("#flBack").onclick=flShowList;
$("#flSave").onclick=()=>{ const label=$("#flLabel").value.trim(); if(!label){alert("Give the flag a label.");return;} const color=$("#flColor").value; const flags=loadFlags();
  if(flEditKey){ const f=flags.find(x=>x.key===flEditKey); if(f){f.label=label;f.color=color;} }
  else { flags.push({key:"f"+Date.now().toString(36),label,color}); }
  saveFlags(flags); flShowList(); buildFlagChecks(selectedFlags()); renderAll(); if(!$("#viewGarage").hidden)renderGarage();
};
$("#flDel").onclick=()=>{ if(!flEditKey)return; if(!confirm("Delete this flag?"))return; saveFlags(loadFlags().filter(f=>f.key!==flEditKey)); flShowList(); buildFlagChecks(selectedFlags()); renderAll(); };

$("#syncOwned").onclick=()=>{
  if(!PRESET_OWNED.length && !PRESET_PHOTO.length){ alert("No screenshot data is built in yet."); return; }
  if(confirm("Apply the latest screenshot data?\n\nOwned: "+PRESET_OWNED.length+" cars\nPhotographed: "+PRESET_PHOTO.length+" cars\n\nThis REPLACES your current owned and photographed marks.")){
    owned=new Set(PRESET_OWNED); done=new Set(PRESET_PHOTO);
    saveOwned(); saveDone(); renderAll(); closeSheet();
  }
};
$("#hideFE").onclick=()=>{
  hideFEFlag=!hideFEFlag;
  $("#feState").textContent = hideFEFlag? "Currently hiding Forza Editions etc.":"Currently showing Forza Editions etc.";
  renderAll(); closeSheet();
};

let ioMode="export";
$("#doExport").onclick=()=>{
  ioMode="export";
  $("#ioTitle").textContent="Export backup";
  $("#ioDesc").textContent="Copy this text and save it somewhere safe (Notes, email). It backs up everything — progress, custom cars, config, perks, trees and images. Paste it back later to restore.";
  $("#ioBox").value="Gathering data…";
  idbAllImgs(images=>{ $("#ioBox").value=JSON.stringify({photo:[...done],owned:[...owned],custom:loadCustom(),perks:loadPerks(),trees:loadTrees(),cfg:loadCfg(),flags:loadFlags(),images}); });
  $("#ioGo").textContent="Copy";
  showIO();
};
$("#doImport").onclick=()=>{
  ioMode="import";
  $("#ioTitle").textContent="Import backup";
  $("#ioDesc").textContent="Paste a previously exported backup here, then tap Restore. This replaces your current progress.";
  $("#ioBox").value="";
  $("#ioGo").textContent="Restore";
  showIO();
};
$("#ioBack").onclick=showMenu;
$("#ioGo").onclick=()=>{
  if(ioMode==="export"){
    const box=$("#ioBox"); box.select();
    try{ navigator.clipboard.writeText(box.value); }catch(e){}
    try{ document.execCommand("copy"); }catch(e){}
    $("#ioGo").textContent="Copied ✓";
    setTimeout(()=>{$("#ioGo").textContent="Copy";},1200);
  } else {
    try{
      const data=JSON.parse($("#ioBox").value.trim());
      if(Array.isArray(data)){            // legacy backup = photographed only
        done=new Set(data);
      } else if(data && typeof data==="object"){
        done=new Set(data.photo||[]);
        owned=new Set(data.owned||[]);
      } else throw 0;
      if(data && data.custom){ saveCustom({add:data.custom.add||[], edit:data.custom.edit||{}, del:data.custom.del||[]}); buildList(); }
      if(data && data.perks){ savePerks(data.perks); }
      if(data && data.trees){ saveTrees(data.trees); }
      if(data && data.cfg){ saveCfg(data.cfg); }
      if(data && data.flags){ saveFlags(data.flags); }
      if(data && data.images){ IMAGES=data.images; Object.keys(data.images).forEach(id=>idbPutImg(id,data.images[id])); }
      saveDone(); saveOwned();
      renderAll(); closeSheet();
    }catch(e){ alert("That doesn't look like a valid backup."); }
  }
};
$("#doReset").onclick=()=>{
  if(confirm("Uncheck every PHOTOGRAPHED car? Owned marks are kept. This can't be undone (unless you have a backup).")){
    done=new Set(); saveDone(); renderAll(); closeSheet();
  }
};

function renderAll(){ renderChips(); renderFchips(); renderGchips(); renderProgress(); renderList(); }

/* ============================ MASTERY ============================ */
const PERKS_KEY="fh6_perks_v1", TREES_KEY="fh6_trees_v1";
const PERK_SEED=[
  {key:"xp",name:"Instant XP",desc:"",icon:"⭐",hasVar:true,varLabel:"XP",vars:["5000","10000"]},
  {key:"credits",name:"Credits",desc:"",icon:"💰",hasVar:true,varLabel:"Credits",vars:[]},
  {key:"wheelspin",name:"Wheelspin",desc:"",icon:"🎡"},
  {key:"superws",name:"Super Wheelspin",desc:"",icon:"🎰"},
  {key:"skillmult",name:"Skill Multiplier",desc:"",icon:"✖️",hasVar:true,varLabel:"Multiplier",vars:["6","7","8","9","10"]},
  {key:"skillpts",name:"Skill Points",desc:"",icon:"🔧"},
  {key:"drift",name:"Drift Skill",desc:"",icon:"🌀"},
  {key:"speed",name:"Speed Skill",desc:"",icon:"⚡"},
  {key:"wreck",name:"Wreckage Skill",desc:"",icon:"💥"},
  {key:"second_life",name:"Second Life",desc:"Skill chains survive extra crashes. Always bottom-right, 25 pts.",icon:"😇"},
];
let _perks=null;
const _presetPerkKeys = new Set(PRESET_PERKS.map(p=>p.key));
const _isImgIcon = v => /^data:|^https?:/.test(v||"");
function loadPerks(){
  if(_perks===null){
    let stored=null; try{ stored=JSON.parse(localStorage.getItem(PERKS_KEY)); }catch(e){}
    if(!Array.isArray(stored)) stored=[];
    if(PRESET_PERKS.length){
      const by={}; PRESET_PERKS.forEach(p=>by[p.key]=Object.assign({},p)); // preset = source of truth (incl. hardcoded icon)
      stored.forEach(s=>{
        const base=by[s.key];
        if(base){
          // Known/preset perk: merge stored edits (name/desc/vars) but NEVER let a stored icon clobber the hardcoded one.
          // A local upload override lives in `iconOverride`; migrate any legacy stored image-icon into it.
          const ov = s.iconOverride || (_isImgIcon(s.icon) ? s.icon : null);
          const merged = Object.assign({}, base, s);
          merged.icon = ov || base.icon;        // hardcoded preset icon unless a local override exists
          if(ov) merged.iconOverride = ov; else delete merged.iconOverride;
          by[s.key]=merged;
        } else {
          by[s.key]=Object.assign({},s);        // user-created custom perk: keep its own icon
        }
      });
      _perks=Object.values(by);
    }
    else { _perks=stored.length?stored:PERK_SEED.slice(); }
  }
  return _perks;
}
function savePerks(p){
  _perks=p;
  // For preset perks, persist only `iconOverride` (if any) - the base icon is hardcoded in PRESET_PERKS.
  const out=p.map(perk=>{
    const c=Object.assign({},perk);
    if(_presetPerkKeys.has(c.key)) delete c.icon;
    return c;
  });
  try{ localStorage.setItem(PERKS_KEY, JSON.stringify(out)); }catch(e){}
}
function perkBy(k){ return loadPerks().find(p=>p.key===k); }
let _trees=null;
function loadTrees(){ if(_trees===null){ try{ _trees=JSON.parse(localStorage.getItem(TREES_KEY))||{}; }catch(e){ _trees={}; } } return _trees; }
function saveTrees(t){ _trees=t; try{ localStorage.setItem(TREES_KEY, JSON.stringify(t)); }catch(e){} }
function getTree(id){
  const t=loadTrees()[id]; if(t) return {cells:t.cells||{},vals:t.vals||{},costs:t.costs||{}};
  const p=PRESET_TREES[id]; if(p) return {cells:Object.assign({},p.cells||{}),vals:Object.assign({},p.vals||{}),costs:Object.assign({},p.costs||{})};
  return {cells:{},vals:{},costs:{}};
}
function putTree(id,tree){ const all=loadTrees(); all[id]=tree; saveTrees(all); }

function perkIcon(p,big){
  if(!p) return '<span class="'+(big?'pic':'emoji')+'">❔</span>';
  if(/^data:|^https?:/.test(p.icon||"")) return '<img src="'+p.icon+'" alt="">';
  return '<span class="'+(big?'pic':'emoji')+'">'+(p.icon||"❔")+'</span>';
}
const ROW_COST=[10,5,3,1]; // by visual row: top(0)=10, then 5, 3, bottom(3)=1
function nodeCost(pos){ return pos===15 ? 25 : ROW_COST[Math.floor(pos/4)]; }
// explicit per-cell cost overrides (forzagarage has ~6 cars that break the row rule); else row rule
function costOf(tree,pos){ return (tree && tree.costs && tree.costs[pos]!=null) ? tree.costs[pos] : nodeCost(pos); }
// Start is always the bottom-left-most filled node.
function startPos(tree){
  let best=null;
  for(let pos=0;pos<16;pos++){ if(tree.cells[pos]==null) continue; const r=Math.floor(pos/4),c=pos%4;
    if(best==null || r>best.r || (r===best.r && c<best.c)) best={pos,r,c}; }
  return best? best.pos : null;
}
function ekey(a,b){ return a<b? a+"_"+b : b+"_"+a; }
function neighbors(pos){ const r=Math.floor(pos/4),c=pos%4,o=[]; if(c>0)o.push(pos-1); if(c<3)o.push(pos+1); if(r>0)o.push(pos-4); if(r<3)o.push(pos+4); return o; }
function cheapestPath(tree,target){
  if(tree.cells[target]==null) return null;
  const filled=p=>tree.cells[p]!=null;
  const adj={}; for(let p=0;p<16;p++){ if(filled(p)) adj[p]=neighbors(p).filter(filled); } // auto: adjacent filled cells are connected
  const sp=startPos(tree); const entries = sp!=null ? [sp] : [];
  const dist={},prev={},seen={}; const pq=[];
  entries.forEach(e=>{ dist[e]=costOf(tree,e); pq.push(e); });
  while(pq.length){
    pq.sort((a,b)=>dist[a]-dist[b]); const u=pq.shift();
    if(seen[u])continue; seen[u]=1;
    (adj[u]||[]).forEach(v=>{ const nd=dist[u]+costOf(tree,v); if(dist[v]==null||nd<dist[v]){ dist[v]=nd; prev[v]=u; pq.push(v); } });
  }
  if(dist[target]==null) return null;
  const path=[]; let c=target; while(c!=null){ path.unshift(c); c=(c in prev)?prev[c]:null; }
  return {cost:dist[target], path};
}

// --- tab switching ---
function switchTab(t){
  document.querySelectorAll(".tabbar button").forEach(x=>x.classList.toggle("active",x.dataset.tab===t));
  $("#viewTracker").hidden=t!=="tracker"; $("#viewGarage").hidden=t!=="garage"; $("#viewMastery").hidden=t!=="mastery";
  if(t==="mastery") renderMList();
  if(t==="garage") renderGarage();
}
document.querySelectorAll(".tabbar button").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));

// --- garage list ---
let gquery="";
const gSearch=$("#gsearch");
gSearch.addEventListener("input",()=>{ gquery=gSearch.value.trim().toLowerCase(); $("#gclr").style.display=gquery?"block":"none"; renderGarage(); });
$("#gclr").onclick=()=>{ gSearch.value=""; gquery=""; $("#gclr").style.display="none"; renderGarage(); };
$("#gAdd").onclick=()=>openAdd();
function hasTree(id){ return !!(loadTrees()[id]||PRESET_TREES[id]); }
// shared car-list row used by both Garage and Mastery (rarity line, image, name, tree indicator)
function carRowHtml(c){
  const cf=carCfg(c.id), rc=cf.rarity?rarityBy(cf.rarity):null;
  const img=IMAGES[c.id]?`<img class="rthumb" src="${IMAGES[c.id]}">`:`<span class="rthumb"></span>`;
  const nm=cf.name||`${c[1]} ${c[2]}`;
  const price=cf.price>0?`<span class="gprice">${fmtCr(cf.price)}<small>${fmtCr(Math.round(cf.price*0.95))} −5%</small></span>`:"";
  const tag=`<span class="mtag ${hasTree(c.id)?'has':'no'}">${hasTree(c.id)?'tree':'no tree'}</span>`;
  const accent=rc?`border-left:4px solid ${rc.color};padding-left:8px;`:"";
  return `<div class="grow" data-id="${c.id}" style="${accent}">${img}<div style="flex:1;min-width:0"><div class="gnm">${nm}</div><div class="gsub">${c[0]} · Class ${c[3]}${cf.pi?` · PI ${cf.pi}`:""} · ${countryOf(c)}</div></div>${price}${tag}</div>`;
}
function carListMatch(c,q){ return ((carCfg(c.id).name||"")+" "+c[1]+" "+c[2]+" "+c[0]).toLowerCase().includes(q); }
function renderGarage(){
  const cars=(gquery?LIST.filter(c=>carListMatch(c,gquery)):LIST.slice()).sort((a,b)=>a[1].localeCompare(b[1])||b[0]-a[0]);
  $("#glist").innerHTML = cars.length? cars.map(carRowHtml).join("") : `<div class="empty">No cars match.</div>`;
  $("#glist").querySelectorAll(".grow").forEach(el=>el.onclick=()=>openEdit(el.dataset.id));
}

// --- mastery car list (same unified list; tapping opens the tree) ---
let mquery="", masteryCar=null, editMode=false, curTarget=null, pickPos=null;
const mSearch=$("#msearch");
mSearch.addEventListener("input",()=>{ mquery=mSearch.value.trim().toLowerCase(); $("#mclr").style.display=mquery?"block":"none"; renderMList(); });
$("#mclr").onclick=()=>{ mSearch.value=""; mquery=""; $("#mclr").style.display="none"; renderMList(); };
function renderMList(){
  $("#treewrap").hidden=true; $("#mlist").style.display="block"; $("#mSearchWrap").style.display="block"; $("#mTitle").textContent="Car Mastery";
  const cars=(mquery?LIST.filter(c=>carListMatch(c,mquery)):LIST.slice()).sort((a,b)=>a[1].localeCompare(b[1])||b[0]-a[0]);
  $("#mlist").innerHTML = cars.length? cars.map(carRowHtml).join("") : `<div class="empty">No cars match.</div>`;
  $("#mlist").querySelectorAll(".grow").forEach(el=>el.onclick=()=>openCarTree(el.dataset.id));
}
function openCarTree(id){
  masteryCar=id; curTarget=null; editMode=false;
  $("#mlist").style.display="none"; $("#mSearchWrap").style.display="none"; $("#treewrap").hidden=false;
  const c=LIST.find(x=>x.id===id); $("#mTitle").textContent = c?`${c[1]} ${c[2]}`:"Tree";
  renderTree();
}
const CX=p=>(p%4)*26.333+10.5, CY=p=>Math.floor(p/4)*26.333+10.5;
function renderTree(){
  const tree=getTree(masteryCar);
  let pathSet=new Set(), pathEdges=new Set(), info;
  if(curTarget!=null){
    const r=cheapestPath(tree,curTarget);
    if(r){ pathSet=new Set(r.path); for(let i=0;i<r.path.length-1;i++) pathEdges.add(ekey(r.path[i],r.path[i+1])); const p=perkBy(tree.cells[curTarget]);
      info=`<div class="treeinfo"><h4>${p?p.name:"Perk"}${tree.vals[curTarget]!=null?` — ${tree.vals[curTarget]}`:""}</h4><div class="pts">Cheapest path: <b>${r.cost} pts</b> · ${r.path.length} perk${r.path.length>1?"s":""}${p&&p.desc?"<br>"+p.desc:""}</div></div>`;
    } else info=`<div class="treeinfo"><div class="pts">No connected path to that perk yet — link it up in Edit mode.</div></div>`;
  } else {
    info=`<div class="treeinfo"><div class="pts">${editMode?"Tap a cell to set or clear its perk. Connections to neighbours are automatic. Start = bottom-left (green ring).":"Tap a perk to see the cheapest point path from the bottom-left start."}</div></div>`;
  }
  // grid cells
  let cells="";
  for(let pos=0;pos<16;pos++){
    const key=tree.cells[pos], p=key?perkBy(key):null, val=tree.vals[pos];
    let cls="gcell"+(p?"":" empty")+(pathSet.has(pos)?" on":"")+(pos===curTarget?" tgt":"")+(startPos(tree)===pos?" start":"");
    const inner = p ? perkIcon(p)+(val!=null?`<span class="val">${val}</span>`:"")+`<span class="cost">${costOf(tree,pos)}</span>` : (editMode?'<span class="emoji" style="color:var(--muted)">＋</span>':"");
    cells+=`<div class="${cls}" style="left:${CX(pos)-10.5}%;top:${CY(pos)-10.5}%" data-pos="${pos}">${inner}</div>`;
  }
  // edges are automatic: any two orthogonally-adjacent filled cells are connected
  let lines="";
  const has=p=>tree.cells[p]!=null;
  for(let pos=0;pos<16;pos++){ if(!has(pos))continue; const col=pos%4,row=Math.floor(pos/4);
    if(col<3 && has(pos+1)){ const lit=pathEdges.has(ekey(pos,pos+1)); lines+=`<line class="edgeline${lit?" lit":""}" x1="${CX(pos)}" y1="${CY(pos)}" x2="${CX(pos+1)}" y2="${CY(pos+1)}"/>`; }
    if(row<3 && has(pos+4)){ const lit=pathEdges.has(ekey(pos,pos+4)); lines+=`<line class="edgeline${lit?" lit":""}" x1="${CX(pos)}" y1="${CY(pos)}" x2="${CX(pos+4)}" y2="${CY(pos+4)}"/>`; }
  }
  const filled=Object.keys(tree.cells).length;
  const toolbar=`<div class="toolbar"><button class="backbtn" id="treeBack">← Cars</button><button class="backbtn" id="editToggle">${editMode?"Done editing":"Edit tree"}</button></div>`;
  const gridHtml=`<div class="gwrap"><div class="grid${editMode?" edit":""}">${cells}<svg class="edges" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg></div></div>`;
  $("#treewrap").innerHTML = (editMode||filled>0)
    ? toolbar + gridHtml + info
    : toolbar + `<div class="treeinfo"><div class="pts">No mastery tree for this car yet. Tap “Edit tree” to add perks.</div></div>`;
  $("#treeBack").onclick=renderMList;
  $("#editToggle").onclick=()=>{ editMode=!editMode; curTarget=null; renderTree(); };
  $("#treewrap").querySelectorAll(".gcell").forEach(el=>el.onclick=()=>cellTap(+el.dataset.pos));
}
function cellTap(pos){
  const tree=getTree(masteryCar);
  if(editMode){ openPicker(pos); return; }
  if(tree.cells[pos]==null) return;          // viewer: only filled cells are targets
  curTarget = (curTarget===pos)? null : pos;
  renderTree();
}
// --- perk picker (assign to a cell, optionally with a value) ---
let pickKey=null;
function openPicker(pos){
  pickPos=pos; const perks=loadPerks();
  $("#pkChoose").style.display="block"; $("#pkValView").style.display="none";
  $("#pkTitle").textContent="Cell "+(pos+1)+" — choose perk";
  $("#pkGrid").innerHTML = perks.map(p=>`<div class="perkopt" data-k="${p.key}">${perkIcon(p,true)}${p.name}</div>`).join("");
  $("#pkGrid").querySelectorAll(".perkopt").forEach(el=>el.onclick=()=>choosePerk(el.dataset.k));
  $("#pkScrim").classList.add("open"); $("#pkSheet").classList.add("open");
}
function choosePerk(key){
  const p=perkBy(key);
  if(p && p.hasVar){ pickKey=key; showValStep(p); }
  else { assignPerk(pickPos,key,null); closePk(); }
}
function showValStep(p){
  const tree=getTree(masteryCar);
  $("#pkValTitle").textContent=p.name;
  $("#pkValLabel").textContent=(p.varLabel||"Value")+":";
  $("#pkValInput").value = (tree.vals[pickPos]!=null)?tree.vals[pickPos]:"";
  const vals=p.vars||[];
  $("#pkValList").innerHTML=vals.map(v=>`<option value="${v}">`).join("");
  $("#pkValChips").innerHTML=vals.map(v=>`<button class="chip" data-v="${v}">${v}</button>`).join("");
  $("#pkValChips").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{ $("#pkValInput").value=b.dataset.v; });
  $("#pkChoose").style.display="none"; $("#pkValView").style.display="block";
}
$("#pkValBack").onclick=()=>{ $("#pkChoose").style.display="block"; $("#pkValView").style.display="none"; };
$("#pkValSave").onclick=()=>{
  const v=$("#pkValInput").value.trim();
  assignPerk(pickPos, pickKey, v||null);
  if(v){ const perks=loadPerks(), p=perks.find(x=>x.key===pickKey); if(p){ p.vars=p.vars||[]; if(!p.vars.map(String).includes(v)){ p.vars.push(v); savePerks(perks); } } }
  closePk();
};
function closePk(){ $("#pkScrim").classList.remove("open"); $("#pkSheet").classList.remove("open"); }
$("#pkScrim").onclick=closePk; $("#pkClose").onclick=closePk;
function assignPerk(pos,key,val){ const t=getTree(masteryCar); t.cells[pos]=key; if(val!=null&&val!=="") t.vals[pos]=val; else delete t.vals[pos]; putTree(masteryCar,t); renderTree(); }
$("#pkClear").onclick=()=>{ const t=getTree(masteryCar); delete t.cells[pickPos]; delete t.vals[pickPos]; putTree(masteryCar,t); closePk(); renderTree(); };

// --- perks catalog ---
let pcEditKey=null;
function openPC(){ pcShowList(); $("#pcScrim").classList.add("open"); $("#pcSheet").classList.add("open"); }
function closePC(){ $("#pcScrim").classList.remove("open"); $("#pcSheet").classList.remove("open"); }
$("#perksBtn").onclick=openPC; $("#pcScrim").onclick=closePC; $("#pcClose").onclick=closePC;
function pcShowList(){
  $("#pcListView").style.display="block"; $("#pcEditView").style.display="none";
  const perks=loadPerks();
  $("#pcItems").innerHTML = perks.map(p=>`<div class="perkitem" data-k="${p.key}">${perkIcon(p,true)}<span class="pn"><b>${p.name}</b><small>${p.desc||"—"}</small></span><span style="color:var(--muted);font-size:12px">Edit</span></div>`).join("");
  $("#pcItems").querySelectorAll(".perkitem").forEach(el=>el.onclick=()=>pcEdit(el.dataset.k));
}
function pcEdit(key){
  pcEditKey=key; const p=key?perkBy(key):null;
  $("#pcEditTitle").textContent = key?"Edit perk":"Add perk";
  $("#pcName").value=p?p.name:""; $("#pcDesc").value=p?p.desc||"":""; $("#pcIcon").value=(p&&!/^data:|^https?:/.test(p.icon||""))?p.icon:""; $("#pcImg").value="";
  $("#pcHasVar").checked=!!(p&&p.hasVar); $("#pcVarLabel").value=(p&&p.varLabel)||""; $("#pcVars").value=(p&&p.vars)?p.vars.join(", "):"";
  $("#pcDel").style.display = key?"flex":"none";
  $("#pcListView").style.display="none"; $("#pcEditView").style.display="block";
}
$("#pcAdd").onclick=()=>pcEdit(null);
$("#pcBack").onclick=pcShowList;
let pcImgData=null;
$("#pcImg").onchange=e=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ pcImgData=r.result; }; r.readAsDataURL(f); };
$("#pcSave").onclick=()=>{
  const name=$("#pcName").value.trim(); if(!name){ alert("Give the perk a name."); return; }
  const perks=loadPerks();
  // An upload, or a typed emoji, becomes a local override; blank = fall back to the hardcoded preset icon.
  const override = pcImgData || $("#pcIcon").value.trim() || null;
  const hasVar=$("#pcHasVar").checked, varLabel=$("#pcVarLabel").value.trim();
  const vars=$("#pcVars").value.split(",").map(s=>s.trim()).filter(Boolean);
  if(pcEditKey){ const p=perks.find(x=>x.key===pcEditKey); if(p){
    p.name=name; p.desc=$("#pcDesc").value.trim(); p.hasVar=hasVar; p.varLabel=varLabel; p.vars=vars;
    if(_presetPerkKeys.has(p.key)){
      const presetIcon=(PRESET_PERKS.find(x=>x.key===p.key)||{}).icon;
      if(override){ p.iconOverride=override; p.icon=override; } else { delete p.iconOverride; p.icon=presetIcon; }
    } else { p.icon=override||"❔"; }
  } }
  else { const key="p"+Date.now().toString(36); perks.push({key,name,desc:$("#pcDesc").value.trim(),icon:override||"❔",hasVar,varLabel,vars}); }
  pcImgData=null; savePerks(perks); pcShowList(); if(!$("#treewrap").hidden) renderTree();
};
$("#pcDel").onclick=()=>{ if(!pcEditKey)return; if(!confirm("Delete this perk type?"))return; savePerks(loadPerks().filter(p=>p.key!==pcEditKey)); pcImgData=null; pcShowList(); };
/* ========================== /MASTERY ========================== */

// ---- themes ----
const THEME_KEY="fh6_theme_v1";
const THEMES=[
  {k:"sumi",name:"Sumi Night",mode:"dark",bg:"#0d1117",grp:"Dark"},
  {k:"sakura-dark",name:"Sakura Night",mode:"dark",bg:"#14121c",grp:"Dark"},
  {k:"racing-dark",name:"Racing",mode:"dark",bg:"#101114",grp:"Dark"},
  {k:"retro-dark",name:"Retro Arcade",mode:"dark",bg:"#160f24",grp:"Dark"},
  {k:"washi",name:"Washi",mode:"light",bg:"#f4efe4",grp:"Light"},
  {k:"sakura-light",name:"Sakura",mode:"light",bg:"#fbeef0",grp:"Light"},
  {k:"racing-light",name:"Racing Light",mode:"light",bg:"#eef0f3",grp:"Light"},
  {k:"retro-light",name:"Retro Light",mode:"light",bg:"#efe7d6",grp:"Light"},
  {k:"hc-dark",name:"High Contrast Dark",mode:"dark",bg:"#000000",grp:"Accessibility"},
  {k:"hc-light",name:"High Contrast Light",mode:"light",bg:"#ffffff",grp:"Accessibility"},
];
let theme; try{ theme=localStorage.getItem(THEME_KEY)||"sumi"; }catch(e){ theme="sumi"; }
if(theme==="dark")theme="sumi"; if(theme==="light")theme="washi";
if(!THEMES.find(t=>t.k===theme)) theme="sumi";
function applyTheme(k){
  const t=THEMES.find(x=>x.k===k)||THEMES[0]; theme=t.k;
  document.documentElement.setAttribute("data-theme",t.k);
  document.documentElement.setAttribute("data-mode",t.mode);
  const m=document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute("content",t.bg);
  const st=$("#themeState"); if(st) st.textContent=t.name;
  try{ localStorage.setItem(THEME_KEY,t.k); }catch(e){}
}
applyTheme(theme);
const THEME_AC={sumi:"#5b7cfa","sakura-dark":"#ec6d8a","racing-dark":"#e2342b","retro-dark":"#ff4fa6",washi:"#324db3","sakura-light":"#c0436a","racing-light":"#d62f27","retro-light":"#c0392b","hc-dark":"#2f9bff","hc-light":"#0040d0"};
function renderThemeList(){
  let h="", grp="";
  THEMES.forEach(t=>{
    if(t.grp!==grp){ grp=t.grp; h+=`<div class="thgrp">${grp}</div>`; }
    h+=`<button class="act thopt" data-k="${t.k}"><span class="thsw" style="background:linear-gradient(135deg,${t.bg} 0 50%,${THEME_AC[t.k]||'#888'} 50% 100%)"></span><span>${t.name}</span>${t.k===theme?'<span style="margin-left:auto;color:var(--good);font-size:18px">●</span>':''}</button>`;
  });
  $("#thList").innerHTML=h;
  $("#thList").querySelectorAll(".thopt").forEach(b=>b.onclick=()=>{ applyTheme(b.dataset.k); renderThemeList(); });
}
$("#themeBtn").onclick=()=>{ renderThemeList(); $("#sheetMain").style.display="none"; $("#sheetTheme").style.display="block"; };
$("#themeBack").onclick=showMenu;

buildList();
renderAll();
idbOpen(()=>{ idbAllImgs(m=>{ IMAGES=m; renderAll(); if(!$("#viewGarage").hidden) renderGarage(); }); });
