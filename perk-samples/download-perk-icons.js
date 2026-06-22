/* ============================================================================
   FH6 perk-icon downloader — grabs the 50 perk icons from forzagarage and
   bundles them into one JSON file (icon name -> data URI) for embedding.

   HOW TO USE:
   1. Open  https://forzagarage.com/  in your browser, let it load.
   2. F12 -> Console. Paste this whole file, Enter. Wait a few seconds.
   3. It downloads  fh6-perk-icons.json . Drop it into FH6-Tracker/perk-samples/
      and tell me — I'll embed the real icons into the perks.
   ============================================================================ */
(async () => {
  const NAMES = ["Air_Skill_Boost","Airborn_Skill_Boost","Burnout_Skill_Boost","Car_Reward","Clean_Racing_Boost","Combo_Skill_Boost","Convoy_Skill_Boost","Crash_Landing_Skill_Boost","Credits","Cross_Country_Race_XP","Daredevil_Skill_Boost","Dirt_Race_XP","Drafting_Skill_Boost","Drag_Meet_XP","Drag_Race_XP","Drift_Skill_Boost","Drift_Tap_Skill_Boost","Event_Finish_XP","Extra_Life","Freeroam_Skill_Boost","Hard_Charger_Skill_Boost","Head_to_Head_Credits","Kangaroo_Skill_Boost","Landscaping_Skill_Boost","Link_Skill_Boost","Lucky_Skill_Boost","Near_Miss_Skill_Boost","Pass_Skill_Boost","Road_Race_XP","Showoff_Skill_Boost","Sideswipe_Skill_Boost","Skill_Chain_Delay","Skill_Chain_Multiplier","Skill_Multiplier_Speed","Skill_Song_Boost","Slingshot_Skill_Boost","Speed_Skill_Boost","Street_Race_XP","Stuntman_Skill_Boost","Super_Wheelspin","Threading_Skill_Boost","Time_Attack_XP","Touge_Race_XP","Trading_Paint_Skill_Boost","Tripple_Pass","Ultimate_Skill_Boost","Wheelspin","Wreckage_Skill_Boost","Wrecking_Ball_Skill_Boost","XP"];
  const toDataURL = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  const out = {};
  for (let i = 0; i < NAMES.length; i++) {
    const n = NAMES[i];
    try {
      const r = await fetch(`/perk-icons/${n}.webp`, { credentials: "same-origin" });
      if (r.ok) out[n] = await toDataURL(await r.blob());
      else console.warn("missing", n, r.status);
    } catch (e) { console.warn("fail", n, e.message); }
    if (i % 10 === 0) console.log(i + "/" + NAMES.length);
    await new Promise(r => setTimeout(r, 80));
  }
  const blob = new Blob([JSON.stringify(out)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "fh6-perk-icons.json";
  document.body.appendChild(a); a.click(); a.remove();
  console.log("DONE — captured " + Object.keys(out).length + "/50 icons.");
})();
