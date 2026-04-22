# PROMPT 5 — Pàgina de configuració privada (`/settings`)

## Abans de començar

1. Llegeix `frontend/CLAUDE.md` — estructura de components i convencions del projecte.
2. Llegeix `frontend/DESIGN.md` — tots els tokens CSS. Cap valor hardcoded de color, font o espaiat.
3. Llegeix `backend/CLAUDE.md` — endpoints disponibles i models.

---

## Tasca

Crear la pàgina privada de configuració d'usuari a la ruta `/settings`.

---

## Ruta Angular

Afegir a `app.routes.ts`:

```typescript
{
  path: 'settings',
  loadComponent: () => import('./features/settings/settings.component')
    .then(m => m.SettingsComponent),
  canActivate: [AuthGuard]   // ja existent al projecte
}
```

---

## Estructura de fitxers a crear

```
frontend/src/app/features/settings/
├── settings.component.ts
├── settings.component.html
└── settings.component.css
```

No cal un servei separat: les crides HTTP es fan des de `AuthService` (ja existent) o directament amb `ApiService`.

---

## Endpoints del backend

```
PUT  /api/profile              → actualitzar username, email, avatar, bio, coverImage
PUT  /api/profile/password     → canviar contrasenya
```

### Body `PUT /api/profile`:
```typescript
{
  username?: string;
  email?: string;
  avatar?: string;       // URL de text
  bio?: string;
  coverImage?: string;   // URL de text (upload futur; ara camp de text)
}
```

### Body `PUT /api/profile/password`:
```typescript
{
  currentPassword: string;
  newPassword: string;
}
```

Errors esperats del backend:
- `400` — validació (username massa curt, email invàlid, etc.)
- `409` — username o email ja en ús
- `401` — contrasenya actual incorrecta

---

## Layout de la pàgina

Pàgina centrada, sense sidebars. Columna única amb `max-width` consistent amb la resta del projecte.

```
┌──────────────────────────────────┐
│  Settings                        │  ← títol de pàgina
├──────────────────────────────────┤
│  PROFILE                         │  ← secció
│  Avatar URL        [input]       │
│  Cover Image URL   [input]       │
│  Username          [input]       │
│  Bio               [textarea]    │
│                    [Save]        │
├──────────────────────────────────┤
│  ACCOUNT                         │  ← secció
│  Email             [input]       │
│                    [Save]        │
├──────────────────────────────────┤
│  PASSWORD                        │  ← secció
│  Current password  [input]       │
│  New password      [input]       │
│  Confirm password  [input]       │
│                    [Save]        │
└──────────────────────────────────┘
```

Tres seccions clarament separades, cadascuna amb el seu propi botó `Save` i gestió d'errors independent.

---

## Secció 1 — Profile

Camps:
- **Avatar URL** — `<input type="url">`. Placeholder: `https://...`. Si hi ha valor actual, apareix preomplert.
  - Previsualització en temps real: mostra la imatge en un cercle petit a la dreta de l'input. Si la URL no és vàlida o falla la càrrega → mostra la inicial com a fallback (mateixa lògica que `color.utils.ts`).
- **Cover Image URL** — `<input type="url">`. Placeholder: `https://...`. Previsualització en temps real: banner horitzontal petit sota l'input (~80px d'alçada). Si falla → fons de color derivat del username.
- **Username** — `<input type="text">`. Preomplert amb el valor actual.
- **Bio** — `<textarea>` auto-resize. Màxim 200 caràcters. Mostra comptador `X/200`. Preomplert amb el valor actual.

Botó `Save changes`:
- Disabled si cap camp ha canviat respecte al valor inicial.
- En clicar: `PUT /api/profile` amb tots els camps (no cal enviar només els modificats).
- En èxit: actualitza l'estat de `AuthService` (`currentUser`) perquè la navbar i la resta de la web reflecteixin els canvis immediatament. Mostra missatge d'èxit inline sota el botó (no toast global).
- En error `409` (username en ús): mostra missatge d'error específic sota el camp `Username`.
- En altres errors: mostra missatge genèric sota el botó.

