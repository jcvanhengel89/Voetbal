# Zijlijn — vv Nieuwerkerk JO10-8

Een minimalistische webapp voor de teammanager langs de lijn. Geen account, server of externe bibliotheken nodig. Spelersnamen, score en wedstrijden staan alleen in de lokale browseropslag.

## Gebruiken

1. Voeg bij **Mijn team** de voornamen toe en vink aanwezigheid aan.
2. Vul tegenstander, aftraptijd, thuis/uit en minuten per helft in.
3. Tik bij **Opstelling** op de zes posities en kies je spelers. Kies boven het veld tussen 1–2–2–1 en 1–2–1–2, inclusief keeper. Positienamen staan op het veld en in beide keuzerichtingen. In de spelerskeuze staan bankspelers bovenaan; al opgestelde spelers staan grijs onderaan met hun positie erbij. De begininstelling is twee helften van 25 minuten; pas die aan als jullie anders spelen.
4. Tik op **Aftrap**. Registreer goals met de grote knoppen. Tik op een veldpositie of bankspeler voor een wissel. Twee veldspelers kunnen van positie ruilen.
5. Gebruik **Pauze** bij time-outs en rust. **2e helft** pauzeert de klok en wijzigt het helftnummer. Tik bij de hervatting op **Hervatten**. De grote klok toont de tijd in deze helft, met de totale gespeelde tijd eronder en stopt niet automatisch bij de richttijd.
6. **Herstel: [actie]** zet de laatste wijziging terug, inclusief een verwijderd doelpunt, wissel, opstelling, formatie of helftwissel. De laatste twintig acties worden lokaal bewaard; aftrap, afronden en een nieuwe wedstrijd beginnen met een lege herstelgeschiedenis. Herstellen verandert de lopende klok niet. Een herstelde wissel corrigeert ook de speeltijd vanaf dat wisselmoment.
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
- Tik bovenaan op het **versienummer** om de huidige versie te bekijken en op updates te controleren. Zodra een nieuwe offlineversie klaarstaat, verschijnt **Update laden**. Deze laadt de app opnieuw met behoud van lokale gegevens. Vanuit de oude versie zonder updateknop: open de app online, sluit alle tabbladen en de beginscherm-app, en open opnieuw. Verhoog bij een release het versienummer in `package.json`, `dist/app.js`, `dist/index.html`, `dist/release.json` en de cachenaam in `dist/sw.js`. De versiecontrole haalt alleen het openbare versienummer op; er worden geen spelers- of wedstrijdgegevens verzonden.

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

## Versie 1.2.0

Het veld blijft binnen de kaart op smalle schermen. Beide teams hebben een knop − Doelpunt: deze verwijdert alleen het laatste doelpunt van dat team en behoudt wissels en speeltijden. De stand kan ook direct na afronden worden gecorrigeerd; de bewaarde wedstrijd wordt bijgewerkt. Onder de score staat Samenvatting voor ouders, met een lokaal gemaakt, bewerkbaar bericht om zelf te kopiëren of delen.

## Versie 1.3.0 — training en verbeteringen langs de lijn

- Compact scorebord met wisselbank direct eronder; bankspelers gesorteerd op minste gespeelde tijd. De keuzelijst toont ook speeltijden.
- Instelbare wisselherinnering bij Mijn team. Een time-outherinnering verschijnt halverwege iedere helft. Herinneringen verschijnen alleen in de geopende app; geen achtergrondmeldingen.
- Notities en bewerkte samenvattingen worden automatisch bewaard. Na een scorewijziging kun je de samenvatting opnieuw laten maken (met bevestiging).
- Tik bij Mijn team op een vorige wedstrijd voor eindopstelling, speeltijd, gebeurtenissen en samenvatting.
- Een back-upherinnering volgt na de eerste afgeronde wedstrijd zonder export, drie wedstrijden sinds de laatste export, of zeven dagen na de laatste export. De datum is het moment waarop de download werd aangeboden; de browser kan niet bevestigen dat het bestand daadwerkelijk is bewaard.

### Training

