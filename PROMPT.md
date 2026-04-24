# PROMPT 7 — Comentaris: replies i likes

## Abans de començar

1. Llegeix `frontend/CLAUDE.md` — estructura de components i convencions del projecte.
2. Llegeix `frontend/DESIGN.md` — tots els tokens CSS. Cap valor hardcoded de color, font o espaiat.
3. Llegeix `backend/CLAUDE.md` — endpoints disponibles i models.

Aquest prompt **modifica components ja existents**. No crea cap ruta nova. Tots els canvis són a la secció de comentaris de `PostCardComponent`. Llegeix bé el codi existent abans de modificar res.

---

## Tasca

Completar el sistema de comentaris de `PostCardComponent` amb:
1. Likes als comentaris de PostX
2. Replies (un nivell de niament)
3. Eliminació de comentaris per moderadors

---

## Context del model de dades

El backend ja suporta tot això. Recorda l'estructura:

```typescript
interface Comment {
  _id: string;
  author: { username: string; avatar?: string };
  text: string;
  createdAt: string;
  likes: string[];           // array d'userIds
  likeCount: number;
  parentComment?: string;    // null si és arrel, id del pare si és reply
  replyingTo?: string;       // username al qual respon
  replies?: Comment[];       // populat pel backend en GET comments
}
```

Els comentaris retornats per `GET /api/posts/:postId/comments` vénen ja agrupats:
- Comentaris arrel a l'arrel de l'array.
- Cada comentari arrel pot tenir un camp `replies: Comment[]` amb els seus fills.
- **Màxim un nivell de niament.** Les replies no tenen replies.

---

## Endpoints

```
POST   /api/posts/:postId/comments                                    → crear comentari arrel
POST   /api/posts/:postId/comments/:commentId/reply                   → crear reply
POST   /api/posts/:postId/comments/:commentId/like                    → toggle like (comentari arrel)
POST   /api/posts/:postId/comments/:commentId/replies/:replyId/like  → toggle like (reply)
DELETE /api/posts/:postId/comments/:commentId                         → eliminar comentari arrel
DELETE /api/posts/:postId/comments/:commentId/replies/:replyId        → eliminar reply
```

---

## 1. Likes als comentaris

### Comentaris arrel i replies
Ambdós tipus de comentari mostren:
- Icona de like (polze amunt) + número de likes a la dreta del text, alineat al peu del comentari.
- L'icona té estat visual diferenciat si l'usuari ja ha donat like (color accent, igual que als posts).
- **Optimistic update:** actualitza el comptador i l'estat de l'icona immediatament, reverteix si la crida falla.
- Requereix login. Si no autenticat → redirect a `/login`.

### Afegir mètodes al servei

Afegeix a `community.service.ts`:

```typescript
likeComment(postId: string, commentId: string): Observable<{ liked: boolean; count: number }>
likeReply(postId: string, commentId: string, replyId: string): Observable<{ liked: boolean; count: number }>
```

---

## 2. Replies

### Botó "Reply"

Cada comentari arrel té un botó `Reply` al seu peu (al costat del like).
- En clicar → obre una caixa de resposta **inline** sota el comentari, sobre la llista de replies existents.
- Si ja hi havia una caixa de resposta oberta en un altre comentari → tanca-la i obre la nova (màxim una caixa oberta alhora a tot el post).

### Caixa de reply inline

```
┌─────────────────────────────────────────┐
│  [Avatar]  Replying to @username        │
│  ┌─────────────────────────────────────┐│
│  │ Write a reply...              X/400 ││
│  └─────────────────────────────────────┘│
│  [Cancel]                      [Reply]  │
└─────────────────────────────────────────┘
```

