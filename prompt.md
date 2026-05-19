# MarketHub — Manual tècnic complet

Aquest document està pensat perquè qualsevol tècnic que mai hagi tocat el projecte
pugui entendre'l, fer-lo córrer en local i modificar-lo amb seguretat. Tot està
en català. La nomenclatura interna del codi (variables, funcions, rutes) es
manté en anglès, tal com és al repositori.

---

## 1. Visió general del producte

MarketHub és una aplicació web que combina dues coses:

1. **Portal financer** — Mercats en temps real (criptomonedes, forex, accions,
   índexs, matèries primeres), gràfics TradingView, calendari econòmic i
   notícies agregades de diferents proveïdors.
2. **Xarxa social** — Comunitats públiques i privades, posts curts estil
   Twitter/X (PostX), discussions estil Reddit per temàtica (PostReddit),
   xats 1-a-1 oberts a partir de comentaris (Discussions), perfils públics,
   sistema de follow i cerca global.

També inclou un assistent IA ("Warren") en desenvolupament i un sistema de
notificacions transversal que cobreix events de comunitat i alertes de mercats.

L'objectiu principal és oferir un únic lloc on un usuari pugui consultar els
mercats i debatre les seves anàlisis amb altres usuaris.

---

## 2. Stack tecnològic

### Frontend
- **Angular 21** amb components *standalone* (sense NgModules).
- **TypeScript 5.9** en mode estricte.
- **Signals** (i `computed`) per a la gestió d'estat reactiu.
- **RxJS 7.8** per a streams (HTTP, esdeveniments).
- **CSS custom + CSS variables** (`frontend/src/styles/variables.css`) com a
  llenguatge per defecte.
- **Tailwind via CDN** com a complement opcional (definit a
  `frontend/src/index.html`). No s'utilitza Bootstrap ni cap altre framework.
- **Vitest** per a tests.

### Backend
- **Node.js 20** (Alpine en Docker).
- **Express 5** seguint un patró MVC estricte.
- **MongoDB 7** amb **Mongoose 9**.
- **JWT** per a autenticació: *access token* en memòria i *refresh token* en
  cookie `httpOnly`.
- **Multer** per a la pujada de fitxers.
- **dotenv** carrega `.env` des de l'arrel del projecte.

### Infraestructura
- **Docker + docker-compose** orquestra els tres serveis (mongo, backend,
  frontend) amb volums per a *live-reload* en desenvolupament.

### APIs externes (Markets)
- Finnhub (US stocks, WebSocket).
- Twelve Data (forex, crypto, gold, índexs).
- CoinGecko (crypto en general).
- Yahoo Finance via RapidAPI, Tiingo, Polygon, Alpha Vantage, NewsData,
  Marketaux (notícies + dades complementàries).
- TradingView (widget per a gràfics).

---

## 3. Estructura del repositori

```
markethub/
├── CLAUDE.md                 → context resumit + estat de fases (rules)
├── COMMUNITY.md              → especificació funcional completa de Community
├── README.md                 → resum públic + rutes + estat
├── context.md                → context complet (mateixa idea que aquest manual)
├── content.md                → descripció de tot el que veu i pot fer un usuari
├── docker-compose.yml        → orquestra mongo + backend + frontend
├── .env / .env.example       → variables d'entorn (arrel)
├── seeder/                   → scripts de seed (usuaris, temes, etc.)
├── frontend/
│   ├── CLAUDE.md
│   └── src/
│       ├── app/
│       │   ├── core/         → guards, interceptors, services, models
│       │   ├── features/     → home, markets, community, search, profile, auth, settings, assistant, legal
│       │   ├── shared/       → components, pipes, utils
│       │   └── app.routes.ts → declaració de rutes amb lazy loading
│       ├── environments/     → environment.ts amb claus d'APIs
│       └── styles/           → variables.css + reset.css
└── backend/
    ├── CLAUDE.md
    ├── server.js             → entry point (carrega .env, connecta DB, arrenca Express)
    ├── config/
    │   ├── db.js             → connexió Mongoose
    │   └── upload.js         → configuració Multer
    ├── controllers/
    ├── routes/
    ├── models/
    ├── middleware/
    ├── services/             → helpers compartits (notificationService, etc.)
    └── uploads/              → fitxers pujats (servits a /uploads/* — gitignored)
```