1. Open Training → Nieuwe training. De eerstvolgende woensdag of vrijdag staat ingevuld.
2. Vul Rinus-oefenlinks in voor warming-up en twee oefeningen. Een vierde link voor partijen is optioneel.
3. Het schema gebruikt 10 + 15 + 15 + 30 minuten, totaal 70 minuten. Woensdag begint standaard om 17.30 en vrijdag om 17.45, beide veld 5. Deze defaults komen uit de JO10-3 t/m JO10-8-rijen in het aangeleverde trainingsschema; enkele paginakoppen van dat bestand noemen nog 2025–2026. De gebruiker kan datum, begintijd en veld aanpassen.
4. Bewaar het schema. Start de training en open de instructies met Open oefening in Rinus. De timer loopt door bij het openen van een ander tabblad of herladen. Pauze zet hem stil; Volgende start het volgende onderdeel (of houdt het gepauzeerd als het vorige gepauzeerd was). De app wisselt nooit automatisch van oefening.
5. Deel het tijdschema, voeg notities/materialen toe of hergebruik de training op een andere datum. Er kan één training tegelijk actief zijn.

Trainingsschema's en notities werken lokaal/offline en gaan mee in een back-up; de Rinus-pagina's en video's worden niet gekopieerd en hebben internet nodig. Rinus-links worden op domein en oefenpad gecontroleerd, maar de app haalt geen titel of instructies op en controleert niet of de oefening nog bestaat.

Bestaande opslag en versie-1-back-ups worden aangevuld met defaults. Een teruggezette back-up pauzeert alle timers en wist de tijdelijke herstelgeschiedenis. Er worden geen gegevens naar een server gesynchroniseerd.

### Versie 1.3.1

Offline-updates halen alle appbestanden opnieuw op met cache-revalidatie. Bij een afwijkend gepubliceerd versienummer registreert de app de worker met dat versienummer in de URL en herkent hij de geïnstalleerde update direct. Dit voorkomt hergebruik van oude appbestanden tijdens een release.

### Versie 1.3.2 — controle voor de eerste wedstrijd

- Alleen bekijken van een samenvatting bewaart geen oude tussenstand meer. Een automatisch bericht volgt bij heropenen de score en het einde van de wedstrijd. Handmatig bewerkte tekst blijft bewaard; Opnieuw maken herstelt het automatische bericht.
- Een positieruil tussen veldspelers stelt de wisselherinnering niet uit; een echte bankwissel wel.
- De updatecontrole gebruikt bij opstarten en bijwerken dezelfde worker-URL, zodat een reeds geladen versie geen extra update veroorzaakt.
- Een opslagfout blijft zichtbaar en wordt niet overschreven door een succesbericht.
- Als de systeemklok terug wordt gezet, blijft de lopende wedstrijd ten minste op het laatste vastgelegde actie- of rustmoment. Dat voorkomt dat eigen wedstrijdgegevens bij herladen als ongeldig worden geweigerd. De klok kan in dit uitzonderlijke geval tijdelijk blijven staan; voorwaartse systeemtijdsprongen worden niet gecorrigeerd.

### Versie 1.4.0 — doelpuntenmakers en topscorers

- Bij + Goal voor Nieuwerkerk telt het doelpunt direct. Kies daarna de maker; veldspelers staan bovenaan. Onbekend / overslaan of het venster sluiten bewaart het doelpunt zonder maker.
- Bij Wedstrijdverloop kun je de maker achteraf kiezen of wijzigen. Bij Mijn team → Vorige wedstrijden → [wedstrijd] staan hiervoor aparte knoppen onder Doelpuntenmakers. Ook goals uit oudere versies kunnen zo worden aangevuld. De stand verandert daardoor niet.
- Mijn team toont Topscorers over alle lokaal bewaarde wedstrijden, inclusief de huidige wedstrijd. Een afgeronde wedstrijd telt eenmaal mee. Goals zonder maker worden apart vermeld; gelijke aantallen krijgen dezelfde plaats.
- Scorecorrecties en herstel werken automatisch door in de telling. De eerste keuze van een maker hoort bij dezelfde herstelactie als het nieuwe doelpunt. Een latere correctie in de huidige wedstrijd is apart herstelbaar. In een oude wedstrijd corrigeer je de maker opnieuw via de knop.
- De automatische samenvatting bevat de geregistreerde makers en hun aantallen. Zelf bewerkte berichten blijven behouden; gebruik zo nodig Opnieuw maken.
- Namen in historische wedstrijden blijven beschikbaar wanneer een speler later wordt verwijderd. Spelers worden op hun vaste ID geteld, niet op hun naam. De huidige naam wordt gebruikt in de topscorerslijst.
- Makers worden met de wedstrijd opgeslagen en gaan mee in back-ups. Oude back-ups blijven geldig; oude goals krijgen niet automatisch een maker.

