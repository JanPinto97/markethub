# PROMPT 11 — Comunitats privades: detall, join request i gestió de membres

## Abans de començar (Si no ho has fet abans)

1. Llegeix `frontend/CLAUDE.md` — estructura de components i convencions del projecte.
2. Llegeix `frontend/DESIGN.md` — tots els tokens CSS. Cap valor hardcoded de color, font o espaiat.
3. Llegeix `backend/CLAUDE.md` — endpoints disponibles i models.

Llegeix el codi existent de `community.component`, `community.service.ts`, `CommunityPublicDetailComponent` i `PostCardComponent` abans d'escriure res. Hi ha patrons (infinite scroll, skeletons, optimistic update, modals) que ja existeixen i **cal reutilitzar**, no reinventar.

---

## Tasca

Implementar tot el flux de comunitats privades:

1. Pàgina de detall `/community/p/:id` (feed + capçalera)
2. Flux de sol·licitud d'entrada (join request)
3. Panell de gestió: membres, sol·licituds, rols, expulsió, pins, eliminació

---

## Rutes Angular a afegir

```typescript
{
  path: 'community/p/:id',
  loadComponent: () => import('./features/community/pages/community-private-detail/community-private-detail.component')
    .then(m => m.CommunityPrivateDetailComponent)
}
```

**Control d'accés per ruta:**

- Usuari no autenticat → redirigeix a `/login`.
- Usuari autenticat però no membre → mostra la vista "Request to Join" (no redirigeix, mostra contingut limitat dins la mateixa pàgina).
- Usuari membre → mostra la pàgina completa.

Usa `AuthGuard` per al login. L'accés de membre el gestiona el component (no un guard separat).

---

## Estructura de fitxers a crear

```
frontend/src/app/features/community/
├── pages/
│   └── community-private-detail/
│       ├── community-private-detail.component.ts
│       ├── community-private-detail.component.html
│       └── community-private-detail.component.css
└── components/
    ├── community-members-panel/
    │   ├── community-members-panel.component.ts
    │   ├── community-members-panel.component.html
    │   └── community-members-panel.component.css
    └── pending-requests-panel/
        ├── pending-requests-panel.component.ts
        ├── pending-requests-panel.component.html
        └── pending-requests-panel.component.css
```

---

## Model de dades

```typescript
type CommunityRole = "leader" | "moderator" | "little_whale" | "member";

interface CommunityMember {
  userId: string;
  username: string;
  avatar?: string;
  role: CommunityRole;
}

interface JoinRequest {
  _id: string;
  user: { username: string; avatar?: string };
  message: string; // màx 150 chars
  createdAt: string;
  status: "pending" | "accepted" | "rejected";
}

interface CommunityPrivate {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  myRole: CommunityRole | null; // null si no ets membre
  isMember: boolean;
  myRequestStatus?: "pending" | "accepted" | "rejected" | null;
  members: CommunityMember[]; // populat si ets membre
  pendingRequests?: JoinRequest[]; // populat si ets leader o moderator
}

interface PostX {
  // ja existent — afegir camp:
  isPinned: boolean;
}
```

---

## Endpoints del backend

```
GET    /api/communities/private/:id                           → detall + membres + requests (segons rol)
GET    /api/communities/private/:id/posts?page=1&limit=10     → feed de la comunitat
POST   /api/communities/private/:id/request                   → enviar sol·licitud d'entrada
POST   /api/communities/private/:id/requests/:requestId/accept → acceptar sol·licitud (mod/leader)
POST   /api/communities/private/:id/requests/:requestId/reject → rebutjar sol·licitud (mod/leader)
DELETE /api/communities/private/:id/members/:userId           → expulsar membre (leader)
PUT    /api/communities/private/:id/members/:userId/role      → canviar rol (leader)
POST   /api/communities/private/:id/leave                     → sortir de la comunitat
DELETE /api/communities/private/:id                           → eliminar la comunitat (leader)
POST   /api/communities/private/:id/posts/:postId/pin         → ancorar/desancorar post (toggle, leader)
```

---

## 1. Vista per a no membres (Request to Join)

Si `isMember === false`, la pàgina mostra:

