# Zijlijn — vv Nieuwerkerk JO10-8

Een minimalistische webapp voor de teammanager langs de lijn. Geen account, server of externe bibliotheken nodig. Spelersnamen, score en wedstrijden staan alleen in de lokale browseropslag.

## Gebruiken

1. Voeg bij **Mijn team** de voornamen toe en vink aanwezigheid aan.
2. Vul tegenstander, aftraptijd, thuis/uit en minuten per helft in.
3. Tik bij **Opstelling** op de zes posities en kies je spelers. Kies boven het veld tussen 1–2–2–1 en 1–2–1–2, inclusief keeper. Positienamen staan op het veld en in beide keuzerichtingen. In de spelerskeuze staan bankspelers bovenaan; al opgestelde spelers staan grijs onderaan met hun positie erbij. De begininstelling is twee helften van 25 minuten; pas die aan als jullie anders spelen.
4. Tik op **Aftrap**. Registreer goals met de grote knoppen. Tik op een veldpositie of bankspeler voor een wissel. Twee veldspelers kunnen van positie ruilen.
5. Gebruik **Pauze** bij time-outs en rust. **2e helft** pauzeert de klok en wijzigt het helftnummer. Tik bij de hervatting op **Hervatten**. De klok toont altijd de totale gespeelde tijd en stopt niet automatisch bij de richttijd.
6. **Laatste actie herstellen** verwijdert de laatste goal, wissel of formatiewijziging. Een herstelde wissel corrigeert ook de speeltijd vanaf dat wisselmoment.
7. **Wedstrijd afronden** stopt de klok en bewaart een momentopname. Daarna kun je een nieuwe wedstrijd beginnen.
8. Bewaar regelmatig een JSON-back-up via **Mijn team**. Die is ook geschikt voor overzetten naar een ander toestel. Een teruggezette wedstrijd staat gepauzeerd op het moment van de export.

Tijdens een wedstrijd kun je wel spelers toevoegen of namen aanpassen. Aanwezigheid wijzigen en spelers verwijderen kan vóór de aftrap van de volgende wedstrijd. Een keeper telt net als de andere spelers mee in de speeltijd.

## Als app en offline

Open de gehoste website eerst met internet. Wacht tot **Offline beschikbaar** onder de wedstrijd staat. Daarna werkt dezelfde URL ook zonder internet via de service worker.

- iPhone: Safari → Deel → Zet op beginscherm.
- Android: browsermenu → App installeren / Toevoegen aan startscherm.
- Gebruik één tabblad tijdens de wedstrijd. Wijzigingen worden tussen tabbladen doorgegeven, maar gelijktijdig invoeren is niet ondersteund.
- Als je de app sluit terwijl de klok loopt, telt die bij heropenen door. Het scherm blijft waar ondersteund wakker. Bij een vergrendeld toestel wordt geen alarm gegarandeerd.
- Browseropslag is geen cloudback-up. Wissen van websitegegevens of wisselen van browser kan gegevens verwijderen. De app meldt opslagproblemen en biedt back-updownload. Het oorspronkelijke herstelbestand is te downloaden als bestaande opslag niet gelezen kan worden.
- Tik bovenaan op **v1.1.0** om de huidige versie te bekijken en op updates te controleren. Zodra een nieuwe offlineversie klaarstaat, verschijnt **Update laden**. Deze laadt de app opnieuw met behoud van lokale gegevens. Vanuit de oude versie zonder updateknop: open de app online, sluit alle tabbladen en de beginscherm-app, en open opnieuw. Verhoog bij een release het versienummer in `package.json`, `dist/app.js`, `dist/index.html`, `dist/release.json` en de cachenaam in `dist/sw.js`. De versiecontrole haalt alleen het openbare versienummer op; er worden geen spelers- of wedstrijdgegevens verzonden.

## GitHub Pages

