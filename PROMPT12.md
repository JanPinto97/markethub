# PROMPT 12 — Cerca general del header

## Abans de començar

1. Llegeix `frontend/CLAUDE.md` — estructura de components i convencions del projecte.
2. Llegeix `frontend/DESIGN.md` — tots els tokens CSS. Cap valor hardcoded de color, font o espaiat.
3. Llegeix `backend/CLAUDE.md` — endpoints disponibles i models.

Llegeix el codi existent del header i de `community.component` abans de modificar res. La barra de cerca ja existeix com a input estàtic; aquest prompt li dona vida.

---

## Tasca

Implementar la cerca general de la plataforma:

1. Dropdown de resultats ràpids al header (inline, sense navegar)
2. Pàgina de resultats complerts `/search`
3. Filtres per tipus: usuaris, posts, comunitats

---

## Ruta Angular a afegir

```typescript
{
  path: 'search',
  loadComponent: () => import('./features/search/search.component')
    .then(m => m.SearchComponent)
}
```

No requereix login.

---

## Estructura de fitxers a crear

```
frontend/src/app/features/search/
├── search.component.ts
├── search.component.html
├── search.component.css
└── search.service.ts

frontend/src/app/shared/components/search-bar/
├── search-bar.component.ts
├── search-bar.component.html
└── search-bar.component.css
```

El header actual usa l'input de cerca directament. **Extreu-lo** a `SearchBarComponent` i substitueix-lo al header. Això fa la lògica testable i reutilitzable.

---

## Endpoint del backend

```
GET /api/search?q=query&type=all|users|posts|communities&page=1&limit=10
```

Resposta:

```typescript
interface SearchResults {
  users: UserSummary[];
  posts: PostX[];
  communities: CommunityResult[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

interface UserSummary {
  username: string;
  avatar?: string;
  bio?: string;
  followerCount: number;
}

interface CommunityResult {
  _id: string;
  name: string;
  avatar?: string;
  type: "public" | "private";
  memberCount: number;
  description?: string;
}
```

**Restriccions de la cerca (el backend les aplica, el frontend les respecta):**

- Cobreix: usuaris, PostX públics (`general` + `public_community`), comunitats (públiques i privades — nom i descripció, mai contingut intern).
- **No cobreix:** PostReddit, temes de discussió (tenen el seu propi buscador).
- Cerca de mínim 2 caràcters. Per sota de 2 → no fa cap crida.

---

## 1. SearchBarComponent (header)

### Comportament del input

- **Debounce de 350ms** abans de fer la crida. Usa `debounceTime` de RxJS.
- Mínim 2 caràcters per activar la cerca. Si és buit o 1 caràcter → tanca el dropdown i no fa cap crida.
- En prémer `Enter` → navega a `/search?q=query` (pàgina de resultats complerts).
- En prémer `Escape` → tanca el dropdown i fa blur de l'input.
- En clicar fora del dropdown → tanca el dropdown (conserva el text al input).

### Dropdown de resultats ràpids

S'obre sota el input del header mentre l'usuari escriu. **Posicionament:** `position: absolute`, alineat amb l'input, `z-index` per sobre de tot el contingut.

```
┌─────────────────────────────────────────────┐
│  USERS                                      │
│  [Avatar] @username  Bio truncada...        │
│  [Avatar] @username  Bio truncada...        │
├─────────────────────────────────────────────┤
│  POSTS                                      │
│  [Avatar] @username · Text del post trunc.. │
│  [Avatar] @username · Text del post trunc.. │
├─────────────────────────────────────────────┤
│  COMMUNITIES                                │
│  [Avatar] Nom comunitat  🔒/🌐  X members  │
│  [Avatar] Nom comunitat  🔒/🌐  X members  │
├─────────────────────────────────────────────┤
│  See all results for "query"  →             │
└─────────────────────────────────────────────┘
```

**Límits del dropdown:** màxim 3 resultats per categoria. Si no hi ha resultats en una categoria, no mostra la secció (ni el títol).

Si no hi ha cap resultat en cap categoria:

```
┌─────────────────────────────────────┐
│  No results for "query"             │
└─────────────────────────────────────┘
```

**Interacció amb els resultats:**

- Fila d'usuari → `routerLink="/profile/:username"` → tanca dropdown.
- Fila de post → obre el feed de `/community` filtrat? No: simplement navega a `/community` (el detall de post individual no existeix per a PostX). De moment, en clicar un post del dropdown → navega a `/search?q=query` amb el filtre `posts` preseleccionat.
- Fila de comunitat pública → `routerLink="/community/c/:id"` → tanca dropdown.
- Fila de comunitat privada → `routerLink="/community/p/:id"` → tanca dropdown.
- "See all results" → navega a `/search?q=query`.

**Estat de càrrega del dropdown:**

- Mentre la crida és en curs: mostra 3 files skeleton dins el dropdown (no tanca el dropdown).
- Si la crida falla: text discret `"Search unavailable."` dins el dropdown.

### Navegació per teclat al dropdown

- `↓` / `↑`: mou el focus entre les files del dropdown.
- `Enter` sobre una fila: navega a la destinació de la fila.
- `Enter` sense fila seleccionada (o `Enter` directe): navega a `/search?q=query`.

---

## 2. Pàgina `/search`

### Lectura de paràmetres d'URL

La pàgina llegeix `q` i `type` dels query params:

```
/search?q=bitcoin&type=posts
```

