// Vercel Serverless Function: aggregiert Immobilien-/Regulierungs-News aus RSS.
// Dependency-frei (Regex-Parsing). Ergebnis wird per CDN gecacht.
//
// Aufruf:  GET /api/news  →  { items: [{ id, title, summary, source, url, date }] }
//
// Feeds anpassbar: stabile RSS-Quellen deiner Wahl eintragen. Fällt eine Quelle
// aus, wird sie übersprungen. Liefert der Endpoint eine leere Liste, nutzt das
// Frontend automatisch seine Mock-Daten.

const FEEDS = [
  { url: 'https://www.dmb.de/rss.xml', source: 'Deutscher Mieterbund' },
  { url: 'https://www.haufe.de/rss/immobilien', source: 'Haufe Immobilien' },
];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

function strip(s) {
  return (s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#38;/g, '&')
    .trim();
}

function tag(item, name) {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? strip(m[1]) : '';
}

async function parseFeed(feed) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(feed.url, { signal: ctrl.signal, headers: { 'User-Agent': 'AirScoreBot/1.0' } });
    clearTimeout(timer);
    if (!r.ok) return [];
    const xml = await r.text();
    const items = [];
    const re = /<item[\s\S]*?<\/item>/gi;
    let m;
    while ((m = re.exec(xml)) && items.length < 8) {
      const block = m[0];
      const title = tag(block, 'title');
      const link = tag(block, 'link');
      if (!title) continue;
      items.push({
        id: `${feed.source}-${link || title}`.slice(0, 120),
        title,
        summary: tag(block, 'description').slice(0, 240),
        source: feed.source,
        url: link,
        date: new Date(tag(block, 'pubDate') || Date.now()).toISOString(),
      });
    }
    return items;
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const lists = await Promise.all(FEEDS.map(parseFeed));
  const items = lists.flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  res.status(200).json({ items });
}
