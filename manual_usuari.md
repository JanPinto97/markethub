# MarketHub — Manual d'usuari

Benvingut/da a MarketHub! Aquest manual t'explica, pas a pas, com fer servir
totes les funcionalitats de la plataforma. No cal cap coneixement tècnic: només
necessites un navegador i un compte.

MarketHub és alhora un **portal financer** (mercats en temps real, notícies,
calendari econòmic, gràfics) i una **xarxa social** (comunitats, debats,
perfils, missatgeria). El manual està organitzat per àrees perquè puguis anar
directament al que t'interessa.

---

## 1. Crear un compte i iniciar sessió

### Registrar-se (`/register`)
1. Vés a la part superior dreta i clica **Sign Up**.
2. Omple el formulari:
   - **Nom d'usuari** (entre 3 i 30 caràcters).
   - **Correu electrònic** vàlid.
   - **Contrasenya** d'almenys 8 caràcters.
3. Pots mostrar/amagar la contrasenya amb la icona de l'ull.
4. Clica el botó verd **Sign Up**. Si tot va bé, ja estaràs dins.

### Iniciar sessió (`/login`)
1. Clica **Sign In**.
2. Introdueix el correu i la contrasenya.
3. Si t'havien fet fora per inactivitat, veuràs un avís de sessió expirada.
4. **Compte!** Si t'equivoques 5 vegades, el sistema bloqueja el teu compte
   durant **15 minuts** per seguretat.

### Tancar sessió
Clica el teu avatar a la capçalera → **Logout**.

---

## 2. La capçalera (sempre visible)

A dalt de tot trobaràs:
- **Logo MarketHub** — torna a la pàgina d'inici.
- **Community / Markets / Assistant** — accés ràpid a les seccions principals.
- **Badges de mercats (TYO, LON, NYC)** — indiquen si Tokyo, Londres o Nova
  York estan oberts (verd), en pre-mercat (taronja) o tancats (gris). Passant
  per sobre veus l'horari i el temps que queda per a la propera obertura.
- **Campana de notificacions** 🔔 — amb un cercle verd que indica quantes en
  tens sense llegir. Clicant-la s'obre un desplegable amb la llista i pots
  navegar al que va provocar la notificació.
- **Engranatge** ⚙️ — accés ràpid a `/settings`.
- **El teu avatar** — menú amb el teu perfil i logout.

En mòbil, tot això es replega dins d'un menú hamburguesa amb el mateix
contingut.

---

## 3. Pàgina inicial (`/`)

És la *landing page* pública. Hi trobaràs:
- **Hero** amb el lema "Markets, told as a story." i una citació destacada.
- **Teaser de Community** amb exemples reals (Semiconductors Club, Macro,
  FX Traders).
- **Teaser de Markets** amb les 5 grans famílies d'actius (crypto, forex,
  commodities, índexs, accions).
- **Voices** — quatre cites de personatges reals/ficticis.
- **Assistant** — bloc del nostre assistent IA "Warren".
- **FAQ** — preguntes freqüents desplegables.
- **CTA final** per registrar-te.

---

## 4. Community — la xarxa social

### 4.1 Feed principal (`/community`)

Layout de **tres columnes**:

**Columna esquerra (sidebar):**
- Enllaços ràpids: Home i Search.
- **My Communities** — totes les comunitats a les quals pertanys (públiques i
  privades), cada una amb la seva etiqueta `[Public]` o `[Private]`.
- **Discover Communities** — obre un popup per buscar comunitats amb cercador,
  filtres per popularitat / membres / data, i tipus (pública o privada).
- **Topics** — temes de debat fixats a la barra lateral (es guarden al teu
  navegador, no al servidor).
- **Add Topics** — popover per buscar temes i fixar-los.
- **Create Community** — modal per crear una nova comunitat (pública o
  privada). Has de posar nom, descripció, avatar i triar el tipus
  (**no es pot canviar després**).

**Columna central (feed):**
- **Tabs Trending / Following**:
  - *Trending*: posts més populars (públics + de comunitats públiques).
    Visible per a tothom, també sense iniciar sessió.
  - *Following*: només posts dels usuaris que segueixes. Cal estar registrat.
- **Caixa de crear post** (només si has iniciat sessió):
  - Textarea amb comptador (màxim 400 caràcters).
  - Pots adjuntar **imatge** (jpg, png, gif, webp, fins a 10 MB) o **vídeo**
    (mp4, webm, mov, fins a 100 MB).
  - Botó d'emojis amb 4 grups.
- **Llistat de posts** amb scroll infinit, esquelets de càrrega mentre
  s'esperen els resultats i missatge "You're all caught up 🎉" al final.