```
┌─────────────────────────────────────────────┐
│  [Avatar]  Nom de la comunitat              │
│            🔒 Private Community             │
│            X members                        │
│            Descripció (si existeix)         │
├─────────────────────────────────────────────┤
│  Aquest contingut és privat.                │
│                                             │
│  [Request to Join]   ← si no has sol·licitat│
│                                             │
│  --- o si ja has sol·licitat: ---           │
│  ⏳ Your request is pending approval.       │
│                                             │
│  --- o si ha estat rebutjada: ---           │
│  ✗ Your request was rejected.               │
└─────────────────────────────────────────────┘
```

**Botó "Request to Join":**

- Visible només si `myRequestStatus === null` (mai ha sol·licitat).
- En clicar: obre un popup/modal inline petit:
  ```
  ┌─────────────────────────────────────────┐
  │  Request to join [Nom comunitat]   [X]  │
  ├─────────────────────────────────────────┤
  │  Why do you want to join? (optional)    │
  │  [textarea, màx 150 chars]    X/150     │
  ├─────────────────────────────────────────┤
  │  [Cancel]               [Send Request]  │
  └─────────────────────────────────────────┘
  ```
- Enviament: `POST /api/communities/private/:id/request` amb `{ message?: string }`.
- En èxit: tanca el modal, actualitza `myRequestStatus` a `'pending'`, mostra `"⏳ Your request is pending approval."`. No cal toast (el missatge inline ja és suficient).
- En error: missatge inline sota el textarea.

---

## 2. Vista per a membres (pàgina completa)

### Layout

```
┌──────────────────────────────────────────────────────┐
│  CAPÇALERA DE LA COMUNITAT                           │
├───────────────────────────────────┬──────────────────┤
│  FEED CENTRAL                     │  PANELL DRET     │
│  (posts, caixa creació)           │  (membres, etc.) │
└───────────────────────────────────┴──────────────────┘
```

La pàgina de detall privada té **dues columnes**:

- **Esquerra (~65%):** feed de posts.
- **Dreta (~35%):** panell de membres i sol·licituds (sticky).

### Capçalera de la comunitat

Idèntica en estructura a `CommunityPublicDetailComponent` però amb:

- Icona 🔒 o badge "Private" visible.
- **No hi ha botó Join** (les privades requereixen sol·licitud).
- **Botó Leave** per als membres que no són líder. En clicar: confirmació. Si ets l'últim membre → avís especial (mateixa lògica que les públiques). `POST /api/communities/private/:id/leave`.
- **Botó "Delete Community"** visible **només per al líder**, a la capçalera o al panell dret. En clicar: confirmació amb text explícit `"This will permanently delete the community and all its posts."`. `DELETE /api/communities/private/:id`. En èxit: toast + redirect a `/community`.

### Caixa de creació de post

Mateixa lògica que a `CommunityPublicDetailComponent`:

- Visible i funcional per a tots els membres.
- Post enviat amb `origin: 'private_community'` i `community: communityId`.
- En èxit: afegeix el post al feed (per sobre dels no ancorats, per sota dels ancorats).

### Feed de posts

Endpoint: `GET /api/communities/private/:id/posts?page=1&limit=10`

**Ordenació especial** (el backend ja la fa, però cal que el frontend la respecti en els afegits optimistes):

1. Posts ancorats (`isPinned: true`) sempre al capdamunt, ordenats per `createdAt` desc entre ells.
2. Posts normals per `trendingScore` desc (amb bonus de rol aplicat al backend).

**Targeta de post** (`PostCardComponent` existent) amb **diferències per als posts privats:**

- **Indicador de post ancorat**: si `isPinned === true`, mostra una etiqueta `📌 Pinned` a la capçalera de la targeta.
- **Menú de tres punts** ampliació: afegeix l'opció `Pin` / `Unpin` visible **només per al líder** de la comunitat.
  - `Pin`: `POST /api/communities/private/:id/posts/:postId/pin`.
  - En èxit: mou el post visualment al capdamunt del feed + canvia l'etiqueta. Toast `"Post pinned."`.
  - `Unpin`: mateix endpoint (toggle). Toast `"Post unpinned."`.

Per implementar aquesta diferència, passa al `PostCardComponent` nous `@Input()`:

