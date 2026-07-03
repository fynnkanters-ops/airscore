# AirScore – Architektur & Erweiterung

Diese Datei erklärt, wie AirScore aufgebaut ist und wie man es **einfach erweitert und aktualisiert**.

## Leitprinzipien

1. **Läuft ohne Key & ohne Server** – Standard ist eine rein clientseitige App (statischer Export). Berichte erzeugt die lokale Engine im Browser.
2. **Austauschbare Bausteine** – Berichts-Erzeugung, Datenquellen und Scoring sind klar getrennt und einzeln ersetzbar.
3. **Wachstumspfad eingebaut** – dasselbe Frontend kann später ein Backend / eine API / eine native App nutzen, ohne Umbau der UI.

## Datenfluss (eine Analyse)

```
Adresse  ──►  Nominatim (Geocoding)        lib/nominatim.ts
          ──►  Overpass  (POIs im Umkreis)  lib/overpass.ts
          ──►  Stadttyp + Recht             lib/citydata.ts
          ──►  Finanzrechnung               lib/calculations.ts
          ──►  Score 0–100                  lib/scoring.ts
          ──►  Bericht (Texte)              lib/analysis/*   ← Provider
          ──►  Anzeige                      app/analyze/page.tsx
          ──►  optional speichern           lib/storage.ts → app/portfolio
```

Alle externen Aufrufe (Nominatim, Overpass) laufen direkt aus dem Browser und brauchen **keinen Key**.

## Ordnerstruktur

```
app/
  page.tsx            Startseite (Eingabe + Adresssuche)
  analyze/page.tsx    Analyse-Pipeline + Ergebnisbericht
  portfolio/page.tsx  Gespeicherte Objekte
  layout.tsx          PWA-Meta + Service-Worker-Registrierung
app/rechner/
  page.tsx            Option 2: Segmented-Control (Mietwert/Finanzierung/Import)
  prefill.ts          gemeinsame Import-Vorbefüllung
lib/
  types.ts            Zentrale Typen (eine Quelle der Wahrheit)
  nominatim.ts        Geocoding/Adresssuche
  overpass.ts         POI-Suche (mehrere Endpunkte, Fallback)
  citydata.ts         Stadttyp-Erkennung, Preisbasis, Rechtshinweise
  calculations.ts     Umsatz/Kosten/Break-even (Airbnb)
  scoring.ts          Score-Engine (6 Kategorien)
  storage.ts          Portfolio (localStorage)
  mietwert.ts         Mietwert-Score (gewichtet) → Kaltmiete-Spanne
  mietspiegel.ts      PLZ-Tabelle (€/m²-Richtwerte, editierbar/datiert)
  financing.ts        Annuität, Grunderwerbsteuer je Bundesland, Nebenkosten
  afa.ts              AfA linear/degressiv/§7b + Cashflow n. Steuern
  listing.ts          Listing-Import (ruft Proxy, Fallback null)
  news.ts             News-Feed (Proxy oder Mock)
  analysis/           Berichts-Provider (siehe unten)
components/
  TopBar.tsx, BottomNav.tsx, ThemeToggle.tsx  App-Chrome (in layout.tsx)
  NewsBell.tsx        Glocke + Slide-in-Panel
  Disclaimer.tsx      Pflicht-Hinweis-Box
  rechner/            Field-Helfer + MietwertCalc/FinanzierungCalc/ImportBox
  PWARegister.tsx     Service-Worker-Registrierung
public/
  manifest.json, sw.js, icons/   PWA-Assets
proxy/                OPTIONALER Vercel-Serverless-Proxy (eigenes Projekt, Root=proxy/)
  api/listing.js      OG/JSON-LD-Parser für Listing-Import
  api/news.js         RSS-Aggregation
server-examples/
  analyze-route.ts    OPTIONALES Claude-Backend (nicht im statischen Build)
scripts/
  gen-icons.mjs       PNG-Icons aus icon.svg erzeugen
```

## So erweiterst du AirScore

### 1) Neue POI-Kategorie (z. B. Schwimmbäder)
- In `lib/overpass.ts`: eine `nwr[...]`-Zeile in `buildQuery()` ergänzen und im Klassifizierungs-`for`-Loop einsortieren.
- In `lib/types.ts`: Feld zu `POIData` hinzufügen.
- Optional in `lib/scoring.ts` / `lib/analysis/localProvider.ts` auswerten.

### 2) Scoring anpassen (Gewichte/Schwellen)
- Komplett in `lib/scoring.ts`. Punkte pro Kategorie sind dort offen einsehbar.

### 3) Stadt-/Rechtsregel ergänzen
- In `lib/citydata.ts`: Keyword-Listen (`SPA_KEYWORDS`, Großstädte …) und `LEGAL_HINTS_BY_RISK` erweitern.

### 4) Berichtstexte verbessern (ohne KI)
- In `lib/analysis/localProvider.ts`: Zielgruppen (`detectTargetGroups`), Ausstattung (`EQUIPMENT_BY_GROUP`) und Textbausteine ergänzen.

### 5) Eigenes Backend / Claude / andere API anbinden
- Variante A (fertig): `server-examples/analyze-route.ts` als API-Route auf Vercel deployen, dann in `.env.local`:
  ```
  NEXT_PUBLIC_ANALYSIS_MODE=claude
  NEXT_PUBLIC_ANALYSIS_ENDPOINT=https://dein-backend/api/analyze
  ```
- Variante B (eigener Provider): `AnalysisProvider`-Interface (`lib/analysis/provider.ts`) implementieren und in `lib/analysis/index.ts` registrieren. Die UI bleibt unverändert, solange `AIAnalysis` zurückkommt.

> Fällt das Backend aus, schaltet `generateReport()` automatisch auf die lokale Engine zurück – die App liefert **immer** ein Ergebnis.

### 6) Native App
- Die PWA ist bereits installierbar (Homescreen). Für einen Store-Build kann der statische Export in eine WebView-Hülle (z. B. Capacitor) gepackt werden – die clientseitige Architektur macht das geradlinig.

## Aktualisieren / Deployen

- **Automatisch:** Push auf `main` → GitHub Action (`.github/workflows/deploy.yml`) baut und veröffentlicht nach GitHub Pages.
- **Lokal testen:** `npm run dev` (ohne basePath, http://localhost:3000).
- **Produktionsbuild lokal:** `npm run build` erzeugt `out/` (statisch).
- **Anderer Repo-Name:** `NEXT_PUBLIC_BASE_PATH` in `next.config.ts` / als Pages-Variable anpassen.