---

## Secció 2 — Account

Camps:
- **Email** — `<input type="email">`. Preomplert amb l'email actual (dada privada, no visible al perfil públic).

Botó `Save`:
- Disabled si l'email no ha canviat.
- En clicar: `PUT /api/profile` amb `{ email }`.
- En èxit: missatge d'èxit inline.
- En error `409` (email en ús): missatge d'error sota el camp.
- En error `400` (format invàlid): missatge d'error sota el camp.

---

## Secció 3 — Password

Camps:
- **Current password** — `<input type="password">`.
- **New password** — `<input type="password">`. Mínim 8 caràcters (validació al frontend abans d'enviar).
- **Confirm new password** — `<input type="password">`. Validació al frontend: ha de coincidir amb "New password".

Botó `Update password`:
- Disabled si algun dels tres camps és buit.
- Validació al frontend **abans** de fer la crida:
  - New password ≥ 8 caràcters → si no, error inline sota el camp.
  - Confirm coincideix amb New → si no, error inline sota el camp.
- En clicar (si la validació passa): `PUT /api/profile/password` amb `{ currentPassword, newPassword }`.
- En èxit: neteja els tres camps. Mostra missatge d'èxit inline.
- En error `401` (contrasenya actual incorrecta): missatge d'error específic sota el camp "Current password".

---

## Carregar les dades inicials

En inicialitzar el component, omple els camps amb les dades de l'usuari autenticat.

- Les dades vénen de `AuthService.currentUser` (ja disponible en memòria, no cal una crida extra).
- Si per algun motiu `currentUser` és null → redirigeix a `/login` (tot i que `AuthGuard` ja ho hauria fet).

---

## Regles d'implementació

- CSS custom pur. Totes les variables del `DESIGN.md`.
- Sintaxi Angular 17+: `@if`, `inject()`, `standalone: true`. No usar `FormsModule`; usar **Reactive Forms** (`ReactiveFormsModule`) per a la gestió dels formularis.
- Cada secció gestiona el seu propi estat de càrrega i error de forma **independent**. Un error a la secció Password no afecta l'estat de la secció Profile.
- Els missatges d'error i èxit apareixen **inline** (sota el camp o sota el botó corresponent), no com a alerts del navegador ni toasts globals.
- Els inputs de password han de tenir un botó de toggle show/hide (icona d'ull).
- La previsualització d'avatar i cover s'actualitza **on change** de l'input (no cal botó de preview).
- Quan el backend retorna èxit a `PUT /api/profile`, cridar `AuthService` per actualitzar `currentUser` en memòria. Consulta com `AuthService` exposa aquesta actualització (potser un mètode `updateCurrentUser(data)` o similar). Si no existeix, afegeix-lo.

---

## Estats a gestionar

| Situació | Comportament |
|---|---|
| Carregant (save en curs) | Botó disabled + spinner inline al botó |
| Èxit | Missatge verd inline sota el botó, desapareix als 4s |
| Error de validació frontend | Missatge vermell sota el camp específic |
| Error del backend (409, 401, 400) | Missatge vermell sota el camp o botó corresponent |
| Cap canvi detectat | Botó `Save` disabled |
| URL d'avatar invàlida | Previsualització mostra fallback (inicial + color) |

---

## Resultat esperat

- ✅ Ruta `/settings` creada, protegida per `AuthGuard`
- ✅ Tres seccions independents: Profile, Account, Password
- ✅ Camps preomplerts amb les dades actuals de `AuthService.currentUser`
- ✅ Previsualització en temps real d'avatar i cover image
- ✅ Toggle show/hide als camps de password
- ✅ Validació al frontend abans de cada crida
- ✅ Errors inline específics per camp i per secció
- ✅ En èxit de Profile: `AuthService.currentUser` actualitzat immediatament
- ✅ Botó `Save` disabled si no hi ha canvis o si hi ha càrrega en curs
- ✅ Cap valor de CSS hardcoded