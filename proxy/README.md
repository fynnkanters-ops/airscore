# AirScore Proxy (Vercel)

Winziger Serverless-Proxy für die zwei netzabhängigen Features von AirScore.
**Kein API-Key.** Das Frontend (GitHub Pages) ruft diese Functions über
`NEXT_PUBLIC_PROXY_BASE` auf; ohne Proxy nutzt es Fallbacks (manuelle Eingabe / Mock-News).

## Endpunkte
- `GET /api/listing?url=<link>` → `{ titel, preis, flaeche, zimmer, plz, baujahr }`
  liest nur OpenGraph/JSON-LD der Zielseite (ToS/robots.txt beachten).
- `GET /api/news` → `{ items: [...] }` aggregiert RSS (Feeds in `api/news.js` anpassbar).

## Deploy
1. Auf [vercel.com](https://vercel.com) „New Project" → dasselbe GitHub-Repo importieren.
2. **Root Directory = `proxy`** setzen (wichtig – nicht das Repo-Root).
3. Deploy. Ergebnis-URL, z. B. `https://airscore-proxy.vercel.app`.
4. Diese URL im Frontend als `NEXT_PUBLIC_PROXY_BASE` setzen
   (GitHub → Repo Settings → Secrets and variables → Actions → Variables:
   `NEXT_PUBLIC_PROXY_BASE = https://airscore-proxy.vercel.app`) und neu deployen.

## Lokal testen
```bash
npm i -g vercel
cd proxy
vercel dev
# → http://localhost:3000/api/news
```
