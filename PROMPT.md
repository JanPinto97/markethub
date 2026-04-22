# PROMPT 6 — Feed central: vídeos, emoji picker i polish general

## Abans de començar

1. Llegeix `frontend/CLAUDE.md` — estructura de components i convencions del projecte.
2. Llegeix `frontend/DESIGN.md` — tots els tokens CSS. Cap valor hardcoded de color, font o espaiat.
3. Llegeix `backend/CLAUDE.md` — endpoints disponibles i models.

Aquest prompt **modifica components ja existents**. No crea cap ruta nova. Tots els canvis són a `PostCardComponent` i a `community.component` (feed central). Llegeix bé el codi existent abans de modificar res.

---

## Tasca

Completar i polir el feed central de `/community` amb tres grups de millores:

1. Suport de vídeo a posts i caixa de creació
2. Emoji picker real
3. Polish general: skeletons, retry, hover states, toast d'èxit

---

## Grup 1 — Suport de vídeo

### Caixa de creació de post

L'`<input type="file">` actual accepta només imatges. Modifica-ho:

```html
accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
```

Límits de mida (validació al frontend abans d'enviar):

- Imatges: màx 10MB
- Vídeos: màx 100MB

Si l'usuari selecciona un fitxer que supera el límit → missatge d'error inline sota la previsualització, l'arxiu no s'afegeix.

**Previsualització:**

- Si és imatge: igual que ara (`<img>`).
- Si és vídeo: element `<video controls preload="metadata">` amb la URL objecte local (`URL.createObjectURL`). Alçada màxima 200px. `object-fit: contain`.
- La `x` per eliminar funciona igual en els dos casos. En eliminar, allibera la URL objecte (`URL.revokeObjectURL`) per evitar memory leaks.

**Enviament:**

- El camp `mediaType` del `FormData` ha de ser `'image'` o `'video'` segons el fitxer seleccionat.
- Si no hi ha fitxer, s'envia JSON normal (sense canvis respecte a l'actual).

### PostCardComponent — reproductor de vídeo

Quan `post.mediaType === 'video'`, en lloc de `<img>` mostra:

```html
<video
  controls
  preload="metadata"
  [src]="post.mediaUrl"
  style="max-height: 400px; width: 100%; object-fit: contain;"
></video>
```

