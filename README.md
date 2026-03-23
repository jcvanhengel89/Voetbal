# Voetbal

Mobiele coach-app voor jeugdvoetbalwedstrijden.

## Wat doet de app?
- opstelling beheren voor 6v6, 7v7 en 8v8
- speeltijd en banktijd bijhouden
- wissels loggen
- score en doelpunten registreren
- tegenstander instellen
- wedstrijd archiveren
- backup exporteren en importeren

## Techniek
- React
- Vite
- Tailwind via CDN
- data-opslag in `localStorage`

## Lokaal starten
```bash
npm install
npm run dev
```

## Build maken
```bash
npm run build
```

## Belangrijke notities
- De app bewaart gegevens lokaal in de browser.
- Een fabrieksreset wist nu alleen app-specifieke opslagkeys.
- De vorige single-file versie is omgezet naar een Vite/React-structuur voor beter onderhoud.

## Volgende logische verbeteringen
- componenten verder opsplitsen
- import/export-validatie aanscherpen
- PWA-ondersteuning toevoegen
- tests toevoegen voor opslag- en wedstrijdlogica
