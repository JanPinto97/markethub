# PROMPT 9 — Topics: popup de cerca, pàgina de topic i PostRedditCard

## Abans de començar

1. Llegeix `frontend/CLAUDE.md` — estructura de components i convencions del projecte.
2. Llegeix `frontend/DESIGN.md` — tots els tokens CSS. Cap valor hardcoded de color, font o espaiat.
3. Llegeix `backend/CLAUDE.md` — endpoints disponibles i models.

**Regla fonamental d'aquest prompt:** `PostRedditCard` i `PostCardComponent` són components completament separats. Mai es reutilitzen entre ells, mai apareixen junts en cap feed. Si et veus temptат de reutilitzar `PostCardComponent` per a PostReddit, para i no ho facis.

Llegeix el codi existent de `community.component`, `community.service.ts` i `PostCardComponent` abans de modificar res.

---

## Tasca

Implementar el sistema de topics de discussió:

1. Popup "Search Topics" (botó `+ Add Topics` de la sidebar)
2. Pàgina de topic `/community/t/:slug`
3. Component `PostRedditCard` (nou, independent de `PostCardComponent`)
4. Caixa de creació de `PostReddit`

---

## Rutes Angular a afegir

```typescript
{
  path: 'community/t/:slug',
  loadComponent: () => import('./features/community/pages/topic-detail/topic-detail.component')
    .then(m => m.TopicDetailComponent)
}
```

La ruta no requereix login per veure el feed. Crear posts sí requereix login.

---

## Estructura de fitxers a crear

```
frontend/src/app/features/community/
├── pages/
│   └── topic-detail/
│       ├── topic-detail.component.ts
│       ├── topic-detail.component.html
│       └── topic-detail.component.css
└── components/
    ├── topic-search-popup/
    │   ├── topic-search-popup.component.ts
    │   ├── topic-search-popup.component.html
    │   └── topic-search-popup.component.css
    └── post-reddit-card/
        ├── post-reddit-card.component.ts
        ├── post-reddit-card.component.html
        └── post-reddit-card.component.css
```

---

## Model de dades

### DiscussionTopic

```typescript
interface DiscussionTopic {
  _id: string;
  name: string;
  slug: string;
  category:
    | "CORE_MARKETS"
    | "ECONOMIA_I_MACRO"
    | "ASSETS_ESPECIFICS"
    | "TRADING_I_INVERSIO";
  description?: string;
  postCount: number;
}
```

### PostReddit

```typescript
interface PostReddit {
  _id: string;
  title: string; // màx 300 chars
  text?: string; // màx 2000 chars
  mediaUrl?: string;
  mediaType?: "image" | "video";
  author: { username: string; avatar?: string };
  topic: string; // slug del topic
  upvotes: number;
  downvotes: number;
  score: number; // upvotes - downvotes
  userVote: "up" | "down" | null; // vot de l'usuari autenticat, null si no ha votat
  commentCount: number;
  createdAt: string;
}
```

---

## Endpoints del backend

```
GET  /api/topics                          → tots els topics (per al popup)
GET  /api/topics?ids=id1,id2,id3          → topics específics per ID (sidebar)
GET  /api/topics/:slug                    → detall d'un topic
GET  /api/topics/:slug/posts?sort=top|recent&page=1&limit=10  → posts del topic
POST /api/topics/:slug/posts              → crear PostReddit (multipart/form-data)
POST /api/topics/:slug/posts/:postId/vote → votar { vote: 'up' | 'down' | 'none' }
```

---

## 1. Popup "Search Topics"

### Activació

El botó `+ Add Topics` de la sidebar esquerra ja existeix amb un `console.log`. Substitueix-lo per obrir aquest popup.

### Disseny del popup

No és un modal centrat sinó un **popover** posicionat prop del botó que l'obre (a la dreta o a sobre, el que quedi millor visualment). Si la pantalla és petita, pot ser un modal centrat com a fallback.