- No autoplay.
- No loop.
- Mostra els controls natius del navegador.
- Si el vídeo no carrega (error d'event `(error)`): mostra un placeholder amb text "Video unavailable".

---

## Grup 2 — Emoji picker

### Implementació sense llibreries externes

Crea un component `EmojiPickerComponent` simple:

```
frontend/src/app/shared/components/emoji-picker/
├── emoji-picker.component.ts
├── emoji-picker.component.html
└── emoji-picker.component.css
```

**Contingut:**
Una graella d'emojis agrupats per categoria. Usa un fitxer de dades estàtic (array de strings dins el component, no un JSON extern):

```typescript
const EMOJI_GROUPS = [
  {
    label: "Smileys",
    emojis: ["😀", "😂", "😍", "🤔", "😎", "🙄", "😤", "🤯", "😴", "🥳"],
  },
  {
    label: "Finance",
    emojis: ["📈", "📉", "💰", "💵", "💹", "🏦", "📊", "🪙", "💎", "🚀"],
  },
  {
    label: "Hands",
    emojis: ["👍", "👎", "🙌", "👏", "🤝", "💪", "🫡", "☝️", "👀", "✅"],
  },
  {
    label: "Objects",
    emojis: ["🔥", "⚡", "🎯", "📌", "🗓️", "📰", "🔔", "⏰", "🌍", "⚠️"],
  },
];
```

**Comportament:**

- S'obre en clicar la icona 😊 de la caixa de creació de post.
- Apareix com un **popover** posicionat sobre la icona (no modal, no ocupa tota la pantalla).
- En clicar un emoji: l'afegeix al text del post a la posició actual del cursor (si es pot detectar) o al final.
- Es tanca en clicar fora del popover (usa `@HostListener('document:click')` o similar).
- Es tanca en prémer `Escape`.

**Output:**

```typescript
@Output() emojiSelected = new EventEmitter<string>();
```

El component pare (`community.component`) escolta i afegeix l'emoji al textarea.

---

## Grup 3 — Polish general

### 3.1 Loading skeletons

Substitueix tots els textos de càrrega ("Loading posts…", "Loading...") per **skeleton screens** coherents.

**Skeleton d'una targeta de post** (crea un component `PostSkeletonComponent`):

```
frontend/src/app/features/community/components/post-skeleton/
├── post-skeleton.component.ts
├── post-skeleton.component.html
└── post-skeleton.component.css
```

Estructura visual del skeleton (blocs grisos animats amb shimmer):

```
[Cercle] [Bloc ample]   [Bloc curt]
         [Bloc molt ample            ]
         [Bloc ample      ]
         [Bloc curt] [Bloc curt]
```

Animació shimmer: gradient lineal que es desplaça d'esquerra a dreta en loop (CSS pur, sense JS).

```css
@keyframes shimmer {
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
}
```

Mostra **3 skeletons** mentre el feed carrega (càrrega inicial i canvi de mode Trending/Following).
Mostra **1 skeleton** al final de la llista mentre carrega la pàgina següent (infinite scroll).

`PostSkeletonComponent` s'usa també al perfil d'usuari (`/profile/:username`). Importa'l allà si no es va fer al Prompt 4.

### 3.2 Estat d'error amb retry

Quan el feed falla en carregar (xarxa, 500, etc.), en lloc del text d'error actual mostra:

```
┌──────────────────────────────────┐
│  ⚠️  Could not load posts.       │
│      [Try again]                 │
└──────────────────────────────────┘
```

- El botó `Try again` torna a cridar el mateix endpoint.
- Si falla la pàgina N del infinite scroll (no la primera): mostra el botó de retry només al final de la llista, no substitueix tot el feed.

### 3.3 Toast d'èxit en crear un post

Quan un post es crea correctament, mostra un toast a la cantonada superior dreta:

```
✅  Post published successfully
```

**Especificació del toast:**

- Apareix amb una transició suau (slide-in des de la dreta, 200ms).
- Desapareix automàticament als 3 segons (fade-out 200ms).
- Es pot tancar manualment amb una `x`.
- Màxim 1 toast visible alhora (si es creen posts ràpid, el segon substitueix el primer).

Crea un `ToastComponent` reutilitzable:

```
frontend/src/app/shared/components/toast/
├── toast.component.ts
├── toast.component.html
└── toast.component.css
```

I un `ToastService` injectable a `root`:

```
frontend/src/app/core/services/toast.service.ts
```

```typescript
// API del ToastService:
show(message: string, type: 'success' | 'error' | 'info' = 'success'): void
```

El `ToastComponent` s'afegeix a `app.component.html` (o equivalent arrel) perquè estigui disponible a tota l'app. Des de qualsevol component s'injecta `ToastService` i es crida `show(...)`.

**Usa el `ToastService` també a:**

- Settings (Prompt 5): si `ToastService` no existia quan es va fer, afegeix-lo ara als saves exitosos.
- Eliminació de posts: "Post deleted."

### 3.4 Hover states a les targetes

Afegeix a `PostCardComponent`:

- La targeta completa: transició subtil de `background-color` o `box-shadow` en hover (coherent amb `DESIGN.md`).
- El menú de tres punts (`···`): visible sempre en mòbil, visible en hover de la targeta en desktop.
- Els botons de like i comentaris: canvi de color en hover i cursor pointer.
- L'avatar i el nom de l'autor: cursor pointer (ja tenen `routerLink`).

### 3.5 Tancar el menú de tres punts en clicar fora

El menú de tres punts actualment queda obert. Corregeix-ho:

- Usa `@HostListener('document:click', ['$event'])` dins `PostCardComponent`.
- En clicar fora del menú → `isMenuOpen = false`.
- Assegura't que el clic sobre el botó d'obertura no es propagui al document (usa `$event.stopPropagation()`).

---

## Regles d'implementació

- CSS custom pur. Totes les variables del `DESIGN.md`.
- Sintaxi Angular 17+: `@if`, `@for`, `inject()`, `standalone: true`.
- `ToastService` injectable a `root` (`providedIn: 'root'`).
- **No instal·lis cap llibreria externa** per a l'emoji picker ni per als toasts. Tot és CSS + Angular pur.
- Allibera sempre els `URL.createObjectURL` amb `URL.revokeObjectURL` quan ja no calguin.
- Els `@HostListener` de document:click als components han de fer `ngOnDestroy` per evitar listeners orfes si el component es destrueix amb el menú obert.

---

## Resum de fitxers a crear o modificar

**Crear:**

```
frontend/src/app/shared/components/emoji-picker/   (nou)
frontend/src/app/shared/components/toast/          (nou)
frontend/src/app/core/services/toast.service.ts    (nou)
frontend/src/app/features/community/components/post-skeleton/  (nou)
```

**Modificar:**

```
frontend/src/app/features/community/community.component.*   (skeletons, retry, toast)
frontend/src/app/features/community/components/post-card/*  (vídeo, hover, menú fix)
frontend/src/app/app.component.html                         (afegir <app-toast>)
```

**Modificar si cal (Prompt 5 ja fet):**

```
frontend/src/app/features/settings/settings.component.ts   (usar ToastService)
frontend/src/app/features/profile/profile.component.*      (usar PostSkeletonComponent)
```

---

## Resultat esperat

- ✅ Crear posts amb vídeo (mp4, webm) + validació de mida + previsualització local
- ✅ Reproductor de vídeo natiu a `PostCardComponent`
- ✅ Emoji picker popover sense llibreries externes
- ✅ Skeleton screens animats (shimmer) en lloc de text de càrrega
- ✅ Estat d'error amb botó "Try again" al feed i al infinite scroll
- ✅ Toast d'èxit en crear posts (i en altres accions exitoses anteriors)
- ✅ Hover states coherents a les targetes de post
- ✅ Menú de tres punts es tanca en clicar fora
- ✅ Cap memory leak de URL objecte de previsualització
- ✅ Cap valor de CSS hardcoded
