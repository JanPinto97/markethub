# PROMPT 3 — Community Frontend: Feed Central

## Context

Continuem amb el frontend de `/community` de **MarketHub**. El Prompt 1 va crear
l'esquelet de la pàgina i el Prompt 2 va implementar la sidebar esquerra.
Ara implementem el **feed central** amb lògica real: selector Trending/Following,
caixa de creació de post, i les targetes de posts connectades a l'API.

Llegeix `frontend/DESIGN.md` i `frontend/CLAUDE.md` abans d'escriure cap línia de codi.
Tot el CSS ha d'usar les variables del sistema de disseny.

---

## Objectiu

Implementar el feed central completament funcional: càrrega de posts reals,
creació de posts, sistema de likes i comentaris bàsic.

---

## Estructura del feed central

```
┌──────────────────────────────────────┐
│  [ Trending ]  [ Following ]         │  ← 3.1 Selector
├──────────────────────────────────────┤
│  [Avatar] What's on your mind...     │  ← 3.2 Caixa de creació
│  [🖼] [😊]                  [Post]  │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ Avatar  Nom @handle · 4h ago  │  │  ← 3.3 Targeta de post
│  │                                │  │
│  │ Text del post...               │  │
│  │                                │  │
│  │ 👍 12   💬 4                  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ ...                            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## 3.1 — Selector Trending / Following

Dues pestanyes a la part superior del feed:

- `Trending` — activa per defecte. Carrega posts ordenats per `trendingScore`.
- `Following` — requereix login. Si l'usuari no està autenticat i clica,
  redirigeix a `/login`.

En canviar de pestanya:

- Es fa una nova crida a l'API amb el mode corresponent.
- El feed es reseteja i carrega des del principi.
- L'estat actiu de la pestanya es reflecteix visualment.

**Endpoints:**

- `GET /api/posts/feed?mode=trending&page=1&limit=10`
- `GET /api/posts/feed?mode=following&page=1&limit=10`

---

## 3.2 — Caixa de creació de post

### Si l'usuari NO està autenticat:

- Mostra la caixa però desactivada (input readonly, botó disabled).
- Text al input: `"Sign in to join the conversation"`.
- En clicar l'input o el botó → redirigeix a `/login`.

### Si l'usuari SÍ està autenticat:

Targeta amb:

- **Avatar** de l'usuari a l'esquerra (del `AuthService`). Cercle placeholder si no té avatar.
- **Input de text** amb placeholder `"What's on your mind regarding the markets?"`.
  - El input creix en alçada a mesura que l'usuari escriu (`textarea` auto-resize).
  - Màxim 400 caràcters. Mostra comptador `"X/400"` quan l'usuari comença a escriure.
- **Fila d'accions** sota l'input:
  - Icona d'imatge (📷): obre un `<input type="file">` ocult. Accepta jpeg, png, gif, webp (màx 10MB).
    Si se selecciona un fitxer, mostra una previsualització en miniatura sobre la fila d'accions,
    amb una `x` per eliminar-la.
  - Icona d'emoji (😊): de moment `console.log('open emoji picker')`.
  - Botó `Post` a la dreta: disabled si el text és buit. En clicar, envia el post.

**Enviament del post:**

- Endpoint: `POST /api/posts`
- Body (FormData si hi ha imatge, JSON si no):
  ```
  text: string
  mediaFile?: File        ← si s'ha seleccionat imatge
  origin: 'general'
  ```
- En èxit: afegeix el nou post al capdamunt del feed sense recarregar tota la llista.
  Neteja l'input i la previsualització.
- En error: mostra un missatge d'error discret sota la caixa (no un alert del navegador).

---

## 3.3 — Targetes de posts (PostX)

Cada post del feed es renderitza com una targeta. Implementa un component
`PostCardComponent` reutilitzable:

```
frontend/src/app/features/community/components/post-card/
├── post-card.component.ts
├── post-card.component.html
└── post-card.component.css
```

### Estructura de cada targeta:

**Capçalera:**

- Avatar de l'autor (cercle; si no té avatar, inicial del username amb color de fons consistent).
- Nom complet de l'autor (o username si no té nom). `routerLink="/profile/:username"`.
- Handle `@username` en text secundari.
- Temps relatiu des de la publicació (ex: "4h ago", "2d ago"). Usa una funció utilitària simple,
  no cal cap llibreria externa.
- Si el post prové d'una comunitat pública (`origin: 'public_community'`):
  mostra una etiqueta/badge discreta amb el nom de la comunitat sota el handle.
- Menú de tres punts (`···`) a la dreta de la capçalera, visible en hover.
  Opcions del menú:
  - Si ets l'autor: `Edit` (de moment `console.log`) i `Delete`.
  - Si ets moderator/superadmin de plataforma: `Delete`.
  - Si no ets l'autor ni moderador: `Report` (de moment `console.log`).

**Cos:**

- Text del post. Si supera 280 caràcters, mostra'n els primers 280 i un botó `"See more"`
  que expandeix el text complet inline (sense navegar).
- Si hi ha `mediaUrl` (imatge): mostra la imatge sota el text, a l'amplada completa de la
  targeta, amb `border-radius` consistent, i alçada màxima de ~400px (`object-fit: cover`).

**Peu:**

- **Like:** icona de polze amunt + número. En clicar (requereix login):
  - Toggle: si ja has donat like, el treu; si no, l'afegeix.
  - Actualitza el número de forma optimista (immediatament, sense esperar la resposta).
  - Reverteix si la crida falla.
  - Endpoint: `POST /api/posts/:id/like` (toggle, el backend gestiona afegir/treure).
  - L'icona té un estat visual diferenciat quan l'usuari ha donat like (color accent).
- **Comentaris:** icona de bombolles + número. En clicar, expandeix una secció de comentaris
  directament sota el peu de la targeta (inline, no navega). Veure especificació a continuació.
- No hi ha botó de compartir en aquesta fase.

---

## 3.4 — Secció de comentaris (inline)

En clicar la icona de comentaris d'un post, es desplega una secció sota la targeta:

**Càrrega:**

- Endpoint: `GET /api/posts/:postId/comments`
- Mostra un estat de carregant mentre es carreguen.

**Visualització de comentaris:**

- Cada comentari: avatar + username + temps + text.
- Màxim 5 comentaris visibles inicialment. Si n'hi ha més, botó `"Load more"`.
- Els comentaris estan aplanat (un sol nivell de niament, sense fils visuals de resposta).

**Caixa de nou comentari** (requereix login):

- Input de text inline amb placeholder `"Write a comment..."`.
- Botó `Send` a la dreta.
- Màxim 400 caràcters.
- En enviar: `POST /api/posts/:postId/comments` amb `{ text: string }`.
- En èxit: afegeix el comentari al capdamunt de la llista de forma optimista.

---

## 3.5 — Paginació del feed (infinite scroll)

- Carrega 10 posts per pàgina.
- Quan l'usuari arriba prop del final del feed (últims ~200px), carrega automàticament
  la pàgina següent i afegeix els posts a la llista existent.
- Usa `IntersectionObserver` per detectar quan cal carregar més.
- Mostra un spinner discret mentre carrega la pàgina següent.
- Quan no hi ha més posts, mostra un text `"You're all caught up 🎉"`.

---

## Eliminació de posts

Quan l'usuari selecciona `Delete` al menú de tres punts:

- Mostra un diàleg de confirmació simple (pot ser un `confirm()` natiu del navegador
  o un petit popup inline, el que quedi més net).
- En confirmar: `DELETE /api/posts/:id`.
- En èxit: elimina la targeta del feed amb una animació de fade-out.
- En error: mostra missatge d'error discret.

---

## Servei Angular — ampliar CommunityService

Afegeix els mètodes necessaris a l'existent `community.service.ts`:

```typescript
getFeed(mode: 'trending' | 'following', page: number): Observable<PostX[]>
createPost(formData: FormData | CreatePostDto): Observable<PostX>
likePost(postId: string): Observable<{ liked: boolean; count: number }>
deletePost(postId: string): Observable<void>
getComments(postId: string): Observable<Comment[]>
addComment(postId: string, text: string): Observable<Comment>
```

---

## Fitxers a crear o modificar

```
frontend/src/app/features/community/
├── community.component.ts          → lògica del feed, selector, infinite scroll
├── community.component.html        → estructura del feed central
├── community.component.css         → estils del feed
├── services/
│   └── community.service.ts        → ampliar amb mètodes del feed
└── components/
    └── post-card/
        ├── post-card.component.ts
        ├── post-card.component.html
        └── post-card.component.css
