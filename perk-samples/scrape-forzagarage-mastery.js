/* ============================================================================
   FH6 mastery scraper — pulls ONLY the car-mastery data from forzagarage.
   It runs in YOUR browser (same-origin = no Cloudflare block) and keeps only
   each car's mastery JSON + title (a few KB total), not the heavy pages.

   HOW TO USE:
   1. Open  https://forzagarage.com/cars  in your browser and let it fully load.
   2. Open DevTools console:  F12  (or right-click → Inspect → Console).
   3. Paste this whole file in, press Enter, and wait. Progress logs as it goes
      (~622 cars × ~150ms ≈ 1.5–2 min).
   4. It auto-downloads  fh6-mastery-raw.json . Drop that file into
      FH6-Tracker/perk-samples/  and tell me — I'll convert it to trees+perks.
   ============================================================================ */
(async () => {
  const links = [...document.querySelectorAll('a.car-card[href^="/cars/"]')]
    .map(a => a.getAttribute('href'));
  const urls = [...new Set(links)];
  if (!urls.length) { alert('No car links found. Run this on the forzagarage.com/cars list page.'); return; }
  console.log('Found ' + urls.length + ' cars. Scraping mastery data…');

  const out = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const html = await (await fetch(urls[i], { credentials: 'same-origin' })).text();
      const m = html.match(/<script type="application\/json" id="cm-data">([\s\S]*?)<\/script>/);
      const t = (html.match(/class="mm-title"[^>]*>([^<]+?)\s*-\s*3D model</) || [])[1] || '';
      if (m) out.push({ slug: urls[i], title: t.trim(), data: JSON.parse(m[1]) });
    } catch (e) { console.warn('skip', urls[i], e.message); }
    if (i % 25 === 0) console.log(i + '/' + urls.length + '  (' + out.length + ' captured)');
    await new Promise(r => setTimeout(r, 130)); // be polite to the server
  }

  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fh6-mastery-raw.json';
  document.body.appendChild(a); a.click(); a.remove();
  console.log('DONE — captured ' + out.length + ' mastery trees → fh6-mastery-raw.json downloaded.');
})();