```typescript
@Input() communityContext?: {
  communityId: string;
  myRole: CommunityRole | null;
};
```

Si `communityContext` és `undefined`, el comportament és l'actual (sense pin). Si existeix i `myRole === 'leader'`, mostra les opcions de pin.

**No modifiquis l'interfície de `PostCardComponent` de forma que trenqui els usos existents** (el `@Input` és opcional, per tant és retrocompatible).

Infinite scroll + skeletons + retry: mateix patró que tots els feeds anteriors.

---

## 3. Panell dret — CommunityMembersPanelComponent

Panell sticky a la dreta del feed. El contingut varia segons el rol de l'usuari.

### Secció "Members" (visible per a tots els membres)

Llista de membres amb rol:

```
MEMBERS (X)
┌─────────────────────────────────────┐
│ [Avatar] @username     👑 Leader   │
│ [Avatar] @username     🛡 Mod      │
│ [Avatar] @username     🐋 Whale    │
│ [Avatar] @username     Member      │
│ ...                                 │
└─────────────────────────────────────┘
[Leave Community]
```

**Badges de rol:**

- `leader` → 👑 o text "Leader" en color daurat / accent
- `moderator` → 🛡 o text "Mod" en color blau
- `little_whale` → 🐋 o text "Whale" en color verd
- `member` → text "Member" en color neutre

Usa emojis o text amb color; el que quedi més coherent amb el `DESIGN.md`. No cal icones SVG externes.

**Accions visibles per al líder** (a cada fila de membre, visible en hover):