---

## 4. Com fer-lo córrer

### Amb Docker (recomanat)
```bash
docker-compose up --build
```
Això aixeca tres serveis:
- Frontend Angular → http://localhost:4200
- Backend Express → http://localhost:3000
- MongoDB 7 → `localhost:27017`, base de dades `markethub`

Dins de Docker el backend es connecta a `mongodb://mongo:27017/markethub`. Els
volums `./backend:/app` i `./frontend:/app` (amb `node_modules` com a volum
anònim) permeten *live-reload*.

### En local
```bash
# Backend
cd backend && npm install && npm run dev   # nodemon, requereix mongo a localhost:27017

# Frontend
cd frontend && npm install && ng serve     # port 4200
```

### Seeders
Des de `backend/`:
```bash
npm run seed        # crea usuaris superadmin/moderator + temes de discussió
```
**Important:** els rols `moderator` i `superadmin` només es poden crear via
seed; mai no es creen des de la UI.

---

## 5. Variables d'entorn

L'arrel té un `.env.example` amb les claus mínimes:

```
# Backend
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://mongo:27017/markethub
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# APIs externes
FINNHUB_KEY=...
TWELVE_DATA_KEYS=key1,key2,key3
COINGECKO_KEY=...
OPENAI_KEY=...           # assistent IA
```

Les claus d'APIs financeres actualment estan al
`frontend/src/environments/environment.ts` per a desenvolupament. **En producció
caldria moure-les al backend i fer proxy** per no exposar-les al client.

---

## 6. Convencions de codi

### Backend
- `async/await` arreu, mai `callbacks`.
- Errors propagats amb `next(err)` i tractats pel middleware global
  (`middleware/error.js`).
- Totes les rutes sota `/api/v1`.
- Format de resposta:
  - Èxit → `{ success: true, ... }`
  - Error → `{ success: false, message, code }`
- Models al directori `models/`; lògica al `controllers/`; rutes al `routes/`;
  middlewares al `middleware/`; lògica compartida no acoblada a HTTP a
  `services/`.

### Frontend
- Components *standalone*.
- *Signals* (`signal`, `computed`) per a estat local i `Subject`/`Observable`
  per a streams.
- Rutes amb `loadComponent` per fer *lazy loading*.
- Cada feature té el seu CSS al costat (`*.component.css`).
- Cada pàgina principal manté un `DESIGN.md` propi amb les decisions visuals.
  **Quan es fa un canvi de disseny, només s'actualitza el DESIGN.md de la
  pàgina afectada, mai els altres.**
