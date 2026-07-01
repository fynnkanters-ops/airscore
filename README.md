# AirScore

**Gib eine Adresse ein. Bekomm eine klare Antwort.**
KI-/regelgestütztes Tool zur Bewertung von Wohnungen & Apartments für Airbnb-/Kurzzeitvermietung: Standortqualität, Nachfrage, Wettbewerb, Finanzen und ein Score von 0–100 mit klarer Empfehlung.

## Highlights

- ✅ **Kein API-Key nötig** – Berichte erzeugt eine lokale Engine im Browser.
- 🌍 **Online-Suche** – Adresssuche (Nominatim) & POIs (Overpass) live aus OpenStreetMap, kostenlos & ohne Key.
- 📱 **Als App installierbar** – PWA: auf dem Handy zum Homescreen hinzufügen.
- 📁 **Portfolio** – interessante Objekte speichern, vergleichen, mit Notizen versehen.
- 🔌 **Erweiterbar** – optional eigenes Backend/Claude über eine konfigurierbare API anbinden (siehe `ARCHITECTURE.md`).

## Schnellstart (lokal)

```bash
npm install
npm run dev
```

→ http://localhost:3000

## Produktionsbuild (statisch)

```bash
npm run build      # erzeugt out/ (statischer Export, läuft ohne Server)
```

## Deployment (GitHub Pages)

1. Repo auf GitHub anlegen (Name = URL-Unterpfad, Standard: `airscore`).
2. In den Repo-Einstellungen **Settings → Pages → Source: GitHub Actions** wählen.
3. Push auf `main`. Die Action (`.github/workflows/deploy.yml`) baut und veröffentlicht automatisch.
4. App läuft unter `https://<dein-user>.github.io/airscore/` – auch auf dem Handy installierbar.

> Heißt dein Repo anders, `NEXT_PUBLIC_BASE_PATH` in `next.config.ts` anpassen (oder als Pages-Variable setzen).

## Optional: KI-Texte via Claude/eigenes Backend

Standardmäßig nicht nötig. Wer Claude nutzen will: `server-examples/analyze-route.ts` auf Vercel deployen und in `.env.local` setzen:

```
NEXT_PUBLIC_ANALYSIS_MODE=claude
NEXT_PUBLIC_ANALYSIS_ENDPOINT=https://<deine-app>.vercel.app/api/analyze
```

## Icons neu erzeugen

```bash
node scripts/gen-icons.mjs   # aus public/icon.svg
```

## Architektur & Erweiterung

Siehe **[ARCHITECTURE.md](./ARCHITECTURE.md)** – Datenfluss, Ordnerstruktur und Schritt-für-Schritt-Anleitungen zum Erweitern (POIs, Scoring, Stadtregeln, Berichtstexte, Backend, native App).

## Wichtiger Hinweis

AirScore ist **keine Rechtsberatung** und liefert Schätzungen als Entscheidungshilfe. Vor jeder Anmietung: schriftliche Erlaubnis des Vermieters einholen und lokale Vorschriften (Zweckentfremdung, Registrierung, Kurtaxe) prüfen.
