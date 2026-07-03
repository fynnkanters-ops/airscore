// Vercel Serverless Function: Listing-Metadaten von einer Immobilien-Anzeige.
// Liest NUR eingebettete, öffentliche Metadaten (OpenGraph + JSON-LD).
// Kein aggressives Scraping. ToS/robots.txt des Ziels beachten.
//
// Aufruf:  GET /api/listing?url=<encodeURIComponent(link)>
// Antwort: { titel, preis, flaeche, zimmer, plz, baujahr }  (Felder optional)

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function num(s) {
  if (!s) return undefined;
  const cleaned = String(s).replace(/\./g, '').replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const v = parseFloat(cleaned);
  return Number.isFinite(v) ? v : undefined;
}

function parseJsonLd(html) {
  const out = {};
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const nodes = Array.isArray(data) ? data : (data['@graph'] || [data]);
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const price = node.price || (node.offers && (node.offers.price || (node.offers[0] && node.offers[0].price)));
      if (price && out.preis === undefined) out.preis = num(price);
      if (node.floorSize && out.flaeche === undefined) out.flaeche = num(node.floorSize.value || node.floorSize);
      if (node.numberOfRooms && out.zimmer === undefined) out.zimmer = num(node.numberOfRooms.value || node.numberOfRooms);
      const addr = node.address || (node.item && node.item.address);
      if (addr && out.plz === undefined) out.plz = addr.postalCode ? String(addr.postalCode) : undefined;
      if (node.yearBuilt && out.baujahr === undefined) out.baujahr = num(node.yearBuilt);
      if (node.name && !out.titel) out.titel = String(node.name);
    }
  }
  return out;
}

function metaContent(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? m[1] : undefined;
}

function regexFallback(html) {
  const text = html.replace(/<[^>]+>/g, ' ');
  const out = {};
  const flaeche = text.match(/([\d.,]+)\s*m²/);
  if (flaeche) out.flaeche = num(flaeche[1]);
  const zimmer = text.match(/([\d.,]+)\s*Zimmer/i);
  if (zimmer) out.zimmer = num(zimmer[1]);
  const baujahr = text.match(/Baujahr[^\d]{0,10}(\d{4})/i);
  if (baujahr) out.baujahr = num(baujahr[1]);
  const plz = text.match(/\b(\d{5})\b/);
  if (plz) out.plz = plz[1];
  const preis = text.match(/([\d.]+)\s*€/);
  if (preis) out.preis = num(preis[1]);
  return out;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const url = req.query && req.query.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'Ungültige oder fehlende url' });
    return;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AirScoreBot/1.0; +https://fynnkanters-ops.github.io/airscore/)',
        'Accept': 'text/html',
      },
    });
    clearTimeout(timer);
    if (!r.ok) { res.status(200).json({ error: 'fetch ' + r.status }); return; }

    const html = (await r.text()).slice(0, 800000); // Obergrenze
    const ld = parseJsonLd(html);
    const fb = regexFallback(html);

    const result = {
      titel: ld.titel || metaContent(html, 'og:title'),
      preis: ld.preis ?? fb.preis,
      flaeche: ld.flaeche ?? fb.flaeche,
      zimmer: ld.zimmer ?? fb.zimmer,
      plz: ld.plz ?? fb.plz,
      baujahr: ld.baujahr ?? fb.baujahr,
    };

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.status(200).json(result);
  } catch {
    res.status(200).json({ error: 'Abruf fehlgeschlagen' });
  }
}
