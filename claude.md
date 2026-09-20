\# Kravspecifikation: Browser-baserat Sidoscrollande Shoot 'em Up: Thunder Force



\## 1. Systemöversikt \& Övergripande Mål



\* \*\*Genre:\*\* 2D Horisontellt sidoscrollande shoot 'em up (Shmup).

\* \*\*Plattform:\*\* PC Webbläsare (Desktop).

\* \*\*Inmatning:\*\* Enbart tangentbord.

\* \*\*Mål:\*\* Spelaren styr ett stridsskepp från vänster till höger över banan, förstör inkommande fiender och hinder, samlar vapen/power-ups samt besegrar minibossar och slutbossar.

\* \*\*Banor:\*\* Spelet ska bestå av 3 olika banor (stages). Spelet blir successivt svårare för varje bana. När spelaren har klarat samtliga börjar spelet om men med en högre svårighetsgrad. Det kan innebära att fienderna rör sig lite snabbare, skjuter lite mer eller blir lite mer tåligare.



\---



\## 2. Styrning \& Input (PC-tangentbord)



\### 2.1 Tangentbordskontroller



\* \*\*Förflyttning (8 riktningar):\*\*

\* Piltangenter alternativt `WASD`.





\* \*\*Primär eld (Skjut):\*\*

\* `Mellanslag`. Stöd för \*\*Auto-Fire\*\* när tangenten hålls intryckt.





\* \*\*Växla Vapen:\*\*

\* `Z` eller `X` för att bläddra framåt i inventariet av tillgängliga vapen.





\* \*\*Pausa Spel:\*\*

\* `P` eller `Esc`.





\* \*\*Avbryt till titelskärm:\*\*

\* `T` i pausläget återgår till titelskärmen, så att ett pågående spel kan avbrytas utan att sidan laddas om. Pågående bana, fiender och projektiler rensas, och nästa start börjar om från bana 1 med nollställd poäng (high score för sessionen behålls).







\### 2.2 Krav på Input-hantering



\* \*\*Prevent Default:\*\* Systemet måste förhindra webbläsarens standardbeteende för piltangenter och mellanslag (så att sidan inte scrollar under spel).

\* \*\*Input-loop:\*\* Tangentbords-inputs ska läsas av via en kontinuerlig spel-loop (inte förlita sig på OS-tangentrepetition) för att garantera direkt och responsiv förflyttning.



\---



\## 3. Spelarens Skepp \& Grundmekanik



\### 3.1 Förflyttning \& Fysik



\* Skeppet kan röra sig fritt inom skärmens synliga spelyta (vänster, höger, upp, ner).

\* Banan scrollar automatiskt från vänster till höger med en konstant eller variabel grundhastighet. Skeppet dras inte med i scrollningen utan behåller sin relativa position på skärmen.



\### 3.2 Hälsa, Liv \& Kollision



\* \*\*En-träffs-död (Insta-kill):\*\* Om skeppet träffas av en fientlig projektil, en fiende eller krockar med terräng/väggar förstörs skeppet omedelbart och spelaren förlorar ett liv (om inte en sköld är aktiv).

\* \*\*Respawn:\*\* Vid förlust av liv spänns skeppet åter upp på skärmens vänstra sida efter en kort paus (ca 1 sekund).

\* \*\*Oårbarhet vid Respawn:\*\* Skeppet erhåller 3 sekunders oårbarhet vid respawn (visas visuellt genom att skeppet blinkar).

\* \*\*Game Over:\*\* När spelarens liv når 0 visas Game Over-skärmen med möjlighet att starta om.



\---



\## 4. Vapensystem \& Power-ups



\### 4.1 Inventarie \& Vapenutrustning



1\. \*\*Startvapen:\*\* Spelaren startar alltid med ett grundläggande standardvapen (\*Twin Shot\*). Startvapnet kan aldrig förloras permanent.

2\. \*\*Kapacitet:\*\* Spelaren kan hålla upp till 5 olika vapentyper i sitt inventarium samtidigt.

3\. \*\*Realtidsväxling:\*\* Spelaren kan när som helst under spelets gång växla mellan upplåsta vapen via växlingsknappen.

4\. \*\*Vapenordning:\*\* Slottarna har en fast ordning som också är ordningen vapnen delas ut i banorna: 1 Twin Shot, 2 Back Fire, 3 Sideblaster, 4 Hunter, 5 Wave.



