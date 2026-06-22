// Generate original geometric line-art icons for every perk and bake them into PRESET_PERKS.
// Style: white line-art glyph on a rounded-square gradient tile (self-contained colours => works on dark & light).
const fs=require("fs");
const F={
  credits:["#ffd45c","#d98e10"], xp:["#9b7bff","#5733c8"], xpd:["#5aa0ff","#2f5fd6"],
  skill:["#37d9a2","#0e9468"], mult:["#c77dff","#7b35c6"], wheel:["#ff9a4d","#e0532f"],
  life:["#ff7193","#d62f50"], car:["#74b6ff","#2f6fd0"], delay:["#5ad1e0","#1f8fb0"], song:["#b68cff","#6a3fc0"]
};
const star=(cx,cy,r)=>{let p="";for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*0.42:r;p+=(i?"L":"M")+(cx+rr*Math.cos(a)).toFixed(1)+" "+(cy+rr*Math.sin(a)).toFixed(1);}return p+"Z";};
const S='fill="#fff" stroke="none"';                 // solid white
const GL={
  coin:`<circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="10"/>`,
  coins:`<ellipse cx="50" cy="41" rx="20" ry="8"/><path d="M30 41 v14 a20 8 0 0 0 40 0 v-14"/>`,
  levelup:`<path d="M30 54 l20 -20 l20 20"/><path d="M30 68 l20 -20 l20 20"/>`,
  wheel:`<circle cx="50" cy="50" r="21"/><path d="M50 29 v42 M29 50 h42 M35.4 35.4 l29.2 29.2 M64.6 35.4 l-29.2 29.2"/><circle cx="50" cy="50" r="3.5" ${S}/>`,
  wheelstar:`<circle cx="50" cy="50" r="21"/><path d="${star(50,50,12)}" ${S}/>`,
  heart:`<path d="M50 74 C 22 54 26 31 43 31 C 49 31 50 38 50 41 C 50 38 51 31 57 31 C 74 31 78 54 50 74 Z" ${S}/>`,
  car:`<path d="M26 58 l5 -13 q2 -5 8 -5 h22 q6 0 8 5 l5 13"/><path d="M22 58 h56"/><circle cx="38" cy="59" r="6"/><circle cx="64" cy="59" r="6"/>`,
  road:`<path d="M34 72 L45 30 M66 72 L55 30"/><path d="M50 34 v6 M50 48 v6 M50 62 v6"/>`,
  light:`<rect x="40" y="26" width="20" height="48" rx="9"/><circle cx="50" cy="37" r="4" ${S}/><circle cx="50" cy="50" r="4" ${S}/><circle cx="50" cy="63" r="4" ${S}/>`,
  terrain:`<path d="M26 66 l13 -18 l9 10 l12 -20 l14 28 Z" ${S}/>`,
  ccountry:`<path d="M26 68 l14 -22 l11 13 l10 -16 l13 25 Z" ${S}/><path d="M62 30 v16 M62 30 l9 4 l-9 4" fill="none" stroke="#fff"/>`,
  winding:`<path d="M40 72 C 40 58 64 56 64 44 C 64 32 42 32 42 22"/>`,
  dragtree:`<rect x="44" y="26" width="12" height="48" rx="4"/><circle cx="50" cy="36" r="3" ${S}/><circle cx="50" cy="46" r="3" ${S}/><circle cx="50" cy="56" r="3" ${S}/>`,
  lanes:`<path d="M34 30 v40 M66 30 v40 M30 34 h40"/><path d="M44 70 l6 -9 l6 9"/>`,
  stopwatch:`<circle cx="50" cy="55" r="18"/><path d="M44 28 h12 M50 28 v9 M65 40 l4 -4 M50 55 v-9"/>`,
  flag:`<path d="M36 26 v48"/><path d="M36 30 h30 v20 h-30 Z"/><path d="M36 30 h10 v10 h-10 M56 30 h10 v10 h-10 M46 40 h10 v10 h-10" ${S}/>`,
  shield:`<path d="M50 28 l18 6 v13 c0 14 -10 21 -18 25 c-8 -4 -18 -11 -18 -25 v-13 Z"/><path d="M42 50 l6 6 l12 -13"/>`,
  speedo:`<path d="M30 62 a20 20 0 0 1 40 0"/><path d="M50 62 l13 -11"/><circle cx="50" cy="62" r="3.5" ${S}/>`,
  overtake:`<path d="M28 60 h26 m-9 -7 l9 7 l-9 7"/><path d="M28 42 h16 m-7 -6 l7 6 l-7 6"/>`,
  draft:`<path d="M46 36 l16 14 l-16 14"/><path d="M24 42 h14 M20 50 h16 M24 58 h14"/>`,
  sling:`<path d="M40 72 V50 M40 50 L28 33 M40 50 L52 33"/><path d="M26 33 q14 -10 28 0"/>`,
  nearmiss:`<path d="M40 30 v40 M58 30 v40"/><circle cx="49" cy="50" r="3.5" ${S}/>`,
  drift:`<path d="M26 66 C 40 60 54 49 58 33"/><path d="M36 71 C 50 65 62 54 66 38"/>`,
  drifttap:`<path d="M28 66 C 42 60 56 49 60 33"/><circle cx="66" cy="34" r="4.5" ${S}/>`,
  air:`<path d="M24 62 Q50 24 76 62"/><path d="M50 34 l-7 9 M50 34 l7 9"/>`,
  airpass:`<path d="M24 62 Q50 26 76 62"/><path d="M58 42 h12 m-6 -6 l6 6 l-6 6"/>`,
  combo:`<circle cx="38" cy="50" r="10"/><circle cx="52" cy="50" r="10"/><circle cx="66" cy="50" r="10"/>`,
  link:`<rect x="28" y="42" width="26" height="16" rx="8"/><rect x="46" y="42" width="26" height="16" rx="8"/>`,
  sideswipe:`<path d="M28 40 l20 10 l-20 10"/><path d="M72 40 l-20 10 l20 10"/>`,
  burst:`<path d="${star(50,50,23)}" ${S}/>`,
  wball:`<path d="M40 27 L55 44"/><circle cx="39" cy="26" r="3" ${S}/><circle cx="60" cy="60" r="14"/>`,
  tire:`<circle cx="50" cy="56" r="16"/><circle cx="50" cy="56" r="6"/><path d="M40 34 q9 -6 1 -12 M52 33 q9 -6 1 -12"/>`,
  clover:`<circle cx="42" cy="43" r="9"/><circle cx="58" cy="43" r="9"/><circle cx="42" cy="59" r="9"/><circle cx="58" cy="59" r="9"/><path d="M58 59 l10 12"/>`,
  bolt:`<path d="M54 24 L34 54 H47 L44 76 L66 44 H52 Z" ${S}/>`,
  triple:`<path d="M30 38 h22 m-8 -6 l8 6 l-8 6"/><path d="M30 50 h22 m-8 -6 l8 6 l-8 6"/><path d="M30 62 h22 m-8 -6 l8 6 l-8 6"/>`,
  convoy:`<rect x="26" y="46" width="15" height="10" rx="3"/><rect x="44" y="46" width="15" height="10" rx="3"/><rect x="62" y="46" width="12" height="10" rx="3"/>`,
  compass:`<circle cx="50" cy="50" r="21"/><path d="M50 36 l8 18 -8 -5 -8 5 Z" ${S}/>`,
  crown:`<path d="M28 64 L33 36 L44 52 L50 32 L56 52 L67 36 L72 64 Z"/><path d="M28 64 h44"/>`,
  needle:`<path d="M32 68 L64 36"/><circle cx="66" cy="34" r="5"/><path d="M30 70 q6 -2 8 -8"/>`,
  paint:`<path d="M50 28 C 64 28 70 42 64 52 C 73 56 71 70 60 70 C 57 77 44 75 42 67 C 31 69 25 58 32 50 C 25 41 35 28 45 33 Z" ${S}/>`,
  flame:`<path d="M50 26 C 61 42 58 49 53 53 C 60 51 63 45 61 40 C 71 53 65 74 50 74 C 36 74 30 60 39 49 C 41 56 46 55 48 53 C 43 46 46 35 50 26 Z" ${S}/>`,
  bounce:`<path d="M26 64 q11 -26 23 0 q11 -26 23 0"/>`,
  crash:`<path d="M28 28 Q46 38 50 62"/><path d="M40 66 h20 M44 71 l-4 6 M56 71 l4 6 M50 71 v8"/>`,
  loop:`<path d="M42 66 a15 15 0 1 1 13 7"/><path d="M55 73 l-3 -8 8 1"/>`,
  tree:`<path d="M50 28 L65 52 H56 L68 70 H32 L44 52 H35 Z" ${S}/><rect x="46" y="70" width="8" height="8" ${S}/>`,
  barsup:`<path d="M34 68 V56 M50 68 V44 M66 68 V32"/><path d="M62 36 l4 -4 l4 4"/>`,
  barsmax:`<path d="M34 68 V42 M50 68 V42 M66 68 V42"/><path d="M28 34 h44"/>`,
  note:`<path d="M54 28 v34" /><path d="M54 28 q14 1 14 14 q-5 -10 -14 -7" ${S}/><circle cx="46" cy="62" r="9" ${S}/>`,
  hourglass:`<path d="M34 28 h32 M34 72 h32 M37 28 q13 22 0 44 M63 28 q-13 22 0 44"/>`,
  sparkle:`<path d="M50 26 L56 44 L74 50 L56 56 L50 74 L44 56 L26 50 L44 44 Z" ${S}/>`,
};
const M={
  CreditsPrize:["credits","coins"], HeadToHeadCredits:["credits","coin"],
  CarCollectionInfluencePrize:["xp","levelup"],
  AsphaltInfluenceConsumable:["xpd","road"], StreetRacingInfluenceConsumable:["xpd","light"],
  MixedSurfaceInfluenceConsumable:["xpd","terrain"], CrossCountryInfluenceConsumable:["xpd","ccountry"],
  TougeInfluenceConsumable:["xpd","winding"], DragRacingInfluenceConsumable:["xpd","dragtree"],
  DragMeetsInfluence:["xpd","lanes"], TimeAttackInfluence:["xpd","stopwatch"], EventFinishInfluence:["xpd","flag"],
  SkillScoreClean:["skill","shield"], SkillScoreSpeed:["skill","speedo"], SkillScorePass:["skill","overtake"],
  SkillScoreDrafting:["skill","draft"], SkillScoreSlingShot:["skill","sling"], SkillScoreNearMiss:["skill","nearmiss"],
  SkillScoreShowOff:["skill","sparkle"],
  SkillScoreDriftEDrift:["skill","drift"], SkillScoreDriftTap:["skill","drifttap"], SkillScoreAir:["skill","air"],
  SkillScoreAirbornePass:["skill","airpass"], SkillScoreAllCombos:["skill","combo"], SkillScoreLINKSkills:["skill","link"],
  SkillScoreSideSwipe:["skill","sideswipe"], SkillScoreWreckage:["skill","burst"], SkillScoreWreckingBall:["skill","wball"],
  SkillScoreBurnout:["skill","tire"], SkillScoreLuckyEscape:["skill","clover"], SkillScoreHardCharger:["skill","bolt"],
  SkillScoreTriplePass:["skill","triple"], SkillScoreAllConvoy:["skill","convoy"], SkillsFreeroamInfluence:["skill","compass"],
  SkillScoreUltimateChain:["skill","crown"], SkillScoreThreadingTheNeedle:["skill","needle"],
  SkillScoreTradingPaint:["skill","paint"], SkillScoreDareDevil:["skill","flame"], SkillScoreKangaroo:["skill","bounce"],
  SkillScoreCrashLanding:["skill","crash"], SkillScoreStuntman:["skill","loop"], SkillScoreLandscaping:["skill","tree"],
  SkillMultiplierBuildSpeed:["mult","barsup"], SkillMultiplierMax:["mult","barsmax"],
  SkillSongMultiplierSpeed:["song","note"], SkillChainDelay:["delay","hourglass"],
  WheelspinPrize:["wheel","wheel"], UltimateWheelspinPrize:["wheel","wheelstar"],
  ExtraLife:["life","heart"], CarPrize:["car","car"],
};
function svg([fam,g]){
  const grad=F[fam];
  const defs=`<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${grad[0]}'/><stop offset='1' stop-color='${grad[1]}'/></linearGradient><linearGradient id='h' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.30'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></linearGradient></defs>`;
  const tile=`<rect x='5' y='5' width='90' height='90' rx='24' fill='url(#g)'/><rect x='5' y='5' width='90' height='50' rx='24' fill='url(#h)'/><rect x='6' y='6' width='88' height='88' rx='23' fill='none' stroke='#fff' stroke-opacity='.2' stroke-width='2'/>`;
  const body=`<g fill='none' stroke='#fff' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'>${GL[g]}</g>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>${defs}${tile}${body}</svg>`;
}
const uri=spec=>"data:image/svg+xml,"+encodeURIComponent(svg(spec));

const f="../fh6-promo-tracker.html"; let html=fs.readFileSync(f,"utf8");
const m=html.match(/const PRESET_PERKS = (\[[\s\S]*?\]);\nconst PRESET_TREES/);
const perks=JSON.parse(m[1]); let done=0,missing=[];
perks.forEach(p=>{ if(M[p.key]){ p.icon=uri(M[p.key]); done++; } else missing.push(p.key); });
html=html.replace(m[1], JSON.stringify(perks));
fs.writeFileSync(f,html);
console.log("icons set on",done,"/",perks.length,"| missing:",missing.length?missing:"none");
let cells=perks.map(p=>`<div class="c"><img src="${uri(M[p.key]||["skill","compass"])}"><span>${p.name}</span></div>`).join("");
fs.writeFileSync("icons-preview.html",`<!doctype html><meta charset=utf8><style>body{margin:0;font-family:Arial}.pane{padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}.dark{background:#0d1117;color:#eef}.light{background:#f4efe4;color:#241}.c{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:10px;text-align:center}.c img{width:60px;height:60px}</style><div class="pane dark">${cells}</div><div class="pane light">${cells}</div>`);
console.log("wrote icons-preview.html");
