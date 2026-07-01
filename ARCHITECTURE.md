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
lib/
  types.ts            Zentrale Typen (eine Quelle der Wahrheit)
  nominatim.ts        Geocoding/Adresssuche
  overpass.ts         POI-Suche (mehrere Endpunkte, Fallback)
  citydata.ts         Stadttyp-Erkennung, Preisbasis, Rechtshinweise
  calculations.ts     Umsatz/Kosten/Break-even
  scoring.ts          Score-Engine (6 Kategorien)
  storage.ts          Portfolio (localStorage)
  analysis/           Berichts-Provider (siehe unten)
    provider.ts         Interface
    localProvider.ts    regelbasiert (Default, kein Key)
    claudeProvider.ts   externes Backend/Claude
    index.ts            Auswahl + Fallback
components/
  PWARegister.tsx     Service-Worker-Registrierung
public/
  manifest.json, sw.js, icons/   PWA-Assets
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