En canviar els query params (l'usuari fa una nova cerca o canvia el filtre), la pàgina actualitza els resultats **sense recarregar el component** (subscripció a `ActivatedRoute.queryParams`).

### Layout

```
┌────────────────────────────────────────────────────┐
│  Search results for "bitcoin"                      │
├────────────────────────────────────────────────────┤
│  [All]  [Users]  [Posts]  [Communities]            │  ← filtres
├────────────────────────────────────────────────────┤
│  USERS (X)                                         │
│  [fila d'usuari]                                   │
│  [fila d'usuari]                                   │
│  ...                                               │
├────────────────────────────────────────────────────┤
│  POSTS (X)                                         │
│  [fila de post]                                    │
│  ...                                               │
├────────────────────────────────────────────────────┤
│  COMMUNITIES (X)                                   │
│  [fila de comunitat]                               │
│  ...                                               │
└────────────────────────────────────────────────────┘
```

Columna central centrada sense sidebars.

### Filtres

Quatre botons: `All` (per defecte), `Users`, `Posts`, `Communities`.

- En seleccionar un filtre: actualitza el query param `type` a l'URL (`router.navigate`) i refà la crida amb `type=users|posts|communities`.
- Filtre actiu visualment destacat.
- En mode `All`: mostra les tres seccions. En mode filtrat: mostra només la secció corresponent.

### Resultats per secció

**Usuaris:**

```
[Avatar] @username
         Bio truncada a 1 línia
         X followers
```

Clicable → `routerLink="/profile/:username"`.

**Posts (PostX):**

```
[Avatar] @username · temps
         Text del post (màx 2 línies, line-clamp)
         [Etiqueta comunitat si origin: 'public_community']
```

Clicable → navega a `/community` (sense detall de post individual per ara). Obre el feed general. En un futur, quan existeixi la pàgina de detall de post, s'actualitzarà.

**Comunitats:**

```
[Avatar/Inicial] Nom de la comunitat  [🔒 Private | 🌐 Public]
                 Descripció truncada a 1 línia
                 X members
```

Clicable → `/community/c/:id` (pública) o `/community/p/:id` (privada).

### Paginació

- Paginació per botons (`← Previous` / `Next →`) a peu de cada secció, **no** infinite scroll.
- Mostra `Page X of Y`.
- En canviar de pàgina: actualitza `page` al query param de l'URL i fa scroll al top de la pàgina.

### Estats

| Situació                 | Comportament                                          |
| ------------------------ | ----------------------------------------------------- |
| Sense query param `q`    | Text centrat: `"Enter a search term to get started."` |
| `q` amb menys de 2 chars | `"Search term must be at least 2 characters."`        |
| Carregant                | Skeleton de 5 files per secció                        |
| Sense resultats          | `"No results found for 'query'."` per secció o global |
| Error                    | `"Search unavailable. Try again."` + botó retry       |

---

## SearchService

```typescript
// frontend/src/app/features/search/search.service.ts

search(query: string, type: 'all' | 'users' | 'posts' | 'communities', page: number): Observable<SearchResults>
```

Una sola funció. El servei no guarda estat; el component gestiona el resultat.

---

## Regles d'implementació

- CSS custom pur. Totes les variables del `DESIGN.md`.
- Sintaxi Angular 17+: `@if`, `@for`, `inject()`, `standalone: true`.
- El debounce s'implementa amb `Subject` + `debounceTime(350)` + `switchMap` (cancel·la crides anteriors si l'usuari segueix escrivint). No uses `setTimeout` manual.
- **Dessubscriu** el Subject a `ngOnDestroy` de `SearchBarComponent`.
- El dropdown usa `position: absolute`. L'element pare (header) ha de tenir `position: relative`. Verifica que el header no talla el dropdown amb `overflow: hidden`; si és així, corregeix-ho.
- La navegació per teclat al dropdown gestiona el focus amb un índex `focusedIndex: number` al component. No manipulis el DOM directament.
- La pàgina `/search` usa `ActivatedRoute.queryParams` (observable) per reaccionar als canvis d'URL. No usa `snapshot` excepte per a la càrrega inicial.
- Els query params de l'URL han de ser la font de veritat de l'estat de la pàgina de cerca. Si l'usuari copia i enganxa la URL, ha de veure els mateixos resultats.
- **No cerquis** PostReddit ni topics. Si el backend els retornés per algun motiu, filtra'ls al frontend abans de renderitzar.

---

## Resum de fitxers a crear o modificar

**Crear:**

```
frontend/src/app/features/search/search.component.*
frontend/src/app/features/search/search.service.ts
frontend/src/app/shared/components/search-bar/search-bar.component.*
```

**Modificar:**

```
frontend/src/app/shared/components/navbar/* (o on sigui el header)
  → substituir l'input estàtic per <app-search-bar>
frontend/src/app/app.routes.ts
  → nova ruta /search
```

---

## Resultat esperat

- ✅ `SearchBarComponent` extret del header com a component independent
- ✅ Debounce de 350ms amb `switchMap` (cancel·la crides anteriors)
- ✅ Dropdown de resultats ràpids (màx 3 per categoria) amb skeleton i estat buit
- ✅ Navegació per teclat al dropdown (↑↓ + Enter + Escape)
- ✅ "See all results" navega a `/search?q=query`
- ✅ Pàgina `/search` llegeix i actualitza query params de l'URL
- ✅ Filtres `All / Users / Posts / Communities` actualitzen l'URL i refan la crida
- ✅ Paginació per botons amb `Page X of Y`
- ✅ Tots els estats gestionats: buit, carregant, sense resultats, error
- ✅ Els query params són la font de veritat (URL compartible)
- ✅ Cap PostReddit ni topic als resultats
- ✅ Cap valor de CSS hardcoded