```

---

## Regles

- CSS custom pur, variables del `DESIGN.md`.
- Usa `@if` i `@for` d'Angular 17+ (sintaxi nova, no `*ngIf` ni `*ngFor`).
- Usa `inject()` en comptes de constructor injection.
- Tots els components han de ser `standalone: true`.
- **Optimistic updates** per a likes: actualitza la UI immediatament, reverteix en error.
- **No implementis** el modal de "Create Community" ni el buscador de topics.
- **No implementis** cap pàgina de detall de post, comunitat ni perfil.
- Les animacions han de ser suaus i subtils (CSS transitions), coherents amb el DESIGN.md.

---

## Resultat esperat

Al final d'aquest prompt, el feed central ha de:

- ✅ Carregar posts reals de l'API en mode Trending per defecte
- ✅ Canviar entre Trending i Following (amb redirect a login si no autenticat)
- ✅ Permetre crear posts amb text i/o imatge
- ✅ Mostrar targetes de post amb avatar, autor, text, imatge opcional i interaccions
- ✅ Sistema de likes amb optimistic update i estat visual
- ✅ Secció de comentaris expandible inline
- ✅ Infinite scroll amb IntersectionObserver
- ✅ Eliminació de posts amb confirmació
- ✅ Gestió d'estats: carregant, buit, error, fi de llista
- ✅ CSS cohesiu amb el sistema de disseny del projecte