\### 4.2 Unik Dödsmekanik för Vapen



\* \*\*Bara aktivt vapen förloras:\*\* Om spelaren blir nedskjuten \*\*förloras enbart det vapen som var aktivt vid dödsögonblicket\*\*.

\* Övriga insamlade vapen i inventariet behålls.

\* Om spelaren dör med startvapnet aktivt förloras inget vapen.

\* Vid respawn utrustas automatiskt nästa tillgängliga vapen i inventariet.

\* \*\*Undantag:\*\* Om spelaren dog med startvapnet (\*Twin Shot\*) aktivt förblir Twin Shot valt efter respawn, även om andra vapen finns i inventariet.



\### 4.3 Vapentyper att Implementera



| Vapen | Beskrivning \& Egenskaper | Skjutriktning / Beteende |

| --- | --- | --- |

| \*\*Twin Shot (Standard)\*\* | Två parallella laserstrålar framåt. Medelhög eldhastighet och skada. | Rakt framåt ($0^\\circ$). |

| \*\*Back Fire\*\* | Skjuter samtidig eld rakt framåt och rakt bakåt. | Framåt ($0^\\circ$) och Bakåt ($180^\\circ$). |

| \*\*Sideblaster\*\* | Skjuter rakt fram som Twin Shot och samtidigt en skottlinje rakt upp och en rakt ner. Täcker flera riktningar samtidigt. Sidoprojektilerna (uppåt/nedåt) gör dubbelt så hög skada som de framåtriktade skotten. Skotten har en egen färg som skiljer vapnet från övriga. | Framåt ($0^\\circ$), Uppåt ($-90^\\circ$) och Nedåt ($90^\\circ$). |

| \*\*Hunter\*\* | Sökande projektiler som automatiskt söker upp närmaste fiende på skärmen. Låg skada: det krävs dubbelt så många träffar som med Twin Shot för samma skada. | Målsökande. |

| \*\*Wave\*\* | Breda energivågor som genomtränger mindre fiender och genomskär tätt placerade hinder. Vågorna ritas med tunna linjer i en guldbrun färg, vilket ger dämpad kontrast som är skonsam för ögonen. | Bred vågform rakt framåt. |



\### 4.4 Support-enheter \& Power-ups (Drops)



Fiender av viss typ eller särskilda kapslar släpper power-ups när de förstörs:



\* \*\*Vapenkapslar:\*\* Låser upp motsvarande vapen i inventariet (om spelaren redan har vapnet ger det poängbonus).

\* \*\*CRAW (Orbiters / Satelliter):\*\*

\* Max 2 satelliter kan plockas upp.

\* Satelliterna roterar runt spelarens skepp.

\* De avfyrar extraskott parallellt med spelarens valda vapen.

\* De fungerar som en visuell och offensiv förstärkning. De förloras vid död.





\* \*\*Shield (Sköld):\*\*

\* Absorberar ett par fiendeträffar innan den bryts ner och skeppet blir sårbart igen.

\* Sköldkapseln dyker enbart upp \*\*en gång per bana\*\*.







\---



\## 5. Fiendetyper \& AI-beteenden



Fienderna introduceras i vågor via ett tids- eller avståndsbaserat skriptsystem.



\*\*Generell tålighet:\*\* Samtliga vanliga fiender (allt utom bossar och minibossar) har 50 % högre hälsa än sitt grundvärde. Halva steg avrundas uppåt, vilket innebär att en fiende som annars skulle dö av en enda träff alltid kräver minst 2 skott. Bossars och minibossars hälsa påverkas inte av denna höjning.



\### 5.1 Svärmfiender (Formations / Grunts)



\* \*\*Egenskaper:\*\* Låg HP (dör på 2–3 skott). Dykande eller flygande i fasta formationer (t.ex. sinusvåg, V-formation, diagonala linjer).

\* \*\*Beteende:\*\* Följer en fördefinierad bana över skärmen och skjuter sällan eller enbart enstaka skott.

\* \*\*Belöning:\*\* Att rensa en hel formation ger bonuspoäng eller släpper en power-up på den sista fienden.



\### 5.2 Mark- \& Väggmonterade Turrets (Stationära Faror)