**Columna dreta:** copyright i avisos legals.

### 4.2 Targeta de post (PostX)

Cada post mostra:
- **Capçalera**: avatar (o inicial amb color generat a partir del nom), autor,
  *@handle*, temps relatiu ("4h ago"), etiqueta de comunitat (si és d'una
  pública), i menú de tres punts amb accions segons el teu rol (editar,
  esborrar, reportar).
- **Cos**: text amb opció de **See more** si supera els 280 caràcters,
  imatge o reproductor de vídeo nadiu (amb missatge "Video unavailable" si
  hi ha problemes).
- **Peu**: botó de **Like** (cor) amb actualització immediata i
  desplegable de **comentaris** (5 per pàgina, "Load more" per carregar més).
- En clicar **comentar**, s'obre un *input* per escriure (amb autenticació
  requerida) i el comentari apareix immediatament a la llista.
- Pots obrir un **xat** (Discussion) directament des d'un comentari.

### 4.3 Comunitat pública (`/community/c/:id`)

- **Banner** amb avatar, nom, descripció i nombre de membres.
- **Join / Leave** — qualsevol usuari registrat pot unir-se sense aprovació.
  Si ets l'últim membre, veuràs un avís: la comunitat s'eliminarà al sortir.
- **Caixa de crear post** amb 3 estats:
  - No has iniciat sessió → bàner per registrar-te.
  - No ets membre → placeholder desactivat.
  - Membre → editor complet.
- **Feed** específic d'aquesta comunitat, amb scroll infinit.

### 4.4 Comunitat privada (`/community/p/:id`)

Cal iniciar sessió. Té dues vistes:

**Vista no-membre:**
- Banner + botó per demanar accés.
- Modal per escriure un missatge opcional (màxim 150 caràcters).
- Estats: pendent / rebutjada.

**Vista membre:**
- Layout de dues columnes: feed (65%) + panell lateral (35%).
- **Banner** amb avatar, nom, descripció, badge "Private", botó Leave i, si
  ets líder, botó **Delete** (amb avís).
- **Feed**: pinned a dalt, després ordenats per popularitat amb bonus segons
  el rol de l'autor. Si ets líder, pots fer **Pin/Unpin** des de cada post.
- **Panell lateral**:
  - **Membres** amb la seva insígnia de rol (👑 Leader, 🛡 Mod, 🐋 Whale,
    Member). Si ets líder, en passar per sobre tens **Expel** (amb confirmació)
    i un menú per **promocionar** a un altre rol.
  - **Pending requests** (només per a líder i moderadors): clicant una
    petició s'obre un modal amb el missatge complet i botons **Accept** /
    **Reject**.

### 4.5 Gestió de membres a pàgina sencera (`/community/p/:id/details`)

Versió a pantalla completa del panell anterior, útil quan tens moltes
peticions o membres per gestionar.

### 4.6 Temes de discussió (`/community/t/:slug`)

Pàgines estil Reddit per a temes pre-establerts (Forex, Crypto, Stocks,
Bancs Centrals, etc.). Columna centrada de 640 px:
- **Banner** del tema amb icona, nom, categoria, descripció i comptador de
  posts.
- **Sort tabs Top / Recent**.
- **Crear post**: títol obligatori (≤ 300), text opcional (≤ 2000), mèdia,
  emojis.
- **Llistat de PostReddit** amb scroll infinit.

### 4.7 Targeta de PostReddit

Cada post de tema mostra:
- **Columna de votació** amb fletxa amunt (▲), puntuació i fletxa avall (▼).
  Cada vot s'actualitza al moment.
- **Títol** clicable que porta al detall.
- **Autor i temps**, text retallat a 3 línies, preview de mèdia (màxim 300 px).
- **Nombre de comentaris**.
- Menú de tres punts amb opció d'esborrar (per a l'autor o moderadors).

### 4.8 Detall de PostReddit (`/community/t/:slug/p/:postId`)

- Columna centrada de 720 px.
- Vista completa: títol (H1), text íntegre, mèdia fins a 600 px.
- **Comentaris**:
  - Llistat per pàgines (10 cada vegada, més recents primer).
  - Possibilitat de **respondre** un comentari (1 sol nivell de profunditat).
  - Caixa per escriure (amb autenticació), textarea auto-expandible, comptador
    de 400 caràcters.
  - Esborrar comentari per a l'autor / moderador / superadmin (esborrar un
    comentari pare també esborra les respostes).
- **Important**: aquí no hi ha "likes" als comentaris.

### 4.9 Discussions (`/community/discussion/...`)

