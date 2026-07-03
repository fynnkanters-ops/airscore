# AirScore

**Gib eine Adresse ein. Bekomm eine klare Antwort.**
KI-/regelgestütztes Tool zur Bewertung von Wohnungen & Apartments für Airbnb-/Kurzzeitvermietung: Standortqualität, Nachfrage, Wettbewerb, Finanzen und ein Score von 0–100 mit klarer Empfehlung.

## Zwei Bereiche

- **Analyse** – Airbnb-/Kurzzeitvermietung: Standort, Nachfrage, Wettbewerb, Finanzen, Score 0–100.
- **Rechner** – Vermietung & Finanzierung:
  - **Mietwert-Score** – grobe ortsübliche Kaltmiete aus gewichtetem Score + PLZ-Mietspiegel-Richtwert.
  - **Baufinanzierung + AfA** – Annuitätendarlehen, Tilgungsplan, Kaufnebenkosten (Grunderwerbsteuer je Bundesland), lineare/degressive/§7b-Abschreibung, Cashflow nach Steuern.
  - **Listing-Import** – Link einfügen → Felder vorausgefüllt (via Proxy, mit manuellem Fallback).

## Highlights

- ✅ **Kein API-Key nötig** – Analyse-Berichte & alle Rechner laufen im Browser.
- 🌍 **Online-Suche** – Adresssuche (Nominatim) & POIs (Overpass) live aus OpenStreetMap, kostenlos & ohne Key.
- 🌗 **Dark Mode** + modernes, mobiles UI mit Bottom-Navigation.
- 🔔 **News-Widget** – dezente Meldungen zu Kurzzeitvermietung & Mietrecht (RSS via Proxy, Mock-Fallback).
- 📱 **Als App installierbar** – PWA: auf dem Handy zum Homescreen hinzufügen.
- 📁 **Portfolio** – interessante Objekte speichern, vergleichen, mit Notizen versehen.
- 🔌 **Erweiterbar** – optionaler Vercel-Proxy (`proxy/`) für Listing-Import & News; optional eigenes Backend/Claude (siehe `ARCHITECTURE.md`).

> **Wichtig:** Mietwert-, Finanzierungs- und AfA-Ergebnisse sind **Richtwerte, keine Rechts-, Steuer- oder Finanzberatung**. Sätze/Zinsen sind editierbare, datierte Defaults.

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