\* \*\*Egenskaper:\*\* Placerade på tak, golv eller utskjutande terräng.

\* \*\*Beteende:\*\* Roterar mot spelarens nuvarande position och avfyrar enstaka projektiler eller 3-skotts-salvor med jämna mellanrum.



\### 5.3 Medeltunga Fiender (Heavy Gunners / Interceptors)



\* \*\*Egenskaper:\*\* Högre HP (kräver fokuserad eld).

\* \*\*Beteende:\*\* Åker in från höger/ovan/under, stannar upp på skärmen, avfyrar spridningsskott eller riktade laserstrålar mot spelaren, och reträttar sedan.



\### 5.4 Miljöhinder \& Portar



\* \*\*Egenskaper:\*\* Rörliga väggar, fallande hinder, eller laserbarriärer som kräver att spelaren antingen tajmar sin passerande rörelse eller förstör en specifik generatornod för att öppna vägen.



\### 5.5 Minibossar \& Banbossar



\* \*\*Egenskaper:\*\*

\* Mycket hög HP med en synlig hälsomätare på skärmen (HUD).

\* Auto-scrolling stannar tillfälligt under bossstriden.





\* \*\*Beteende:\*\*

\* \*\*Fasbaserade mönster:\*\* Bossen växlar mellan minst 2–3 attackmönster baserat på återstående hälsa (t.ex. Fas 1: Riktade skott + rörelse; Fas 2: Lasersalvor + generera mindre fiendesvärmar).

\* \*\*Destruerbara delar:\*\* Bossen har identifierbara svaga punkter eller kanoner som kan förstöras individuellt för att försvaga dess attacker.





\* \*\*Visuell utformning:\*\* Varje boss ska ha en tydlig och igenkännbar skepps- eller maskindesign med skrov, överbyggnad, monterade kanontorn och motorer – inte enbart geometriska block. Utformningen är rent kosmetisk och påverkar inte träffytor, faser eller attackmönster.







\---



\## 6. HUD \& Användargränssnitt



HUD ska ligga fast överst eller underst på skärmen (eller som ett overlay) och täcka följande information:



1\. \*\*Score:\*\* Nuvarande poängställning.

2\. \*\*High Score:\*\* Högsta poäng under sessionen.

3\. \*\*Livsräknare:\*\* Antal återstående skepp (ikoner eller siffra).

4\. \*\*Vapenindikator:\*\*

\* Lista/ikoner som visar alla 5 vapenslott.

\* Tydlig markering för vilket vapen som för närvarande är \*\*aktivt\*\*.

\* Visuell status om ett vapen saknas/inte plockats upp ännu.





5\. \*\*Boss-hälsomätare:\*\* Visas enbart under miniboss- och bossstrider.



\---



\## 7. Ljud \& Visuella Effekter (VFX)



\### 7.1 Visuella Effekter



\* \*\*Parallax-scrolling:\*\* Bakgrunden ska bestå av minst 2–3 lager som rör sig i olika hastigheter för att skapa djupkänsla.

\* \*\*Explosioner \& Partiklar:\*\* Partikeleffekter vid förstörelse av fiender och projektilträffar.



\* \*\*Projektilstil:\*\* Spelarens skott ska ritas smala så att spelytan förblir lättläst: Twin Shot, Back Fire och Sideblaster som tunna strålar, och Wave som tunna guldbruna vågor. Tjockleken är enbart visuell och påverkar inte träffytor eller beteende.

\* \*\*Screen Shake:\*\* Korta skärmskakningseffekter vid större explosioner och när bossar besegras.



\### 7.2 Ljudkrav



\* \*\*Ljudeffekter (SFX):\*\* Unika ljudeffekter för spelarens eldgivning (olika för olika vapen), projektilträff, explosioner, upplockning av power-ups och varning vid låg hälsa/boss.



\---



\## 8. Icke-Funktionella Krav (Tekniska Riktlinjer)



1\. \*\*Prestanda:\*\* Spelet ska hålla stabila \*\*60 FPS\*\* i moderna skrivbordswebbläsare (Chrome, Firefox, Edge, Safari).

2\. \*\*Skärmskalning \& Aspect Ratio:\*\* Spelet ska köras i ett fast bildförhållande (t.ex. 16:9 eller 4:3) och skala upp snyggt med bibehållen upplösning (letterboxing vid behov).