És un **xat 1 a 1** que s'obre a partir d'un comentari de PostX.
- Etiqueta "Replying to @username" que recorda l'origen.
- Textarea auto-expandible.
- Historial de missatges amb paginació per cursor (es carrega el més recent
  primer).
- Es crea automàticament en enviar el primer missatge.

### 4.10 Cerca global (`/search`)

Cerca a tota la plataforma:
- **Tabs** All / Users / Posts / Communities.
- "All" mostra els 3 millors resultats per categoria amb botó "See all".
- Filtrar per una categoria → 10 resultats per pàgina.
- L'URL s'actualitza dinàmicament (`?q=&type=&page=`) per poder compartir el
  resultat.
- No cerca dins de PostReddit ni de temes (per a això tens el popup
  d'Add Topics).

---

## 5. Markets — el portal financer (`/markets`)

Quatre pestanyes principals: **Overview**, **Calendar**, **News** i **Charts**.

### 5.1 Overview

- **Watchlist en directe** amb selecció per defecte: BTC/USD, ETH/USD,
  EUR/USD, OR (XAU), Petroli (WTI), S&P 500 (SPY), NASDAQ 100 (QQQ), AAPL,
  NVDA, TSLA.
- Cada fila mostra preu en directe, percentatge de canvi i un *sparkline*.
  Clicant-la, l'actiu es carrega al gràfic principal.
- **Cercador de símbols** amb cerca proactiva i navegació per teclat
  (Fletxes / Enter / Esc).
- **Widget TradingView** interactiu amb timeframes, indicadors i eines de
  dibuix.
- **Indicador de sentiment** (Fear & Greed) amb classificació
  ("Extreme Fear" → "Extreme Greed").
- **Headlines** de notícies destacades — clicant-les vas a la pestanya News.

### 5.2 Calendar (Calendari econòmic)

Taula d'esdeveniments macroeconòmics:
- Columnes: impacte (baix / mitjà / alt), país, esdeveniment, previsió,
  resultat real, hora.
- Selector de data per saltar a un dia concret.
- Filtres per impacte i país.
- Pots crear **alertes** d'esdeveniment des d'aquí: rebràs una notificació al
  navegador en el moment configurat (sense necessitat de tenir la pestanya
  oberta).

### 5.3 News

- Agregador de notícies financeres de diverses fonts (NewsData, Marketaux,
  Yahoo, Tiingo, Polygon...).
- Targetes amb titular, font, hora, resum i imatge.
- Clicant una notícia, vas al detall amb el contingut complet i enllaç a
  l'original (`/markets/news/:id`).
- Si s'arriba aquí des d'una notificació de **Breaking News**, la pàgina
  s'obre directament al detall corresponent.

### 5.4 Charts

Espai dedicat als gràfics:
- Múltiples símbols al mateix gràfic.
- Timeframes personalitzats (1 minut → 1 mes).
- Indicadors tècnics (mitjanes mòbils, RSI, MACD, volum, etc.).
- Eines de dibuix i possibilitat de guardar/recuperar anotacions.

### 5.5 Comportament en temps real

- WebSocket amb Finnhub per a actualitzacions tic a tic d'accions
  americanes.
- *Polling* periòdic per a la resta de proveïdors.
- Rellotge i zona horària al peu de pàgina, freqüència d'actualització
  configurable.

---

## 6. Notificacions

Clicant la campana 🔔 de la capçalera s'obre un desplegable amb la teva llista
ordenada per data, més recents primer.

### Tipus de notificacions
- **Nou seguidor** → algú t'ha començat a seguir. Enllaça al seu perfil.
- **Like al teu post (PostX)** → t'avisa, però no porta enlloc.
- **Comentari al teu PostX** → mateix funcionament (sense enllaç directe).
- **Comentari al teu PostReddit** → enllaça al detall del post.
- **T'han acceptat a una comunitat privada** → enllaça a la comunitat.
- **Nova petició a la teva comunitat privada** (si ets líder o moderador) →
  enllaça a la pàgina de detalls per acceptar/rebutjar.
- **Algú ha obert un xat amb tu** (Discussion) → enllaça a la conversa.
- **Breaking News** → notícia destacada nova. Enllaça al detall de la notícia.
- **Alertes del calendari econòmic** → quan arriba el moment d'un esdeveniment
  que has marcat.

### Accions
- **Read all** → marca totes com a llegides.
- **Clear all** → esborra totes les notificacions.
- Si la notificació té enllaç, apareix una **fletxa** ▶ i en clicar-la et porta
  directament a la pàgina relacionada.
- El **cercle verd** amb el comptador desapareix quan ja no en tens cap de
  no llegida.

> Si tens més de 9 sense llegir, el cercle mostra "+9".

---

## 7. Perfils d'usuari

### El teu perfil públic (`/profile/:username`)

Qualsevol pot accedir-hi (no cal estar registrat per llegir):
- **Capçalera** amb cover (foto o color generat a partir del nom), avatar
  circular de 90 px, nom d'usuari i bio.
- Comptadors de **followers** i **following** — clicant-los s'obre un modal
  amb la llista (paginada per "Load more").
- Si tu ets l'usuari mostrat → botó **Edit Profile** que et porta a
  `/settings`.
- Si és un altre → botó **Follow / Unfollow** (necessita login).
- **Chips de comunitats públiques** a les quals pertany.
- **Feed** dels seus posts públics (general + comunitats públiques).

### Configuració (`/settings`)

Pàgina privada (cal estar autenticat). Tres seccions independents, cada una
amb el seu botó "Save":

1. **Profile**:
   - URL d'avatar (amb preview rodó en directe).
   - URL de cover (amb preview de banner).
   - Nom d'usuari.
   - Bio (comptador de 200 caràcters).
2. **Account**:
   - Email (privat, mai apareix al perfil públic).
3. **Password**:
   - Contrasenya actual + nova + confirmació.
   - Toggles per mostrar/amagar.
   - Validació en directe: ≥ 8 caràcters i coincidència.

Els errors (codis 401, 400, 409 si l'usuari o l'email ja existeixen)
apareixen al costat del camp afectat. Els missatges d'èxit es marquen
automàticament i desapareixen al cap de 4 segons.

---

## 8. Comportaments transversals (val per tota la plataforma)

- **Estat d'autenticació**: crear posts, votar, unir-se a comunitats, seguir
  usuaris, respondre en xats... tot requereix iniciar sessió. La interfície
  et guia amb banners o redireccions a `/login`.
- **Actualitzacions optimistes**: likes, vots, follows, joins, pins, esborrats
  i comentaris s'apliquen instantàniament a la UI; si el servidor falla, es
  reverteix automàticament.
- **Toasts**: cada acció reeixida (crear, esborrar, actualitzar) confirma amb
  un toast verd a la cantonada.
- **Estats de càrrega**: esquelets *shimmer* mentre s'esperen els continguts.
- **Scroll infinit**: en feeds llargs, els nous continguts es carreguen
  automàticament quan t'apropes al final.
- **Rol-aware UI**: si ets líder, moderador o superadmin, veuràs accions
  addicionals (pin, expel, promote, delete contingut aliè).
- **Accents en temps real**: badges de mercats a la capçalera amb estat
  actualitzat al moment, preus WebSocket al dashboard.

---

## 9. Resum ràpid de rutes

| Què vull fer                          | On vaig                          |
| ------------------------------------- | -------------------------------- |
| Veure el feed general                 | `/community`                     |
| Veure el dashboard de mercats         | `/markets`                       |
| Veure el calendari econòmic           | `/markets` → tab Calendar        |
| Llegir notícies financeres            | `/markets` → tab News            |
| Crear una comunitat                   | `/community` → sidebar           |
| Buscar usuaris / posts / comunitats   | `/search`                        |
| Veure el meu perfil                   | Avatar → My profile              |
| Canviar dades del compte              | `/settings`                      |
| Iniciar sessió                        | `/login`                         |
| Registrar-me                          | `/register`                      |
| Veure les notificacions               | 🔔 a la capçalera                |

---

## 10. Preguntes freqüents

**Puc canviar una comunitat pública en privada (o al revés)?**
No. La decisió es fa al crear-la i és definitiva.

**Per què la pestanya Following està buida?**
Perquè encara no segueixes ningú. Vés a un perfil i clica **Follow**.

**He oblidat la contrasenya — què faig?**
Actualment no hi ha encara la recuperació per email automatitzada. Contacta
amb un administrador.

**No sento els sons de notificació.**
Els navegadors moderns bloquegen la reproducció automàtica d'àudio fins que
interactues amb la pàgina. Clica en qualsevol lloc i ja se sentirà.

**Per què no veig una comunitat privada al perfil d'un usuari?**
Les comunitats privades només apareixen als perfils si tu també hi pertanys
(o ets el propietari del perfil). És intencionat per protegir la privacitat.

**Em puc fer moderador o superadmin des de la UI?**
No. Aquests rols els atorga només el manteniment del sistema via seeds.

---

Si tens dubtes addicionals, consulta el peu de pàgina (Legal / Terms /
Privacy / Cookies) o contacta amb l'equip de MarketHub.

Bona inversió i bons debats! 📈