- Botó **Expel** (icona o text): `DELETE /api/communities/private/:id/members/:userId`. Confirmació simple. En èxit: elimina la fila. Toast `"Member removed."`.
- Botó **Promote** (icona o text): obre un petit dropdown inline amb les opcions de rol disponibles (no pots assignar `leader` des d'aquí — la successió és automàtica):
  - `moderator`
  - `little_whale`
  - `member`
  - L'opció actual apareix desactivada o marcada.
  - En seleccionar: `PUT /api/communities/private/:id/members/:userId/role` amb `{ role: string }`. Actualitza la fila optimistament. Toast `"Role updated."`.

El líder **no veu els seus propis botons d'expulsió ni promoció** (no pot expulsar-se ni canviar-se el rol).

### Secció "Pending Requests" (visible per a líder i moderador)

Situada sota la llista de membres, separada per un divisor.

```
PENDING REQUESTS (X)
┌─────────────────────────────────────┐
│ [Avatar] @username · 2h ago        │
│ "Vull unir-me per discutir..."      │  ← preview del missatge (1 línia)
│ [Reject]  [Accept]                  │
└─────────────────────────────────────┘
```

- Cada sol·licitud mostra avatar, username, temps i una línia de preview del missatge.
- En clicar la fila (o un botó "View"): obre un popup petit amb el missatge complet + botons Accept / Reject.
- **Accept**: `POST /api/communities/private/:id/requests/:requestId/accept`. En èxit: elimina la fila de pending, incrementa `memberCount`, afegeix el nou membre a la llista de membres (amb rol `member`). Toast `"Request accepted."`.
- **Reject**: `POST /api/communities/private/:id/requests/:requestId/reject`. En èxit: elimina la fila. Toast `"Request rejected."`.
- Si no hi ha sol·licituds pendents: text `"No pending requests."`.

---

## 4. Popup de detall de sol·licitud

En clicar una sol·licitud del panell:

```
┌──────────────────────────────────────┐
│  Join Request                   [X]  │
├──────────────────────────────────────┤
│  [Avatar]  @username                 │
│            Sent 2h ago               │
│                                      │
│  "Missatge complet de la             │
│   sol·licitud d'entrada..."          │
│                                      │
│  [Reject]              [Accept]      │
└──────────────────────────────────────┘
```

Modal centrat, overlay fosc. Tanca amb Escape o clic a l'overlay.
Botons Accept / Reject criden el mateix endpoint que al panell. En completar l'acció: tanca el modal i actualitza el panell.

---

## 5. Sincronització de la sidebar

Quan un membre deixa la comunitat (Leave), emet a `communityMembershipChanged$` (ja existent del Prompt 8):

```typescript
{ id: communityId, action: 'left' }
```

La sidebar elimina la comunitat de la llista sense recarregar.

---

## Afegir mètodes al servei

Afegeix a `community.service.ts`:

```typescript
getCommunityPrivate(id: string): Observable<CommunityPrivate>
getCommunityPrivatePosts(id: string, page: number): Observable<PostX[]>
requestJoinPrivate(id: string, message?: string): Observable<void>
acceptRequest(communityId: string, requestId: string): Observable<void>
rejectRequest(communityId: string, requestId: string): Observable<void>
expelMember(communityId: string, userId: string): Observable<void>
changeMemberRole(communityId: string, userId: string, role: CommunityRole): Observable<void>
leaveCommunityPrivate(id: string): Observable<{ memberCount: number }>
deleteCommunityPrivate(id: string): Observable<void>
pinPost(communityId: string, postId: string): Observable<{ isPinned: boolean }>
```

---

## Regles d'implementació

- CSS custom pur. Totes les variables del `DESIGN.md`.
- Sintaxi Angular 17+: `@if`, `@for`, `inject()`, `standalone: true`.
- El `@Input() communityContext` de `PostCardComponent` és **opcional** (`?`). Cap ús existent es trenca.
- Els panels `CommunityMembersPanelComponent` i `PendingRequestsPanelComponent` són components fills que reben les dades via `@Input()` i emeten accions via `@Output()`. No fan crides HTTP directament: les delega al component pare `CommunityPrivateDetailComponent`.
- Alternativament, si els panells es fan molt complexos, poden injectar `CommunityService` directament. Decideix en funció del tamany real. Documenta la decisió en un comentari al codi.
- El dropdown de promoció de rol s'implementa com un element posicionat absolutament (CSS pur), no com un `<select>`. Ha de tancar-se en clicar fora (`@HostListener`).
- **No implementis cap sistema de notificacions en temps real** (WebSockets, polling). Totes les actualitzacions són locals (optimistic o post-resposta).
- El líder no pot expulsar-se ni canviar-se el rol. Afegeix la condició `userId !== currentUser._id` a la visibilitat dels botons d'acció.
- La vista de "no membre" i la vista de "membre" es gestionen amb un sol component (`CommunityPrivateDetailComponent`) i un `@if` al template. No crees dos components separats.

---

## Resum de fitxers a crear o modificar

**Crear:**

```
frontend/src/app/features/community/pages/community-private-detail/*
frontend/src/app/features/community/components/community-members-panel/*
frontend/src/app/features/community/components/pending-requests-panel/*
```

**Modificar:**

```
frontend/src/app/features/community/components/post-card/post-card.component.ts   → @Input communityContext
frontend/src/app/features/community/components/post-card/post-card.component.html  → pin badge + opció pin al menú
frontend/src/app/features/community/services/community.service.ts                  → nous mètodes
frontend/src/app/app.routes.ts                                                     → nova ruta /community/p/:id
```

---

## Resultat esperat

- ✅ Ruta `/community/p/:id` protegida per `AuthGuard`
- ✅ Vista de no membre amb flux de join request (enviar, pending, rejected)
- ✅ Modal de join request amb textarea opcional (màx 150 chars)
- ✅ Vista de membre: capçalera + feed + panell dret
- ✅ Feed amb posts ancorats sempre al capdamunt + etiqueta 📌
- ✅ Opció Pin/Unpin al menú del post (visible només per al líder)
- ✅ `CommunityMembersPanelComponent` amb badges de rol
- ✅ Botó Expel (líder) amb confirmació i actualització optimista
- ✅ Dropdown Promote (líder) amb rols disponibles, tanca en clicar fora
- ✅ `PendingRequestsPanelComponent` (líder + moderador) amb preview de missatge
- ✅ Popup de detall de sol·licitud amb Accept/Reject
- ✅ En Accept: nou membre afegit a la llista + memberCount actualitzat
- ✅ Botó Leave per a membres (no líder) amb avís especial si és l'últim
- ✅ Botó Delete Community per al líder amb confirmació explícita
- ✅ Sidebar actualitzada via `communityMembershipChanged$` en Leave
- ✅ Cap valor de CSS hardcoded