- TypeScript en mode estricte; res de `any` excepte en fronteres externes
  inevitables (per ex. respostes d'APIs financeres).

### Git flow
```
main
└── dev
    ├── feat/auth-community  (fases 2, 3, header)
    └── feat/markets         (fase 4)
```
- Sempre `merge --no-ff`.
- Esborrar les branques de feature després del merge.
- Etiquetar `main` quan es completa una fase (`v1.0-phaseN`).
- Cada modificació a `app.routes.ts` s'ha d'avisar a l'equip per possibles
  conflictes de merge.

---

## 7. Models de dades (Mongoose)

Tots viuen a `backend/models/`.

### User
Camps principals: `username`, `email`, `passwordHash`, `role`, `avatar`,
`coverImage`, `bio`, `following`, `followers`, `loginAttempts`, `lockUntil`,
`createdAt`.
- `toPublicJSON()` omet l'email.
- `toPrivateJSON()` el inclou (per a `/auth/me`, `/auth/login`, etc.).
- Rols de plataforma: `user` | `moderator` | `superadmin`.

### PostX (estil Twitter/X)
Per al *feed* general i a comunitats públiques o privades.
- `text` (≤ 400), `mediaUrl`, `mediaType`, `origin` (`general` |
  `public_community` | `private_community`), `community`, `communityType`,
  `likes`, `commentCount`, `trendingScore`, `isPinned`.
- Likes en *toggle*. Comentaris **plans** (1 nivell). Els comentaris poden
  rebre likes.

### PostReddit (estil Reddit)
**Exclusivament** dins de temes de discussió.
- `title` (≤ 300), `text` (≤ 2000), `mediaUrl`, `mediaType`, `upvotes`,
  `downvotes`, `topic`, `commentCount`.
- Score = `upvotes - downvotes`. Votar el contrari elimina el vot anterior.
- Comentaris **plans** (1 nivell). **No** hi ha likes en comentaris.

**Regla fonamental:** PostX i PostReddit mai es barregen en cap feed,
cerca ni perfil.

### Comment
Compartit per ambdós tipus de post. Camps: `author`, `text` (≤ 400),
`postId`, `postType` (`PostX` | `PostReddit`), `likes` (només per a PostX).

### CommunityPublic
Sense rols. S'auto-elimina quan no queden membres. **No** es pot convertir
en privada. El creador no s'afegeix automàticament com a membre i no té rol
especial.

### CommunityPrivate
Amb rols: `leader` (1), `moderator` (N), `little_whale` (N), `member` (default).
- `joinRequests` (peticions amb missatge opcional ≤ 150 caràcters).
- Score bonus per rol al càlcul del *trending* del feed:
  - leader +50 / moderator +20 / little_whale +10 / member 0.
- **Successió** quan el líder marxa:
  1. Moderador aleatori → líder.
  2. Si no n'hi ha, Little Whale aleatori → líder.
  3. Si no n'hi ha, membre aleatori → líder.
  4. Si la comunitat queda buida → s'esborra.

### DiscussionTopic
Llista fixa carregada per seed. **No** s'edita des de la UI.
Categories: `CORE_MARKETS`, `ECONOMIA_I_MACRO`, `ASSETS_ESPECIFICS`,
`TRADING_I_INVERSIO`.

### Discussion + DiscussionMessage
Xat 1-a-1 lligat a un comentari de PostX. Es crea quan s'envia el primer
missatge. `DiscussionMessage` admet `replyTo` (cita de missatge anterior).
Paginació per cursor.

### Notification (sistema afegit a Phase 5)
Persistent a MongoDB. Camps: `recipient`, `actor`, `type`, `title`,
`message`, `link`, `read`, `createdAt`.
Tipus suportats:
- `follow` — nou seguidor.
- `post_like` — like a un PostX.
- `post_comment` — comentari a un PostX.
- `reddit_comment` — comentari a un PostReddit.
- `community_accepted` — acceptat a una comunitat privada.
- `community_request` — algú demana entrar a la teva comunitat privada
  (notifica líder + moderadors).
- `discussion_opened` — algú ha obert un xat a partir d'un comentari teu.

---

## 8. Endpoints del backend

Tots prefixats amb `/api/v1`.

### Auth
- `POST /auth/register`
- `POST /auth/login` (5 intents fallits → bloqueig 15 min)
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET  /auth/me` (protegit)

### Profile
- `PUT /profile` (username, email, avatar, coverImage, bio)
- `PUT /profile/password`

### PostX
- `POST /posts` (multipart, protegit)
- `GET  /posts/feed?mode=trending|following&page&limit`
- `GET  /posts/:id`
- `POST /posts/:id/like`
- `DELETE /posts/:id`
- `GET  /posts/:id/comments`
- `POST /posts/:id/comments`
- `POST /posts/:postId/comments/:commentId/like`
- `DELETE /posts/:postId/comments/:commentId`

### Comunitats públiques
- `GET /communities/public[?search&page&limit]`
- `POST /communities/public` (multipart)
- `GET /communities/public/:id`
- `POST /communities/public/:id/join`
- `POST /communities/public/:id/leave`
- `GET  /communities/public/:id/feed`
- `POST /communities/public/:id/posts` (multipart, només membres)
- `DELETE /communities/public/:id/posts/:postId`

### Comunitats privades
- `GET /communities/private`
- `POST /communities/private` (multipart)
- `GET /communities/private/:id`
- `POST /communities/private/:id/request`
- `POST /communities/private/:id/requests/:requestId` (accept/reject — líder/moderador)
- `DELETE /communities/private/:id/members/:userId` (només líder)
- `PUT /communities/private/:id/members/:userId/role` (només líder)
- `POST /communities/private/:id/leave`
- `DELETE /communities/private/:id` (només líder)
- `GET  /communities/private/:id/feed` (només membres)
- `POST /communities/private/:id/posts` (multipart, només membres)
- `DELETE /communities/private/:id/posts/:postId`
- `POST /communities/private/:id/posts/:postId/pin` (només líder)

### Discover & My
- `GET /communities/my` (protegit)
- `GET /communities/discover?search&sort=popularity|members|new&type=public,private&page&limit`
  (`optionalAuth` — si autenticat retorna `isJoined`)

### Topics + PostReddit
- `GET /topics[?category&search&ids]`
- `GET /topics/:slug`
- `GET /topics/:slug/feed?sort=top|recent&page&limit`
- `POST /topics/:slug/posts` (multipart)
- `GET  /topics/:slug/posts/:postId`
- `POST /topics/:slug/posts/:postId/vote` (`{vote: "up"|"down"|"none"}`)
- `DELETE /topics/:slug/posts/:postId`
- `GET  /topics/:slug/posts/:postId/comments?page&limit`
- `POST /topics/:slug/posts/:postId/comments`
- `DELETE /topics/:slug/posts/:postId/comments/:commentId`

### Users
- `GET /users/:username` (optionalAuth, retorna `isFollowing`)
- `GET /users/:username/posts`
- `POST /users/:username/follow` (toggle)
- `GET /users/:username/followers`
- `GET /users/:username/following`

### Cerca
- `GET /search?q&type=users|posts|communities&page&limit`

### Discussions
- `GET /discussions/comment/:commentId` (retorna `exists` + `discussionId`)
- `POST /discussions/comment/:commentId` (crea Discussion + primer missatge)
- `GET  /discussions/:id`
- `GET  /discussions/:id/messages?cursor&limit`
- `POST /discussions/:id/messages` (`{text, replyTo?}`)

### Markets
- `GET /markets/*` — proxy/agregador a Finnhub, Twelve Data, CoinGecko i
  calendari econòmic.

### Notifications
- `GET /notifications[?limit]` — llista + `unreadCount`.
- `POST /notifications/read-all` — marca totes com a llegides.
- `POST /notifications/:id/read` — marca una concreta.
- `DELETE /notifications` — esborra totes.

### Assistant
- `GET /assistant/*` — endpoints del *chat-core* + eines IA.

---

## 9. Frontend — rutes i pàgines

| Path                                   | Component                        | Guard       |
| -------------------------------------- | -------------------------------- | ----------- |
| `/`                                    | HomeComponent                    | —           |
| `/markets`                             | MarketsComponent                 | placeholder |
| `/markets/news/:id`                    | NewsDetail                       | —           |
| `/community`                           | CommunityComponent               | —           |
| `/community/c/:id`                     | CommunityPublicDetailComponent   | —           |
| `/community/p/:id`                     | CommunityPrivateDetailComponent  | authGuard   |
| `/community/p/:id/details`             | CommunityPrivateDetailsComponent | authGuard   |
| `/community/t/:slug`                   | TopicDetailComponent             | —           |
| `/community/t/:slug/p/:postId`         | PostRedditDetailComponent        | —           |
| `/community/discussion/new/:commentId` | DiscussionPageComponent          | authGuard   |
| `/community/discussion/:discussionId`  | DiscussionPageComponent          | authGuard   |
| `/profile/:username`                   | ProfileComponent                 | —           |
| `/search`                              | SearchComponent                  | —           |
| `/settings`                            | SettingsComponent                | authGuard   |
| `/login`                               | LoginComponent                   | —           |
| `/register`                            | RegisterComponent                | —           |
| `/assistant`                           | (en desenvolupament)             | —           |

> ⚠️ Qualsevol modificació a `app.routes.ts` s'ha de comunicar a l'equip:
> les branques `feat/markets` i `feat/auth-community` toquen sovint aquest
> fitxer i poden generar conflictes de merge.

---

## 10. Components clau del frontend

### Capa transversal
- **HeaderComponent** (`shared/components/header/`) — capçalera global amb
  navegació (Community / Markets / Assistant), badges de mercats (TYO/LON/NYC)
  amb estat (open/pre/closed), botó de notificacions amb *dropdown*, botó
  de configuració, avatar amb menú d'usuari i versió mòbil amb panell
  desplegable. **Aquí es renderitza el sistema de notificacions.**
- **NavbarComponent** — versió antiga, encara present per a algunes pàgines.
- **FooterComponent** — peu compartit, només es mostra a `/` i `/markets`.
- **ToastComponent** — toast global d'un sol element a la vegada.
- **EmojiPickerComponent** — popover d'emojis amb 4 grups.
- **SearchBarComponent** — input de cerca amb dropdown de resultats
  (debounced 350 ms).

### Community
- **CommunityComponent** — pàgina principal `/community` amb layout de 3
  columnes, *tabs* Trending/Following, formulari de creació de post amb
  emoji, mèdia i comptador, *infinite scroll* via `IntersectionObserver`.
- **PostCardComponent** — tarja reutilitzable per a PostX (header, body,
  footer, comentaris inline).
- **PostSkeletonComponent** — esquelet *shimmer* per a estats de càrrega.
- **CommunityPublicDetailComponent** / **CommunityPrivateDetailComponent** /
  **CommunityPrivateDetailsComponent** — pàgines de comunitats amb feed,
  Join/Leave/Request, pinned, panells de membres i sol·licituds.
- **TopicDetailComponent** + **PostRedditCardComponent** +
  **PostRedditDetailComponent** + **PostRedditCommentSectionComponent** —
  pàgines de tema de discussió i detall de PostReddit.
- **DiscussionPageComponent** — xat estil missatgeria 1-a-1.
- **CreateCommunityModalComponent**, **DiscoverCommunitiesPopupComponent**,
  **TopicSearchPopupComponent** — popups per a creació, descobriment i
  cerca de comunitats/temes.
- **CommunityMembersPanelComponent**, **PendingRequestsPanelComponent** —
  panells laterals i de gestió.

### Markets
- **MarketsComponent** — *dashboard* amb watchlist en directe, cercador
  de símbols, gràfic TradingView, indicador sentiment, headlines.
- **EconomicCalendarComponent** — calendari econòmic filtrable.
- **MarketNewsComponent** + **NewsArticleComponent** + **NewsDetail** —
  agregador i detall de notícies (ruta `/markets/news/:id`).
- **ChartsComponent** — *playground* de gràfics.

### Altres
- **ProfileComponent** — perfil públic amb cover, avatar, follow, chips de
  comunitats, feed i modal de followers/following.
- **SettingsComponent** — 3 seccions independents (Profile / Account /
  Password) amb *Reactive Forms*.
- **SearchComponent** — pàgina completa de cerca amb tabs i paginació.
- **LoginComponent**, **RegisterComponent**.

---

## 11. Serveis del frontend

A `core/services/`:

- **ApiService** — wrapper bàsic sobre `HttpClient` amb la `apiUrl`.
- **AuthService** — *token* en memòria, signal `currentUser`, computed
  `isAuthenticated`. Mètodes `login`, `register`, `logout`, `refreshToken`,
  `getToken`, `loadCurrentUser`, `updateCurrentUser(patch)`.
- **authInterceptor** (`core/interceptors/`) — *functional* interceptor:
  afegeix Bearer, reintenta una vegada en 401 via `/auth/refresh`, fa
  *logout* + redirecció a `/login` si falla.
- **authGuard** (`core/guards/`) — redirigeix a `/login` si no autenticat.
- **NotificationService** — fusiona notificacions del backend (per a
  usuaris autenticats, *polling* cada 30 s) amb notificacions locals
  (alertes del calendari econòmic i missatges interns dels mòduls Markets).
  Cada item té `link?` opcional que el dropdown del header fa servir per
  navegar.
- **MarketsContextService** — comparteix estat entre pestanyes de Markets
  (símbol seleccionat, notícies, etc.).
- **ToastService** — `show(message, type)` amb signal i auto-dismiss a 3 s.

A `features/<feature>/services/`:
- **CommunityService** — agrupa **tota** l'API de Community (feed, posts,
  comentaris, public/private CRUD, members, requests, discover, topics +
  PostReddit, pin). Exposa també un `Subject` (`communityMembershipChanged$`)
  per propagar canvis entre components.
- **ProfileService**, **SearchService**, **MarketService**.

---

## 12. Sistema de notificacions

Història: la primera versió era *front-only* amb `localStorage` (alertes
del calendari econòmic). A la fase 5 s'ha afegit persistència al backend
per cobrir events socials de Community.

### Backend
- `models/Notification.js` — `recipient`, `actor`, `type`, `title`,
  `message`, `link`, `read`, `createdAt`.
- `services/notificationService.js` — helpers `notify(...)` i
  `notifyMany(...)` (filtra duplicats i auto-notificacions).
- `controllers/notificationController.js` + `routes/notifications.js`.

Els hooks viuen dins dels controllers existents perquè una sola crida HTTP
generi tant l'efecte principal com la notificació:
- `userController.followUser` → notifica al seguit (només quan es passa de
  no seguir a seguir).
- `postXController.likePost` → notifica a l'autor del PostX (sense `link`).
- `postXController.createComment` → notifica a l'autor; si el comentari és
  sobre un PostReddit, el `link` apunta al detall del post.
- `discussionTopicController.createPostComment` → mateixa idea per a
  PostReddit (endpoint propi).
- `communityPrivateController.requestToJoin` → notifica líder + tots els
  moderadors.
- `communityPrivateController.handleJoinRequest` → si s'accepta, notifica
  al sol·licitant.
- `discussionController.createDiscussion` → notifica a l'autor del
  comentari sobre el qual s'ha obert el xat.

### Frontend (`NotificationService`)
- Manté dues llistes (servidor + local) i les fusiona ordenades per data.
- `refreshFromServer()` es crida en obrir el dropdown i cada 30 s
  automàticament. També es dispara quan canvia l'estat d'autenticació.
- `markOneAsRead(id)` i `markAllAsRead()` sincronitzen amb el backend
  (només per a notificacions del servidor; les locals només persisteixen
  a `localStorage`).
- Reprodueix `assets/audio/sound.mp3` quan arriben noves notificacions no
  llegides.
- L'`HeaderComponent` renderitza cada item com a `<button>` clicable
  quan té `link`, mostra una fletxa i fa `router.navigateByUrl(link)`.

### Estil del badge
- Color de fons: `--secondary-container` (#6cf8bb, verd clar de la marca).
- Color de text: `--on-secondary-container` (verd fosc).
- Sense border. `box-shadow` lleuger en verd per donar relleu.
- Versió mòbil al panell desplegable: mateixos tokens.

---

## 13. Pujada de fitxers i mèdia

- Configuració de `multer` a `backend/config/upload.js`.
- Imatges: jpg/png/gif/webp, ≤ 10 MB.
- Vídeos: mp4/webm/quicktime, ≤ 100 MB.
- Fitxers servits estàticament des de `/uploads/images/` i
  `/uploads/videos/`.
- Els avatars d'usuari només admeten URL (no upload). Els covers de
  comunitat sí que permeten upload.

---

## 14. Auth en detall

1. **Login**:
   - 5 intents fallits → bloqueig de 15 minuts (`loginAttempts` +
     `lockUntil` al model `User`).
   - En èxit, el backend retorna `accessToken` al body i posa `refreshToken`
     en cookie `httpOnly`.
2. **Refresh**: si una request torna 401, l'`authInterceptor` crida
   `/auth/refresh`, obté un nou access token, reintenta la request. Si
   falla, fa logout i redirigeix a `/login`.
3. **AuthGuard**: bloqueja l'accés a rutes privades quan no hi ha usuari.

---

## 15. Trending score (PostX)

```
baseScore = (likes × 1) + (commentCount × 2)
age < 24h   → score = baseScore × 1.0
age 24-48h  → score = baseScore × 0.5
age > 48h   → score = baseScore × 0.25
```

Un job a `server.js` recalcula tots els PostX cada 30 minuts via
`setInterval`. A les comunitats privades s'aplica al moment de la consulta
un **role bonus** (no persistit):
- leader +50, moderator +20, little_whale +10, member 0.

---

## 16. Cerca global

`GET /api/v1/search` cobreix:
- Usuaris (per `username`).
- PostX públics (`origin` ∈ {`general`, `public_community`}).
- Comunitats públiques i privades (nom + descripció — mai contingut intern).

**No** cobreix PostReddit ni temes de discussió (tenen el seu propi popup).

La pàgina `/search` és *URL-driven*: `?q=&type=&page=`. Amb `type=all`
mostra top 3 per categoria + "See all X"; amb filtre concret, paginació
de 10 per pàgina.

---

## 17. Estat actual del projecte

- ✅ **Phase 1 — Infraestructura.**
- ✅ **Phase 2 — Auth.**
- 🔄 **Phase 3 — Community.** Backend complet. Frontend gairebé complet
  (feed, perfil, comunitats públiques/privades, temes, PostReddit,
  discussions, cerca, discover).
- 🔄 **Phase 4 — Markets.** Overview live + TradingView + Economic Calendar
  + News + Charts fets. Pendents: pàgina per actiu, watchlist, alertes.
- 🔄 **Phase 5 — Assistant + Notifications + Home polish.** Sistema de
  notificacions amb backend persistent i hooks de Community **fet**.
  Assistent IA en desenvolupament.

Pendents coneguts:
- Pàgines per actiu individual a Markets.
- Watchlist persistent al backend.
- Alertes de preu (no només de calendari).
- Pujada d'avatar via upload (avui només URL).
- Conversió de comunitat pública ↔ privada (no prevista).
- Push notifications natives.

---

## 18. Com afegir una nova funcionalitat (checklist)

1. **Definir el contracte d'API**: ruta, mètode, body, resposta. Documenta-ho
   al CLAUDE.md del backend.
2. **Crear/modificar el model Mongoose** si cal.
3. **Crear el controller** amb `async/await` i `next(err)`. Errors com
   `{success:false, message, code}`.
4. **Afegir la ruta** a `routes/` i muntar-la a `routes/index.js`.
5. **Si genera events socials**, crida el helper `notify(...)` o
   `notifyMany(...)` amb un `type` coherent (afegir-lo a l'enum de
   `models/Notification.js` si és nou).
6. **Frontend service**: afegir mètode a `CommunityService` (o crear-ne un
   de nou si toca una feature pròpia).
7. **Component**: crear-lo com a *standalone* i registrar-lo amb
   `loadComponent` a `app.routes.ts`. Avisar l'equip del canvi.
8. **CSS**: utilitzar variables. Si és una pàgina, crear/actualitzar el
   `DESIGN.md` local.
9. **Tests** (Vitest) si la lògica és no trivial.
10. **Actualitzar `CLAUDE.md`** (arrel + frontend o backend segons
    correspongui) i, si cal, `README.md`.
11. **Commit** seguint l'estil del repositori (vegeu `git log`).

---

## 19. Trucs útils i errors freqüents

- **El frontend no arriba al backend** dins de Docker → comprova que
  `environment.apiUrl` apunta a `http://localhost:3000/api/v1` (des del
  navegador del host). Dins de Docker, el backend es connecta a Mongo via
  `mongodb://mongo:27017/markethub`, no a `localhost`.
- **CORS** — backend permet origin `http://localhost:4200` per defecte.
- **JWT_SECRET no definit** → el backend no arrenca. Revisa `.env`.
- **Tailwind CDN warning** — és acceptat per ara; en producció es
  substituirà per una build local.
- **Conflicte de merge a `app.routes.ts`** — comunica sempre qualsevol
  canvi a la branca compartida.
- **`mediaUrl` retornat com a path relatiu** — el pipe `MediaUrlPipe`
  resol l'URL completa amb el host del backend.
- **Notificacions duplicades** — `notify()` filtra auto-notificacions
  (quan actor i recipient són el mateix); `notifyMany()` deduplica a la
  llista de destinataris.

---

## 20. On mirar primer si entres nou al projecte

1. `README.md` — visió ràpida.
2. Aquest `prompt.md` — manual tècnic.
3. `context.md` — context exhaustiu (similar a aquest manual, en anglès).
4. `CLAUDE.md` (arrel) — convencions i regles vives.
5. `COMMUNITY.md` — especificació funcional completa de la xarxa social.
6. `frontend/CLAUDE.md` i `backend/CLAUDE.md` — detalls per subsistema.
7. `frontend/src/styles/variables.css` — sistema de disseny.
8. `frontend/src/app/app.routes.ts` — mapa de pàgines.
9. `backend/routes/index.js` — mapa d'endpoints.
10. `docker-compose.yml` — com s'orquestra tot.

Amb això i una passada pels controllers/models del backend i pels
serveis/components del frontend hauries de tenir prou context per fer
canvis amb seguretat.
