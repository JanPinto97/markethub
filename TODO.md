# MarketHub — TODO: Community Page

Estat actual: feta l'estructura de 3 columnes, sidebar esquerra funcional, feed central funcional (Trending/Following, crear post, targetes PostX, likes optimistes, comentaris inline, infinite scroll, eliminació). Falta tot allò marcat a sota segons `COMMUNITY.md`.

---

## 1. Feed General (parcialment fet)

### Pendents funcionals

- [ ] **Trending real barrejat**: verificar que el `getFeed` a backend barreja posts de `general` + `public_community` (ara filtra amb `origin: { $in: ['general', 'public_community'] }` — OK, però cal comprovar que els posts de comunitats públiques arriben amb `community.name` populat perquè es mostri el badge).
- [ ] **Crear post amb vídeo**: actualment només s'accepta imatge (jpeg/png/gif/webp). Afegir acceptació de vídeo (mp4, webm) al `<input type="file">` i al `mediaType` del formulari.
- [ ] **Reproductor de vídeo** a `PostCardComponent` quan `mediaType === 'video'` (ara només es renderitza `image`).
- [ ] **Emoji picker** real (ara és un `console.log`).
- [ ] **Notificació toast / missatge d'èxit** en crear un post (opcional però bonic).
- [ ] **Retry** al botó de "Could not load feed. Please try again."

### Pendents de disseny

