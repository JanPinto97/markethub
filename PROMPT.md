# PROMPT 4 — Perfil públic d'usuari (`/profile/:username`)

## Abans de començar

1. Llegeix `frontend/CLAUDE.md` — estructura de components i convencions del projecte.
2. Llegeix `frontend/DESIGN.md` — tots els tokens CSS. Cap valor hardcoded de color, font o espaiat.
3. Llegeix `backend/CLAUDE.md` — endpoints disponibles i models.

---

## Tasca

Crear la pàgina pública de perfil d'usuari a la ruta `/profile/:username`.

---

## Ruta Angular

Afegir a `app.routes.ts`:

```typescript
{
  path: 'profile/:username',
  loadComponent: () => import('./features/profile/profile.component')
    .then(m => m.ProfileComponent)
}
```

---

## Estructura de fitxers a crear

```
frontend/src/app/features/profile/
├── profile.component.ts
├── profile.component.html
├── profile.component.css
└── profile.service.ts
```

---

## Endpoints del backend

```
GET  /api/users/:username              → dades públiques del perfil
GET  /api/users/:username/posts        → PostX públics (general + public_community)
GET  /api/users/:username/followers    → llista de followers
GET  /api/users/:username/following    → llista de following
POST /api/users/:username/follow       → follow/unfollow toggle
```

Tots els endpoints retornen 404 si l'usuari no existeix.

---

## Layout de la pàgina

```
┌─────────────────────────────────────────┐
│  COVER IMAGE (banner horitzontal)       │
│  ┌───────┐                              │
│  │ AVATAR│  Nom / @username             │
│  └───────┘  Bio                         │
│             X followers · Y following   │
│             [Follow] o [Unfollow]        │
├─────────────────────────────────────────┤
│  Comunitats públiques (chips/badges)    │
├─────────────────────────────────────────┤
│  Feed de posts (PostX)                  │
│  ...                                    │
└─────────────────────────────────────────┘
```

La pàgina **no té sidebars**. És una columna central centrada (max-width consistent amb el feed de `/community`).

---

## Secció 1 — Header del perfil

### Cover image

- Franja horitzontal a la part superior (~200px d'alçada).
- Si l'usuari té `coverImage` (URL): mostra-la amb `object-fit: cover`.
- Si no té `coverImage`: fons de color sòlid derivat del username (consistent, no aleatori).

### Avatar

- Cercle superposat sobre el límit inferior del cover image (mig dins, mig fora).
- Mida: ~90px de diàmetre.
- Si té `avatar` (URL): mostra'l.
- Si no: lletra inicial del username, fons de color consistent.

### Informació bàsica

- **Username** prominent.
- **Bio** si existeix (text secundari). Si no existeix, no ocupa espai.
- **Followers / Following:** dos valors clicables que obren un modal amb la llista.
  - `X followers` · `Y following`
  - En clicar, obre modal (veure Secció 4).

### Botó Follow / Unfollow

- Visible **només si l'usuari autenticat NO és el propietari del perfil**.
- Si no estàs autenticat i cliques → redirect a `/login`.
- Si ja segueixes l'usuari → mostra `Unfollow`.
- Si no el segueixes → mostra `Follow`.
- Toggle optimista: actualitza el comptador de followers immediatament, reverteix en error.
- Endpoint: `POST /api/users/:username/follow` (el backend gestiona toggle i retorna `{ following: boolean, followerCount: number }`).
- Si ets el propietari del perfil: mostra un botó `Edit Profile` que fa `routerLink="/settings"`.

---

## Secció 2 — Comunitats públiques

Llista de comunitats públiques de les quals l'usuari és membre.

- Chips/badges horitzontals: `[Inicial] Nom de la comunitat`.
- Cada chip és clicable → `routerLink="/community/c/:id"` (ruta futura, el link ha d'existir).
- Si no és membre de cap comunitat pública → no mostra res (no ocupa espai).

---

## Secció 3 — Feed de posts

Llista de `PostX` de l'usuari. **Regles estrictes:**

- Inclou: `origin: 'general'` i `origin: 'public_community'`.
- Exclou: `origin: 'private_community'` i `PostReddit`.

Endpoint: `GET /api/users/:username/posts?page=1&limit=10`

- Usa el component `PostCardComponent` existent (ja creat al Prompt 3). No en crees un de nou.
- Paginació: infinite scroll igual que al feed de `/community` (IntersectionObserver).
- Si l'usuari no té posts públics → mostra text discret: `"No public posts yet."`.

---

## Secció 4 — Modal Followers / Following

En clicar "X followers" o "Y following" s'obre un modal simple:

- Dues pestanyes: `Followers` | `Following`.
- Cada fila: avatar + username clicable (`routerLink="/profile/:username"`).
- Paginació simple (Load more), no infinite scroll.
- Tanca en clicar fora del modal o en una X.

Endpoints:

```
GET /api/users/:username/followers?page=1&limit=20
GET /api/users/:username/following?page=1&limit=20
```

---

## Estats a gestionar

| Situació               | Comportament                                |
| ---------------------- | ------------------------------------------- |
| Perfil no trobat (404) | Pàgina d'error inline: "User not found."    |
| Carregant              | Skeleton del header (cover + avatar + info) |
| Posts carregant        | Skeleton de 3 targetes                      |
| Usuari sense posts     | Missatge "No public posts yet."             |
| Usuari sense bio       | Camp bio invisible (no placeholder)         |
| Usuari sense cover     | Color de fons derivat del username          |

---

## ProfileService — mètodes a implementar

```typescript
getProfile(username: string): Observable<UserProfile>
getUserPosts(username: string, page: number): Observable<PostX[]>
getFollowers(username: string, page: number): Observable<UserSummary[]>
getFollowing(username: string, page: number): Observable<UserSummary[]>
toggleFollow(username: string): Observable<{ following: boolean; followerCount: number }>
```

---

## Tipus TypeScript

```typescript
interface UserProfile {
  username: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean; // calculat pel backend per l'usuari autenticat
  publicCommunities: { id: string; name: string }[];
}

interface UserSummary {
  username: string;
  avatar?: string;
}
```

---

## Regles d'implementació

- CSS custom pur. Totes les variables del `DESIGN.md`.
- Sintaxi Angular 17+: `@if`, `@for`, `inject()`, `standalone: true`.
- `PostCardComponent` s'importa i es reutilitza directament. No duplicar lògica de targeta de post.
- El modal de followers/following pot ser un component inline dins `profile.component.html` controlat per un flag `showFollowersModal: boolean`. No cal un component separat.
- El color derivat del username (per avatar i cover sense imatge) ha de ser la mateixa funció utilitària que ja s'usa a `PostCardComponent`. Si existeix en un fitxer utils, importa-la. Si no, extreu-la a `src/app/shared/utils/color.utils.ts` i actualitza totes les referències.

---

## Resultat esperat

- ✅ Ruta `/profile/:username` creada i accessible
- ✅ Header amb cover, avatar, bio, followers/following i botó follow/unfollow
- ✅ Follow/unfollow amb optimistic update
- ✅ Comunitats públiques com a chips clicables
- ✅ Feed de PostX reutilitzant `PostCardComponent` + infinite scroll
- ✅ Modal de followers/following amb pestanyes
- ✅ Gestió de tots els estats (404, carregant, buit)
- ✅ El botó "Edit Profile" apareix si ets el propietari
- ✅ Cap valor de CSS hardcoded