- Indica a qui es respon: `Replying to @username` (username de l'autor del comentari pare).
- `<textarea>` amb placeholder `"Write a reply..."`, màxim 400 caràcters, comptador `X/400`.
- Botó `Cancel` → tanca la caixa sense enviar.
- Botó `Reply` → disabled si el textarea és buit. En clicar:
  - `POST /api/posts/:postId/comments/:commentId/reply` amb `{ text: string }`.
  - En èxit: afegeix la reply a la llista de replies del comentari de forma **optimista** (usa les dades de `AuthService.currentUser` per construir l'objecte local). Tanca la caixa.
  - En error: missatge inline sota el textarea. **No** tanca la caixa.

### Visualització de replies

Les replies apareixen sagnades sota el comentari pare. Identifica-les visualment amb:
- Una línia vertical a l'esquerra (border-left subtil, color de la paleta del `DESIGN.md`).
- Sagnat horitzontal (~24-32px).

Cada reply mostra:
- Avatar + username + temps.
- Text: `"@username_pare text de la reply"` — el `@username_pare` en color accent i no clicable (és decoratiu, el `replyingTo` del backend).
- Peu: icona like + número + botó `Reply` (que obre una caixa adreçada a l'autor de la reply, però envia al comentari arrel — un sol nivell de niament).

**Visibilitat de replies:**
- Si el comentari té `replies.length > 0` → mostra-les sempre expandides per defecte.
- No cal un toggle "Show/Hide replies" en aquest prompt.

### Afegir mètodes al servei

```typescript
addReply(postId: string, commentId: string, text: string): Observable<Comment>
deleteComment(postId: string, commentId: string): Observable<void>
deleteReply(postId: string, commentId: string, replyId: string): Observable<void>
```

---

## 3. Eliminació de comentaris i replies

### Qui pot eliminar

| Rol | Pot eliminar |
|---|---|
| Autor del comentari | El seu propi comentari / reply |
| `moderator` de plataforma | Qualsevol comentari / reply |
| `superadmin` | Qualsevol comentari / reply |

El rol de l'usuari autenticat prové de `AuthService.currentUser.role`.

### UX d'eliminació

- Afegeix una opció `Delete` al menú de tres punts de cada comentari i reply (o una icona de paperera discreta visible en hover, el que quedi més net).
- En clicar: diàleg de confirmació simple (el mateix patró que s'usa per eliminar posts — consistent amb el que ja existeix).
- En confirmar:
  - Crida al endpoint corresponent (comentari arrel o reply).
  - En èxit: elimina l'element de la llista amb fade-out (igual que els posts). Si s'elimina un comentari arrel, s'eliminen visualment també les seves replies.
  - En error: missatge inline discret.
- Usa `ToastService` per confirmar l'eliminació: `"Comment deleted."` (ja existent del Prompt 6).

---

## Estructura visual final d'un comentari amb replies

```
┌──────────────────────────────────────────────────┐
│ [Avatar] @username · 2h ago              [···]   │
│ Text del comentari                               │
│ 👍 3   Reply                                     │
│                                                  │
│ │  [Avatar] @reply_user · 1h ago       [···]    │
│ │  @username text de la reply                   │
│ │  👍 1   Reply                                 │
│                                                  │
│ │  [Avatar] @reply_user2 · 30m ago     [···]   │
│ │  @username text de la reply 2                │
│ │  👍 0   Reply                                │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ [Avatar] Replying to @username               │ │
│ │ Write a reply...                      0/400  │ │
│ │ [Cancel]                            [Reply]  │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## Regles d'implementació

- CSS custom pur. Totes les variables del `DESIGN.md`.
- Sintaxi Angular 17+: `@if`, `@for`, `inject()`, `standalone: true`.
- **Màxim una caixa de reply oberta alhora** a tot el component de post (no per comentari, sinó per post sencer). Gestiona-ho amb un únic `activeReplyCommentId: string | null` al `PostCardComponent`.
- **Optimistic update** per a likes de comentaris i replies: mateix patró que els likes de posts (actualitza immediatament, reverteix en error).
- La línia vertical de les replies ha de ser un `border-left` en CSS, no un element HTML addicional.
- Si `PostCardComponent` es fa massa gran, extreu la secció de comentaris a un `CommentSectionComponent` dins la mateixa carpeta. Decideix-ho en funció del tamany real del fitxer.
- No implementis cap sistema de notificacions de replies en aquest prompt.

---

## Resum de fitxers a modificar

```
frontend/src/app/features/community/components/post-card/
├── post-card.component.ts    → lògica replies, likes comments, activeReplyCommentId
├── post-card.component.html  → estructura visual replies, caixes inline
└── post-card.component.css   → sagnat, línia vertical, hover states nous

frontend/src/app/features/community/services/
└── community.service.ts      → nous mètodes: likeComment, likeReply, addReply,
                                 deleteComment, deleteReply
```

Opcional si el component és massa gran:
```
frontend/src/app/features/community/components/comment-section/
├── comment-section.component.ts
├── comment-section.component.html
└── comment-section.component.css
```

---

## Resultat esperat

- ✅ Likes als comentaris arrel amb optimistic update i estat visual
- ✅ Likes a les replies amb optimistic update i estat visual
- ✅ Botó "Reply" a cada comentari arrel i reply
- ✅ Màxim una caixa de reply oberta alhora per post
- ✅ Caixa de reply amb indicador "Replying to @username", textarea, Cancel i Reply
- ✅ Reply optimista: apareix immediatament sense esperar el servidor
- ✅ Replies visualment sagnades amb línia vertical
- ✅ Eliminació de comentaris i replies per autor / mod / superadmin
- ✅ Toast de confirmació en eliminar (`ToastService` del Prompt 6)
- ✅ Fade-out en eliminar (coherent amb l'eliminació de posts)
- ✅ Cap valor de CSS hardcoded