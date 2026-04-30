# Claude Code Prompt — Discussion System

### Context

Angular 17+ standalone components, Node.js/Express MVC, MongoDB/Mongoose. Auth via JWT (AuthGuard existent). CSS custom pur amb variables globals del projecte. Models existents: `Comment` (té `postId`, `author`), `Post`. Cap WebSocket.

---

### Task

Implementar sistema de discussions per comentaris de PostReddit. Cada comentari pot tenir una discussió (1:1). La discussió és un xat estil WhatsApp: missatges ordenats cronològicament, reply a missatge, sense likes ni eliminació. Requereix login.

---

### Constraints

**Backend — nous models:**

`Discussion`: `{ commentId: ObjectId ref Comment unique, postId: ObjectId ref Post, createdBy: ObjectId ref User, createdAt: Date }`

`DiscussionMessage`: `{ discussionId: ObjectId ref Discussion, author: ObjectId ref User, text: String maxlength:2000, replyTo: ObjectId ref DiscussionMessage default null, createdAt: Date }`

**Backend — rutes:**

- `GET /api/discussions/comment/:commentId` → retorna `{ exists: bool, discussionId? }`
- `POST /api/discussions/comment/:commentId` → crea Discussion + primer DiscussionMessage, retorna tots dos; si ja existeix la Discussion retorna 409
- `GET /api/discussions/:discussionId/messages?cursor=<createdAt>&limit=30` → cursor-based, ordenat per `createdAt ASC`, popula `author` (username, avatar) i `replyTo` (author.username, text primeres 80 chars)
- `POST /api/discussions/:discussionId/messages` → crea missatge, retorna missatge populat; `replyTo` opcional

**Frontend — canvis a `PostRedditCommentSectionComponent`:**

- Substituir botó "Reply" per "Open Discussion" a cada comentari arrel
- Click: crida `GET .../comment/:commentId`; si `exists` navega a `/community/discussion/:discussionId`; si no, navega a `/community/discussion/new/:commentId`

**Frontend — nova pàgina `DiscussionPageComponent` a `/community/discussion/:discussionId` i `/community/discussion/new/:commentId`:**

- Capçalera: mostra el comentari original (author, text) com a context no interactiu
- Càrrega inicial: primers 30 missatges (més antics); botó "Load more" al final de la llista per carregar els següents 30 (cursor = `createdAt` de l'últim missatge carregat)
- Botó flotant "↓" (bottom-right): carrega l'última pàgina i fa scroll al final; s'amaga si ja ets al final
- Polling cada 15s: `GET` amb cursor = `createdAt` del missatge més nou; afegeix nous missatges al final sense reset
- Si no hi ha missatges: text centrat "Start the discussion by sending a message"
- Missatge render: avatar + username + timestamp (HH:mm) + text; si té `replyTo`: bloc citat sobre el text amb `@username` en negreta i text truncat a 80 chars amb `...`
- Reply: clicar icona de reply a qualsevol missatge mostra un bloc citat a l'input area (igual que WhatsApp) amb botó per cancel·lar; l'input és un textarea simple amb botó d'enviar
- Ruta `/community/discussion/new/:commentId`: en enviar el primer missatge crida `POST /api/discussions/comment/:commentId` amb el text; un cop creat, navega a `/community/discussion/:discussionId` (sense reload visible)
- AuthGuard a les dues rutes

**Estil:**

- Missatges alineats a l'esquerra (no estil bombolla dreta/esquerra, tots iguals)
- Bloc de reply citat: fons lleugerament diferent, border-left 3px, text truncat amb `overflow: hidden; white-space: nowrap; text-overflow: ellipsis`
- CSS custom pur, variables del projecte, cap framework

**Out of scope:** eliminació de missatges, likes, estats de llegit/enviat, edició, WebSocket.

---

### Output format

Retorna només fitxers nous o modificats amb el path complet com a títol de cada bloc. No repeteixis fitxers sense canvis.

---

**IMPORTANT:**

- Do not explain anything
- Do not describe steps or progress
- Do not validate requirements
- Return only final output (code or requested artifacts)
- Do not repeat unchanged code
