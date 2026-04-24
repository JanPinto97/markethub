# PROMPT 10 — Detall de PostReddit i comentaris

## Abans de començar

1. Llegeix `frontend/CLAUDE.md` — estructura de components i convencions del projecte.
2. Llegeix `frontend/DESIGN.md` — tots els tokens CSS. Cap valor hardcoded de color, font o espaiat.
3. Llegeix `backend/CLAUDE.md` — endpoints disponibles i models.

**Regla fonamental:** Els comentaris de PostReddit **no tenen likes**. No reutilitzis la lògica de comentaris de `PostCardComponent` (que sí en té). La secció de comentaris d'aquest prompt és un component nou i independent.

Llegeix el codi existent de `PostRedditCard`, `topic-detail.component` i `community.service.ts` abans d'escriure res.

---

## Tasca

Implementar la pàgina de detall d'un PostReddit amb els comentaris complets:

1. Pàgina `/community/t/:slug/p/:postId`
2. Component `PostRedditCommentSectionComponent`
3. Replies d'un nivell als comentaris (sense likes)

---

## Ruta Angular a afegir

```typescript
{
  path: 'community/t/:slug/p/:postId',
  loadComponent: () => import('./features/community/pages/post-reddit-detail/post-reddit-detail.component')
    .then(m => m.PostRedditDetailComponent)
}
```

No requereix login per llegir. Comentar sí requereix login.

---

## Estructura de fitxers a crear

```
frontend/src/app/features/community/
├── pages/
│   └── post-reddit-detail/
│       ├── post-reddit-detail.component.ts
│       ├── post-reddit-detail.component.html
│       └── post-reddit-detail.component.css
└── components/
    └── post-reddit-comment-section/
        ├── post-reddit-comment-section.component.ts
        ├── post-reddit-comment-section.component.html
        └── post-reddit-comment-section.component.css
```

---

## Model de dades — comentaris de PostReddit

```typescript
interface RedditComment {
  _id: string;
  author: { username: string; avatar?: string };
  text: string;
  createdAt: string;
  parentComment?: string; // null si és arrel, id del pare si és reply
  replyingTo?: string; // username al qual respon
  replies?: RedditComment[]; // populat pel backend, màx un nivell
  // NO té: likes, likeCount
}
```

---

## Endpoints del backend

```
GET    /api/topics/:slug/posts/:postId              → detall complet del post
GET    /api/topics/:slug/posts/:postId/comments     → comentaris amb replies populades
POST   /api/topics/:slug/posts/:postId/comments     → nou comentari arrel
POST   /api/topics/:slug/posts/:postId/comments/:commentId/reply   → nova reply
DELETE /api/topics/:slug/posts/:postId/comments/:commentId         → eliminar comentari arrel
DELETE /api/topics/:slug/posts/:postId/comments/:commentId/replies/:replyId  → eliminar reply
POST   /api/topics/:slug/posts/:postId/vote         → votar (ja existent del Prompt 9)
```

---

## 1. Pàgina de detall `/community/t/:slug/p/:postId`

### Layout

```
┌─────────────────────────────────────────────────┐
│  ← Back to [Topic Name]                         │  ← link de tornada
├─────────────────────────────────────────────────┤
│  ┌──────┐  TÍTOL DEL POST                       │
│  │  ▲  │  Posted by @username · 4h ago          │
│  │ 42  │                                         │
│  │  ▼  │  TEXT COMPLET DEL POST                 │
│  └──────┘  (sense limit de línies)              │
│             [imatge / vídeo si en té]           │
├─────────────────────────────────────────────────┤
│  💬 84 comments                                 │
├─────────────────────────────────────────────────┤
│  [PostRedditCommentSectionComponent]            │
└─────────────────────────────────────────────────┘
```

Columna central centrada sense sidebars, mateixa amplada màxima que el feed.

### Link de tornada

`← Back to [nom del topic]` a la part superior. Clicable → `routerLink="/community/t/:slug"`. El nom del topic s'obté del detall del post o del paràmetre de ruta.

### Capçalera del post (versió detall)

Reutilitza l'estructura visual de `PostRedditCard` però **sense el `line-clamp`** i sense el `routerLink` al títol (ja estem a la pàgina de detall). El títol és text estàtic.

Específicament:

- **Columna de vots** a l'esquerra: mateixa lògica i estil que `PostRedditCard` (upvote / downvote / none, optimistic update, revert en error). Usa el mateix endpoint: `POST /api/topics/:slug/posts/:postId/vote`.
- **Títol**: H1, sense ser clicable.
- **Meta**: `Posted by @username · temps`.
- **Text complet**: sense límit de línies.
- **Imatge/vídeo**: mateixa lògica que `PostRedditCard`.
- **Menú de tres punts**: igual que a `PostRedditCard` (Delete per autor / mod / superadmin). En eliminar: `DELETE /api/topics/:slug/posts/:postId` → toast `"Post deleted."` → redirigeix a `/community/t/:slug`.

**Nota sobre reutilització:** No reutilitzis `PostRedditCard` per renderitzar el post a la pàgina de detall. La pàgina de detall renderitza el post de forma inline (dins el propi component `PostRedditDetailComponent`). `PostRedditCard` és per al feed; el detall és per a la pàgina. Comparteixen lògica de vots però no template.

Si vols evitar duplicar la lògica de vots, extreu-la a un mètode del servei i crida'l des dels dos llocs. No facis copy-paste de la lògica d'optimistic update.

---

## 2. Component PostRedditCommentSectionComponent

Un component independent per a la secció de comentaris. Rep el post com a input.

```typescript
@Input({ required: true }) postId!: string;
@Input({ required: true }) topicSlug!: string;
@Input({ required: true }) commentCount!: number;  // per mostrar el total al títol de la secció
```

### Capçalera de la secció

```
💬 84 comments
```

Text amb el total de comentaris. S'actualitza localment quan s'afegeix o elimina un comentari.

### Caixa de nou comentari (part superior de la secció)

Sempre visible a la part superior, abans de la llista de comentaris.

**Si no autenticat:**

- Caixa desactivada: `"Sign in to join the discussion"`. En clicar → `/login`.

**Si autenticat:**

```
┌──────────────────────────────────────────────┐
│  [Avatar]  Add a comment...          0/400   │
│                                   [Comment]  │
└──────────────────────────────────────────────┘
```

- `<textarea>` auto-resize, màxim 400 caràcters, comptador `X/400`.
- Botó `Comment` disabled si buit o en curs.
- Enviament: `POST /api/topics/:slug/posts/:postId/comments` amb `{ text: string }`.
- En èxit: afegeix el comentari al capdamunt de la llista de forma optimista. Neteja el textarea. Incrementa el comptador del títol de secció.
- En error: missatge inline sota el textarea.

### Llista de comentaris

- Carrega en muntar el component: `GET /api/topics/:slug/posts/:postId/comments`.
- Skeleton mentre carrega (3 ítems, usa `PostSkeletonComponent` o un skeleton inline simple).
- Estat buit: `"No comments yet. Be the first!"`.

**Ordenació:** Per `createdAt` descendent (els més recents primer). El backend ja ho fa; no cal lògica de client.

**Paginació:** `Load more` al final (no infinite scroll en la pàgina de detall). Carrega 10 comentaris per pàgina. Si no hi ha més → desapareix el botó.

### Estructura visual d'un comentari

```
┌─────────────────────────────────────────────────────┐
│ [Avatar] @username · 2h ago              [···]      │
│ Text del comentari sense límit de línies            │
│                                                     │
│ [Reply]                                             │
│                                                     │
│ │  [Avatar] @reply_user · 1h ago        [···]      │
│ │  @username_pare text de la reply                 │
│ │  [Reply]                                         │
└─────────────────────────────────────────────────────┘
```

Diferències respecte als comentaris de PostX:

- **Sense icona de like** ni comptador (ni als comentaris arrel ni a les replies).
- El botó `Reply` és l'única acció de peu (a part del menú de tres punts per eliminar).
- La línia vertical de les replies és la mateixa que als comentaris de PostX (`border-left`).

### Lògica de Reply

Idèntica al Prompt 7 però sense likes:

- Botó `Reply` a cada comentari arrel i cada reply.
- Màxim una caixa de reply oberta alhora (per tota la secció): `activeReplyCommentId: string | null`.
- La caixa inline indica `Replying to @username`.
- Enviament: `POST /api/topics/:slug/posts/:postId/comments/:commentId/reply`.
- Optimistic: afegeix la reply a la llista del comentari pare. Tanca la caixa.
- Un sol nivell de niament: una reply pot tenir botó `Reply`, però envia al comentari arrel (igual que al Prompt 7).

### Eliminació de comentaris