```
┌────────────────────────────────────────┐
│  🔍 [Search topics...]           [X]  │
├────────────────────────────────────────┤
│  [CORE MARKETS] [MACRO] [ASSETS] [TRD] │  ← filtres de categoria
├────────────────────────────────────────┤
│  📈 Forex               [Pin] [Go →]  │
│  ₿  Crypto              [Pin] [Go →]  │
│  📊 Stocks              [Pin] [Go →]  │
│  🏦 Interest Rates      [Pin] [Go →]  │
│  ...                                  │
└────────────────────────────────────────┘
```

### Comportament del buscador

- `<input>` amb placeholder `"Search topics..."`. Focus automàtic en obrir el popup.
- Filtra la llista **localment** (no fa crida a l'API per cada tecla). La llista completa de topics es carrega una sola vegada en obrir el popup: `GET /api/topics`.
- La cerca filtra per `name` (case-insensitive, substring).
- Si no hi ha resultats: text `"No topics found."`.

### Filtres de categoria

Botons de filtre horitzontals:

- `All` (per defecte, seleccionat)
- `Core Markets`
- `Macro`
- `Assets`
- `Trading`

Mapen a les categories del backend:

```typescript
const CATEGORY_LABELS: Record<string, string> = {
  CORE_MARKETS: "Core Markets",
  ECONOMIA_I_MACRO: "Macro",
  ASSETS_ESPECIFICS: "Assets",
  TRADING_I_INVERSIO: "Trading",
};
```

Un sol filtre actiu alhora. En combinar cerca + filtre, s'apliquen els dos.

### Icones de categoria

Cada topic de la llista mostra una icona a l'esquerra basada en la seva categoria. Usa la mateixa lògica que ja existeix a la sidebar (si la sidebar ja les implementa del Prompt 2, importa la funció o el map de icones; no el dupliquis).

### Botons per topic

Cada fila té dos botons:

- **Pin** (📌 o similar): afegeix/treu el topic de la sidebar (localStorage).
  - Si ja està pinat: canvia a estat "pinat" (icona plena o color diferent). En clicar de nou → desapina.
  - Crida `addPinnedTopic(id)` o `removePinnedTopic(id)` (helpers ja existents del Prompt 2).
  - La sidebar s'actualitza immediatament sense tancar el popup.
- **Go →**: navega a `/community/t/:slug` i tanca el popup.

### Gestió del popup

- Controla l'obertura des de `community.component.ts` amb `showTopicSearchPopup: boolean`.
- Tanca en clicar fora (`@HostListener('document:click')`).
- Tanca en prémer `Escape`.
- La llista de topics es carrega **una sola vegada** per sessió de component. Guarda-la en una variable local; no refacis la crida en cada obertura del popup.

---

## 2. Pàgina de topic `/community/t/:slug`

### Layout

Columna central centrada sense sidebars, mateixa amplada que el feed de `/community`.

```
┌─────────────────────────────────────────────┐
│  [Icona categoria]  Nom del topic           │
│  Categoria · X posts                        │
│  Descripció (si existeix)                   │
├─────────────────────────────────────────────┤
│  Ordenació:  [🔥 Top]  [🕐 Recent]         │
├─────────────────────────────────────────────┤
│  Caixa de creació de PostReddit             │
├─────────────────────────────────────────────┤
│  [PostRedditCard]                           │
│  [PostRedditCard]                           │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### Capçalera del topic

- Icona de categoria (mateixa lògica que al popup).
- Nom del topic prominent.
- `Categoria · X posts` en text secundari.
- Descripció si existeix.

### Selector d'ordenació

Dues opcions:

- **🔥 Top** (per defecte): ordenat per `score` descendent (`sort=top`).
- **🕐 Recent**: ordenat per `createdAt` descendent (`sort=recent`).

En canviar: reseteja el feed i fa nova crida.

### Caixa de creació de PostReddit

Visible per a tothom però funcional només si autenticat.

**Si no autenticat:** caixa desactivada amb text `"Sign in to join the discussion"`. En clicar → `/login`.

**Si autenticat**, la caixa té dos camps (diferent de la caixa de PostX):

```
┌──────────────────────────────────────────┐
│  Title *                                 │
│  [input text, màx 300 chars]    X/300   │
├──────────────────────────────────────────┤
│  [textarea "Add more detail...", màx 2000 chars]  │
│                                          │
│  [🖼]  [😊]                   [Post]   │
└──────────────────────────────────────────┘
```

- `Title` és obligatori. El botó `Post` és disabled si `title` és buit.
- El `textarea` és opcional i fa auto-resize.
- Icona d'imatge: obre `<input type="file">`. Accepta imatges i vídeos (mateixos formats i mides que al feed general). Previsualització igual que a `PostCardComponent`.
- Icona d'emoji: usa `EmojiPickerComponent` existent (Prompt 6).
- Enviament: `POST /api/topics/:slug/posts` com a `multipart/form-data` si hi ha fitxer, JSON si no.
  ```typescript
  { title: string; text?: string; mediaFile?: File }
  ```
- En èxit: afegeix el nou PostReddit al capdamunt del feed. `ToastService.show('Post published.')`. Neteja els camps.
- En error: missatge inline sota el botó.

### Feed de PostReddit

- Usa `PostRedditCard` (nou component, veure Secció 3).
- Infinite scroll amb `IntersectionObserver` (mateix patró que el feed general).
- Skeletons mentre carrega (`PostSkeletonComponent` existent — adapta'l si cal per reflectir l'estructura de PostReddit, o usa-lo tal qual si és prou genèric).
- Estat buit: `"No posts yet. Start the discussion!"`.
- Estat d'error amb retry.

---

## 3. Component PostRedditCard

**Aquest component és completament independent de `PostCardComponent`.** No comparteixen CSS, no comparteixen lògica, no s'hereten. Si necessites una funció utilitària compartida (com el temps relatiu o `color.utils.ts`), importa-la des de `shared/utils`, però els components en si són separats.

### Estructura visual

```
┌─────────────────────────────────────────────────┐
│  ┌──────┐  Títol del post (clicable)            │
│  │  ▲  │  Posted by @username · 4h ago          │
│  │ 42  │                                         │
│  │  ▼  │  Preview del text (màx 3 línies)       │
│  └──────┘  [Veure imatge si en té]              │
│                                                  │
│  💬 84 comments                                 │
└─────────────────────────────────────────────────┘
```

### Columna de vots (esquerra)

Bloc vertical a l'esquerra de tot el contingut:

- Botó ▲ (upvote)
- Score net (`upvotes - downvotes`) centrat
- Botó ▼ (downvote)

**Lògica de vots:**

- Si `userVote === 'up'`: botó ▲ en color accent (taronja o verd, coherent amb DESIGN.md). Botó ▼ neutral.
- Si `userVote === 'down'`: botó ▼ en color accent (vermell o diferent de l'upvote). Botó ▲ neutral.
- Si `userVote === null`: tots dos neutres.

**En clicar ▲:**

- Si `userVote !== 'up'`: envia `{ vote: 'up' }`. Optimistic: `upvotes++`, si tenia downvote `downvotes--`.
- Si `userVote === 'up'` (ja havia votat up): envia `{ vote: 'none' }`. Optimistic: `upvotes--`.

**En clicar ▼:**

- Si `userVote !== 'down'`: envia `{ vote: 'down' }`. Optimistic: `downvotes++`, si tenia upvote `upvotes--`.
- Si `userVote === 'down'`: envia `{ vote: 'none' }`. Optimistic: `downvotes--`.

Requereix login. Si no autenticat → redirect a `/login`.
Reverteix l'optimistic update si la crida falla.

Endpoint: `POST /api/topics/:slug/posts/:postId/vote` amb `{ vote: 'up' | 'down' | 'none' }`.
Retorna: `{ upvotes: number; downvotes: number; userVote: 'up' | 'down' | null }`.

### Contingut (dreta de la columna de vots)

- **Títol**: text prominent, clicable. En clicar → obre la vista de detall del post (Prompt 10). De moment afegeix `routerLink="/community/t/:slug/p/:postId"` (ruta del Prompt 10).
- **Meta**: `Posted by @username · temps`. Username clicable → `routerLink="/profile/:username"`.
- **Preview del text**: màxim 3 línies visibles (`-webkit-line-clamp: 3`). Si hi ha més → no cal "See more" en aquesta targeta (el detall complet és al Prompt 10).
- **Imatge/vídeo** si `mediaUrl` existeix: mateixa lògica que `PostCardComponent` (imatge amb `object-fit: cover`, vídeo amb controls natius). Alçada màxima 300px.
- **Peu**: `💬 X comments`. En clicar → navega a la pàgina de detall del post (Prompt 10).

### Menú de tres punts

Visible en hover a la cantonada superior dreta:

- Autor del post: `Delete`.
- `moderator` / `superadmin` de plataforma: `Delete`.
- Altres: cap opció (no mostris el menú).

En eliminar: `DELETE /api/topics/:slug/posts/:postId`. Fade-out + toast `"Post deleted."`.

### @Input del component

```typescript
@Input({ required: true }) post!: PostReddit;
@Input({ required: true }) topicSlug!: string;  // necessari per als endpoints de vote i delete
```

---

## Afegir mètodes al servei

Afegeix a `community.service.ts`:

```typescript
getAllTopics(): Observable<DiscussionTopic[]>
getTopicDetail(slug: string): Observable<DiscussionTopic>
getTopicPosts(slug: string, sort: 'top' | 'recent', page: number): Observable<PostReddit[]>
createTopicPost(slug: string, data: FormData | CreatePostRedditDto): Observable<PostReddit>
voteTopicPost(slug: string, postId: string, vote: 'up' | 'down' | 'none'): Observable<{ upvotes: number; downvotes: number; userVote: 'up' | 'down' | null }>
deleteTopicPost(slug: string, postId: string): Observable<void>
```

---

## Regles d'implementació

- CSS custom pur. Totes les variables del `DESIGN.md`.
- Sintaxi Angular 17+: `@if`, `@for`, `inject()`, `standalone: true`.
- **Mai barregis PostReddit i PostX** en cap array, feed o lògica de component.
- La llista de topics al popup es carrega una sola vegada (no per cada obertura).
- Els helpers de localStorage (`getPinnedTopicIds`, `addPinnedTopic`, `removePinnedTopic`) ja existeixen del Prompt 2. No els dupliquis. Si estan al servei, importa'ls des d'allà.
- Tanca el popup d'`Escape` i clic fora (`@HostListener`). Allibera els listeners a `ngOnDestroy`.
- L'optimistic update dels vots és la part més complexa: gestiona els tres estats (`up`, `down`, `none`) correctament i assegura't que el revert restaura l'estat anterior complet (no només el score, sinó també `userVote`, `upvotes` i `downvotes` per separat).
- `PostRedditCard` rep el `topicSlug` com a `@Input` perquè necessita saber a quin topic pertany per construir els endpoints. No l'infereixis del router dins el component fill.

---

## Resum de fitxers a crear o modificar

**Crear:**

```
frontend/src/app/features/community/pages/topic-detail/*
frontend/src/app/features/community/components/topic-search-popup/*
frontend/src/app/features/community/components/post-reddit-card/*
```

**Modificar:**

```
frontend/src/app/features/community/community.component.ts    → obrir popup
frontend/src/app/features/community/community.component.html  → @if popup
frontend/src/app/features/community/services/community.service.ts  → nous mètodes
frontend/src/app/app.routes.ts                                → nova ruta /community/t/:slug
```

---

## Resultat esperat

- ✅ Popup "Search Topics" amb cerca local + filtres de categoria + pin/unpin
- ✅ Pin actualitza la sidebar immediatament sense tancar el popup
- ✅ Pàgina `/community/t/:slug` amb capçalera, selector Top/Recent i feed
- ✅ Caixa de creació de PostReddit amb title obligatori + text opcional + media
- ✅ `PostRedditCard` independent de `PostCardComponent`
- ✅ Sistema de vots (up/down/none) amb optimistic update i revert correcte
- ✅ Preview de 3 línies amb `line-clamp`
- ✅ Eliminació per autor / mod / superadmin amb toast
- ✅ Infinite scroll al feed de topics
- ✅ Popup tanca amb Escape i clic fora
- ✅ Cap valor de CSS hardcoded