Dit project staat in [jcvanhengel89/Voetbal](https://github.com/jcvanhengel89/Voetbal). Upload geen persoonlijke back-ups naar GitHub.

1. Wijzigingen op `main` starten automatisch **Publiceer Zijlijn**.
2. De workflow controleert de app en publiceert uitsluitend `dist/`.
3. Zo nodig: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Handmatig publiceren kan via **Actions → Publiceer Zijlijn → Run workflow**.
5. Gebruik de URL die GitHub bij de geslaagde deployment toont. Alle app-paden zijn relatief en werken ook onder `/Voetbal/`.

GitHub Pages host de appbestanden. Je ingevoerde spelers en wedstrijden worden daar niet naartoe gestuurd. De website en broncode kunnen publiek toegankelijk zijn, terwijl de gegevens lokaal blijven. De app verstuurt geen analytics, spelersnamen of wedstrijden. De versiecontrole haalt het openbare releasebestand op bij de eigen hosting. De door jou geopende voetbal.nl-link verlaat de app.

## Lokaal ontwikkelen

Node.js 22 of nieuwer is voldoende voor de controles; er zijn geen npm-installaties nodig.

```sh
npm test
npm run check
python3 -m http.server 8080 --directory dist
```

Open daarna `http://localhost:8080`. Open `index.html` niet rechtstreeks met `file://`: modules en offlineopslag vereisen een webserver. Productiehosting moet HTTPS gebruiken.

## voetbal.nl en later uitbreiden

De eerste versie heeft **geen automatische voetbal.nl-koppeling**. De tegenstander voer je handmatig in. Via **Mijn team → Teamlink instellen** kun je een geverifieerde link naar de JO10-8-teampagina bewaren. Zonder ingestelde teamlink opent de knop de algemene voetbal.nl-pagina. Er is nog geen specifieke teamlink vooraf ingevuld. Ondersteuning voor het openen van de native voetbal.nl-app hangt af van de aangeleverde HTTPS-link en je telefoon.

Sportlink biedt [Club.Dataservice](https://www.sportlink.nl/ons-aanbod/club-dataservice/) voor clubprogramma's en andere verenigingsgegevens. Of vv Nieuwerkerk de benodigde toegang heeft en gebruik in deze app is toegestaan, moet nog bij de club worden vastgesteld. Er zijn geen accounts, API-sleutels of niet-gedocumenteerde voetbal.nl-endpoints in deze app opgenomen.

Logische vervolgstap: geautoriseerde programmagegevens via een aparte adapter laten binnenkomen. Als daarvoor een geheime sleutel nodig is, hoort die in een serverdienst; GitHub Pages zelf voert geen servercode uit. Laat de handmatige invoer en offline laatst bekende gegevens bestaan.

`dist/model.js` bevat de wedstrijdlogica apart van `dist/app.js`. Het gegevensformaat heeft een versienummer en UUID's. Dat biedt een basis om later browseropslag te vervangen door een online opslaglaag, met accounts, teamrechten en conflictafhandeling. Die functies zijn nog niet geïmplementeerd.

## Versie 1.1.1

Twee formaties met behoud van dezelfde zes spelers en ongewijzigde spelersminuten; formatiewijzigingen tijdens een wedstrijd zijn herstelbaar. De opstelling en oude back-ups uit versie 1.0 blijven bruikbaar. De app gebruikt nog steeds opslagsleutel `zijlijn-v1`.

## Controles

Modeltests controleren formatiewijzigingen, compatibiliteit met oude back-ups, pauze/hervatten/herladen, meerdere wissels, keeperminuten, herstel van goals/wissels, afgeronde wedstrijden, back-upvalidatie en snapshotexport. JavaScript en lokale assetverwijzingen worden apart gecontroleerd. Deze oplevering is niet in een echte mobiele browser getest; voer vóór de eerste echte wedstrijd een oefenwedstrijd uit, inclusief herladen en offline openen. De optionele WebMCP-leestool wordt alleen geregistreerd in browsers die hem ondersteunen; hiervoor was geen ondersteunde validatiecontext beschikbaar.