| Rol                       | Pot eliminar                   |
| ------------------------- | ------------------------------ |
| Autor del comentari       | El seu propi comentari / reply |
| `moderator` de plataforma | Qualsevol                      |
| `superadmin`              | Qualsevol                      |

- Menú de tres punts visible en hover. Opció `Delete`.
- Confirmació simple (patró consistent amb la resta del projecte).
- En eliminar comentari arrel: elimina visualment el comentari i totes les seves replies.
- Toast: `"Comment deleted."`.
- Decrementa el comptador del títol de secció.

---

## Càrrega de dades a PostRedditDetailComponent

En inicialitzar el component (`ngOnInit`):

1. Obté `slug` i `postId` dels `ActivatedRoute` params.
2. Crida `GET /api/topics/:slug/posts/:postId` → renderitza el post.
3. El component `PostRedditCommentSectionComponent` gestiona les seves pròpies dades (no les carrega el pare).

**Estats a gestionar:**

| Situació             | Comportament                                                    |
| -------------------- | --------------------------------------------------------------- |
| Post no trobat (404) | Missatge inline `"Post not found."` + link `← Back to topic`    |
| Carregant post       | Skeleton de la capçalera: bloc gran (títol) + bloc mitjà (meta) |
| Post carregat        | Renderitza tot                                                  |
| Error de xarxa       | `"Could not load post."` + botó Try again                       |

---

## Afegir mètodes al servei

Afegeix a `community.service.ts`:

```typescript
getTopicPostDetail(slug: string, postId: string): Observable<PostReddit>
getTopicPostComments(slug: string, postId: string, page: number): Observable<RedditComment[]>
addTopicComment(slug: string, postId: string, text: string): Observable<RedditComment>
addTopicReply(slug: string, postId: string, commentId: string, text: string): Observable<RedditComment>
deleteTopicComment(slug: string, postId: string, commentId: string): Observable<void>
deleteTopicReply(slug: string, postId: string, commentId: string, replyId: string): Observable<void>
```

---

## Regles d'implementació

- CSS custom pur. Totes les variables del `DESIGN.md`.
- Sintaxi Angular 17+: `@if`, `@for`, `inject()`, `standalone: true`.
- **Cap like** en cap comentari d'aquest prompt. Si en algun lloc apareix una icona de like als comentaris, és un error.
- La lògica de vots del post (upvote/downvote) és la mateixa que a `PostRedditCard` del Prompt 9. Si pots compartir un mètode del servei, fes-ho. No dupliquis l'optimistic update.
- `PostRedditCommentSectionComponent` gestiona les seves pròpies subscripcions i les dessubscriu a `ngOnDestroy` (o usa `takeUntilDestroyed()`).
- La paginació de comentaris és `Load more` (botó explícit), no infinite scroll. La pàgina de detall ja és una pàgina llarga; l'infinite scroll podria crear confusió.
- El link `← Back to [topic name]` usa `location.back()` o `routerLink` al slug. Prefereix `routerLink` fix (no `location.back()`) perquè l'usuari pot haver arribat des d'un link extern.

---

## Resum de fitxers a crear o modificar

**Crear:**

```
frontend/src/app/features/community/pages/post-reddit-detail/*
frontend/src/app/features/community/components/post-reddit-comment-section/*
```

**Modificar:**

```
frontend/src/app/features/community/services/community.service.ts  → nous mètodes
frontend/src/app/app.routes.ts                                → nova ruta /community/t/:slug/p/:postId
```

---

## Resultat esperat

- ✅ Ruta `/community/t/:slug/p/:postId` creada i accessible sense login
- ✅ Link de tornada al topic
- ✅ Post complet renderitzat (títol, text sense límit, media, vots)
- ✅ Sistema de vots idèntic al de `PostRedditCard` (optimistic, revert)
- ✅ Eliminació del post per autor / mod / superadmin → redirect al topic
- ✅ `PostRedditCommentSectionComponent` independent amb les seves pròpies dades
- ✅ Caixa de nou comentari (desactivada si no autenticat)
- ✅ Llista de comentaris amb paginació "Load more"
- ✅ Replies d'un nivell, màxim una caixa oberta alhora
- ✅ **Zero likes** en cap comentari ni reply
- ✅ Eliminació de comentaris i replies per autor / mod / superadmin
- ✅ Comptador de comentaris actualitzat localment en afegir / eliminar
- ✅ Tots els estats gestionats: carregant, buit, error, 404
- ✅ Cap valor de CSS hardcoded