- [ ] Revisar espaiat i amplada de la caixa de creació en mòbil (≤ 640px).
- [ ] Transicions més polides al fade-out d'eliminació (ara 300ms lineal).
- [ ] Estat `hover` diferenciat a les targetes (ara no n'hi ha).

---

## 2. Comunitats Públiques (tot pendent de frontend)

### Pàgines / vistes

- [ ] **Pàgina de detall `/community/c/:id`** (ruta encara no creada).
  - Capçalera: avatar/banner de la comunitat, nom, descripció, nombre de membres, botó **Join** o **Leave**.
  - Feed de la comunitat (ordenat per trending score, només d'aquesta comunitat).
  - Caixa de creació de post (`origin: 'public_community'`, només si ets membre).
  - Si no ets membre: feed visible però caixa de creació oculta.
- [ ] **Modal "Create Community"** (botó a la sidebar): formulari amb nom, descripció, avatar, tipus (public / private) amb avís clar que el tipus és **irreversible**.
- [ ] **Modal "Discover Communities"** o pàgina `/community/explore`: llistar comunitats públiques amb buscador i paginació.

### Funcionalitats

- [ ] Join / Leave amb crides a `POST /communities/public/:id/join` i `/leave`.
- [ ] En sortir com a únic membre: confirmar que el backend fa auto-delete i redirigir a `/community`.
- [ ] Mostrar badge de comunitat al feed general (ja tenim el suport al model; falta validar que s'omple bé).

### Enllaços

- [ ] Els elements de `MY COMMUNITIES` a la sidebar enllacen a `/community/c/:id` — crear la ruta.
- [ ] El badge de comunitat en una `PostCardComponent` hauria de ser clicable cap a la pàgina de la comunitat.

---

## 3. Comunitats Privades (tot pendent de frontend)

### Pàgines / vistes

- [ ] **Pàgina de detall `/community/p/:id`** (només membres). Si no ets membre redirigir o mostrar "Request to Join".
- [ ] **Popup "Request to Join"**: textarea (max 150 chars), enviament a `POST /communities/private/:id/request`.
- [ ] **Pàgina / secció "Community Details"** accessible des de dins de la comunitat:
  - **Membre base**: llista de membres amb rol, botó Leave.
  - **Moderator / Leader**: llista de pending requests. Clic → popup amb el missatge complet + botons Accept/Reject. Botó Expel al costat de cada `member`.
  - **Leader**: botó Promote al costat de cada membre (obre menú amb rols: moderator / little_whale), botó **Delete Community**.

### Funcionalitats

- [ ] Join request flow amb estats pending/accepted/rejected (feedback visible a l'usuari).
- [ ] Accept/Reject requests (`POST /communities/private/:id/requests/:requestId`).
- [ ] Expel (`DELETE /communities/private/:id/members/:userId`).
- [ ] Promote / canvi de rol (`PUT /communities/private/:id/members/:userId/role`).
- [ ] Leave (`POST /communities/private/:id/leave`) + gestió visual de la successió de lideratge.
- [ ] Delete community (leader only).
- [ ] **Pinned posts**: botó Pin/Unpin només per leader; pinned apareixen al capdamunt.
- [ ] **Delete post** / **delete comment** com a leader o moderator (ara només ho pot fer l'autor o el mod de plataforma).

### Disseny

- [ ] **Visual role differentiation** al feed privat — colors de fons subtils per rol:
  - Leader / Moderator / Little Whale: cada un amb el seu background definit al DESIGN.md (**encara per decidir**).
- [ ] Badges/etiquetes de rol visibles al costat del username dins la pàgina de detalls de membres.

---

## 4. Topics de Discussió (tot pendent de frontend)

### Pàgines / vistes

- [ ] **Pàgina de topic `/community/t/:slug`**:
  - Capçalera: nom + categoria + descripció.
  - Selector d'ordenació: **Top (per score net)** / **Recent**.
  - Feed de `PostReddit` (format totalment diferent: títol + text + votes).
  - Caixa de creació de `PostReddit` (títol + text + media opcional).
- [ ] **Component `PostRedditCard`** nou (MAI reutilitzar `PostCardComponent`):
  - Votes (upvote/downvote) al costat, net score al mig.
  - Title clicable (va a detall).
  - Body: preview, expandir inline o detall.
  - Comentaris sense likes.
- [ ] **Pàgina de detall d'un PostReddit** `/community/t/:slug/p/:postId` (o modal) amb comentaris.
- [ ] **Popup "Search Topics"** (botó `+ Add Topics` a la sidebar):
  - Buscador + botons de filtre per categoria (UX similar a TradingView asset search).
  - Resultats: cada topic amb botó Pin / Go.
  - Pin guarda a `localStorage` (ja implementat el helper, falta la UI).

### Funcionalitats

- [ ] Vote toggle (`POST /topics/:slug/posts/:postId/vote` amb body `{vote: "up"|"down"|"none"}`).
- [ ] Crear PostReddit (`POST /topics/:slug/posts` multipart).
- [ ] Delete (autor, mod plataforma, superadmin).
- [ ] Comentaris sense likes (assegurar que `PostCardComponent` no s'utilitza aquí).

### Disseny

- [ ] Definir un estil Reddit-like coherent amb el DESIGN.md per a `PostRedditCard`.

---

## 5. Cerca general (header)

- [ ] **Implementar la barra de cerca** del header. Ara mateix és només un input sense acció.
- [ ] **Dropdown de resultats** o **pàgina `/search`** amb:
  - Filtres: users / posts / communities (públiques i privades — només nom).
  - Crida a `GET /api/v1/search?q=...&type=...`.
- [ ] NO ha de cercar topics ni PostReddit (hi ha el popup dedicat).

---

## 6. Perfil d'usuari (`/profile/:username`)

- [ ] Ruta encara **no existeix** — els `routerLink="/profile/..."` apunten a enlloc.
- [ ] Crear la pàgina pública amb:
  - Header: avatar, cover image, username, bio, follower count, following count.
  - Llista de comunitats públiques de les quals és membre.
  - Feed de **PostX** (general + public communities) — **MAI** PostReddit, **MAI** posts de privades.
  - Botó Follow/Unfollow (`POST /users/:username/follow`).
- [ ] Llistat de followers / following amb paginació.

---

## 7. Settings (`/settings`)

- [ ] La icona ⚙ del header enllaça a `/settings` però la ruta **no existeix** encara.
- [ ] Crear pàgina privada amb:
  - Canvi d'username (`PUT /profile`).
  - Canvi d'email (`PUT /profile`).
  - Canvi de password (`PUT /profile/password`, requereix password actual).
- [ ] Cover image upload (backend ja suporta el camp).

---

## 8. Comentaris — Pendents específics

- [ ] **Replies** (un nivell de niament): actualment `PostCardComponent` només mostra comentaris de primer nivell.
  - Botó "Reply" a cada comentari.
  - Etiqueta "replying to @username's comment" als fills.
  - Backend ja ho suporta (`parentComment` + `replyingTo`).
- [ ] **Likes als comentaris de PostX** (backend ho suporta, no està implementat al front).
- [ ] **Delete comment** com a mod de comunitat / leader / mod de plataforma / superadmin.

---

## 9. Rols de plataforma (superadmin / moderator platform)

- [ ] Icones o badges visuals per distingir superadmins i moderadors de plataforma al costat del seu username.
- [ ] Poder eliminar qualsevol post / comentari des de qualsevol lloc (parcialment fet, revisar cobertura total).

---

## 10. Seeders i dades

- [ ] **Revisar** que el seed de topics de discussió cobreix totes les 4 categories i els noms exactes del COMMUNITY.md (Forex, Crypto, Stocks, Indices, ETFs, Bonds, Commodities, Metals, Energy / Macro Economics, Central Banks, Interest Rates, Inflation, GDP & Economic Data, Monetary Policy, Fiscal Policy, Geopolitics, Global Economy / Large Cap Stocks, Small Cap & Penny Stocks, Growth Stocks, Value Investing, Dividend Investing, IPOs, SPACs, Startups & VC, Real Estate & REITs / Day Trading, Swing Trading, Position Trading, Long-term Investing, Scalping, Algorithmic Trading, Quant Trading, High Frequency Trading).
- [ ] **Seed de dades de prova** per facilitar el desenvolupament:
  - Usuaris variats (members, moderators, little whales, leaders).
  - 2-3 comunitats públiques amb 10-20 posts cadascuna.
  - 2-3 comunitats privades amb membres de rols variats, pending requests i posts pinned.
  - Posts variats al feed general (amb imatges de mostra).
  - Comentaris amb replies.
  - Users que segueixen entre ells (per provar el mode Following).
  - PostReddits dins diferents topics amb upvotes/downvotes reals.

---

## 11. Estats, accessibilitat i polish global

- [ ] **Responsive** de tota la pàgina: ara mateix pensat només per desktop ≥ 1024px. Cal col·lapsar sidebars en tablet/mòbil.
- [ ] **Focus visible** a tots els botons i enllaços (accessibilitat).
- [ ] **aria-label** a les icones-botó (menú, like, comments, image upload, etc.).
- [ ] **Tancar el menú de tres punts** en fer clic fora (actualment queda obert).
- [ ] **Loading skeletons** més consistents al feed (ara és text pla "Loading posts…").
- [ ] **Reintent automàtic** en errors de xarxa transitoris.
- [ ] **Missatge de sessió expirada** explícit en lloc del redirect silent.

---

## 12. Documentació

- [ ] Mantenir actualitzat `frontend/CLAUDE.md` a cada feature nova.
- [ ] Mantenir actualitzat `frontend/src/app/features/community/DESIGN.md` amb tokens nous (rols privats, `PostRedditCard`, etc.).
- [ ] Actualitzar `CLAUDE.md` arrel amb l'estat de la Fase 3 quan es completi.

---

## Prioritat suggerida

1. Perfil d'usuari públic + Settings (desbloqueja els `routerLink` trencats).
2. Replies i likes als comentaris (complet la feature del feed central).
3. Pàgina de comunitat pública + Join/Leave + modal Create Community.
4. Topics: popup de cerca + pàgina de topic + `PostRedditCard`.
5. Comunitats privades (la més complexa: rols, requests, successió).
6. Cerca general del header.
7. Responsive i polish global.