### Versie 1.5.0 — ijsgrijs en blauw, voorbespreking

Een rustige lichte vormgeving, blauwe accenten en zwevende glasnavigatie. Via **Opstelling tonen** verschijnt een alleen-lezen veld over het hele scherm, met grote namen en de wisselbank. Liggend op de telefoon draait de speelrichting mee naar links-rechts. De app vraagt waar ondersteund om volledig scherm en houdt het scherm wakker zolang de voorbespreking open is. Sluit met het kruisje; scores, timers en opstelling veranderen niet.

Versie 1.5.1 houdt het presentatieveld boven de pagina wanneer de browser naar volledig scherm schakelt.

### Versie 1.6.0 — rustiger wedstrijdscherm en historie opruimen

- Wedstrijd toont score, klok en direct wisselen vanaf de bank. Het veld, formatie en speeltijden staan op Opstelling.
- Notities, samenvatting en verloop staan onder Verslag & samenvatting; na afronden opent dit vanzelf.
- Vorige wedstrijden: open een wedstrijd via Mijn team en kies Wedstrijd verwijderen. Na bevestiging vervallen ook de goals in de topscorers. Als dit de laatst afgeronde wedstrijd op het wedstrijdscherm is, wordt dat scherm klaargezet voor een nieuwe wedstrijd. Team en trainingen blijven behouden. Verwijderen is definitief, tenzij je een eerdere back-up terugzet.
- Datum/tijd en overige formuliervelden zijn begrensd tot de beschikbare breedte, inclusief de minimale breedte van native mobiele datumvelden.

### Versie 1.7.0 — voorkeurslinies, wisselvoorstellen en speeltijdstatistieken

- Mijn team → Bewerk: Geen voorkeur, Verdediging, Middenveld of Aanval. Oude spelers blijven zonder voorkeur.
- Tijdens de wedstrijd: Wisselvoorstel op de wisselbank. Maximaal twee voorstellen: minst spelende bankspelers erin; meest spelende veldspelers eruit. Een verschil van minimaal één speelminuut voorkomt meteen terugwisselen. De keeper blijft staan. Binnen één minuut vergelijkbare speeltijd helpen linievoorkeur en afwisseling de plek kiezen. Voorkeur weegt als vijf minuten ervaring op die linie, zodat een nieuwe linie na verloop van tijd ook kan winnen.
- Keuzes zijn aanpasbaar, afzonderlijk over te slaan en pas na bevestiging actief. Herstel maakt de hele bevestigde wissel ongedaan. Een gewijzigde opstelling of wedstrijd maakt een oud voorstel ongeldig.
- Bij overgang naar de tweede helft wordt een andere keeper voorgesteld. Hij blijft buiten normale wisselvoorstellen. Een kandidaat uit het veld ruilt met de huidige keeper van positie; een bankspeler zet de keeper op de bank. Annuleren verandert de opstelling niet; de knop Keeper tweede helft blijft dan beschikbaar.
- Historie toont Speeltijd deze wedstrijd direct geopend, inclusief keepen. Nieuwe archieven bewaren ook aanwezigheid, zodat nul gespeelde minuten te onderscheiden zijn van afwezigheid. Oude wedstrijden tonen geen verzonnen aanwezigheid.
- Mijn team → Totale speeltijd: totale minuten, aantal aanwezige wedstrijden, gemiddelde en minuten van de laatst bewaarde wedstrijd. Alleen afgeronde wedstrijden tellen mee, precies eenmaal; verwijderen werkt direct door. Bij oudere gegevens zonder aanwezigheid telt voor het gemiddelde alleen geregistreerde deelname.
- Alle tijden zijn min:sec (ook totalen boven een uur). Suggesties gebruiken huidige wedstrijdminuten; historische totalen zijn ter informatie bij voorbereiding, zodat afwezigheid niet automatisch wordt gecompenseerd.
