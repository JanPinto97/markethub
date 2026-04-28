# PROMPT 14 — Responsive, accessibilitat, menús i sessió expirada

## Abans de començar (Si no ho has fet abans)

1. Llegeix `frontend/CLAUDE.md` — estructura de components i convencions del projecte.
2. Llegeix `frontend/DESIGN.md` — tots els tokens CSS. Cap valor hardcoded de color, font o espaiat.

Aquest prompt **no crea cap ruta nova ni cap feature nova**. És un prompt de qualitat transversal: modifica components ja existents arreu del projecte. Llegeix cada component abans de tocar-lo.

Treballa fitxer per fitxer. No facis canvis massius en un sol bloc; és fàcil trencar coses.

---

## Tasca

Quatre grups de millores globals:

1. Responsive (tablet i mòbil)
2. Accessibilitat (aria-labels, focus visible, navegació per teclat)
3. Tancar menús en clicar fora (qualsevol menú que no ho faci)
4. Gestió de sessió expirada

---

## Grup 1 — Responsive

### Breakpoints a usar

Defineix-los com a variables CSS o com a constants al projecte si no existeixen ja. Usa sempre els mateixos valors a tot arreu:

```css
/* Tablet: 768px – 1023px */
/* Mòbil:  < 768px        */
```

No inventis breakpoints intermedis. Si el `DESIGN.md` ja en defineix, usa'ls.

### Layout de 3 columnes (`/community`)

**Tablet (768px – 1023px):**

- La sidebar dreta desapareix completament (`display: none`).
- La sidebar esquerra es manté visible però més estreta (~200px).
- El feed central ocupa la resta de l'amplada.

**Mòbil (< 768px):**

- La sidebar esquerra es converteix en un **drawer** (menú lliscant lateral):
  - Oculta per defecte, fora de pantalla a l'esquerra (`transform: translateX(-100%)`).
  - Un botó d'hamburguesa (☰) apareix a l'esquerra del header per obrir-lo.
  - En obrir-se, un overlay fosc cobreix el contingut principal. En clicar l'overlay → tanca el drawer.
  - Transició suau (`transition: transform 200ms ease`).
- La sidebar dreta desapareix (`display: none`).
- El feed central ocupa tota l'amplada.
- El botó d'hamburguesa és visible **només en mòbil** (`display: none` en desktop i tablet).

### Layout de 2 columnes (`/community/p/:id`)

**Tablet:**

- El panell dret (membres + sol·licituds) es col·lapsa en un botó flotant o una pestanya a la part inferior. En clicar → s'obre com un drawer des de la dreta.
- El feed ocupa tota l'amplada.

**Mòbil:**

- Igual que tablet però el drawer ocupa tota la pantalla (`width: 100%`).

### Pàgines de columna única (`/profile/:username`, `/settings`, `/search`, `/community/c/:id`, `/community/t/:slug`, etc.)

**Tablet i mòbil:**

- Ja són columna única, però cal verificar:
  - El `max-width` del contingut central no és massa ample (≤ 100% amb padding lateral de ~16px en mòbil).
  - Els formularis de `/settings` no trenquen el layout en pantalla estreta.
  - Les targetes de post (`PostCardComponent`, `PostRedditCard`) s'adapten correctament (sense overflow horitzontal).

### Header

**Mòbil:**

- La barra de cerca (`SearchBarComponent`) s'amaga del header.
- Apareix una icona de lupa (🔍) a la dreta del nom de la plataforma. En clicar → expandeix un input de cerca a tota l'amplada (ocupa tota la fila del header, oculta el nom i les icones). Un botó Cancel torna a l'estat normal.
- Les icones de configuració i avatar continuen visibles.
- El botó d'hamburguesa apareix a l'esquerra.

**Tablet:**

- La barra de cerca es redueix però es manté visible.
- Totes les icones de la dreta es mantenen.

### PostCardComponent i PostRedditCard

**Mòbil:**

- El menú de tres punts és sempre visible (no cal hover en tàctil).
- Les imatges i vídeos no superen l'amplada de la targeta (`max-width: 100%`).
- El peu de la targeta (likes, comentaris) té prou espai de toc (mínim 44px d'alçada per element interactiu).

### Caixa de creació de post

**Mòbil:**

- Els botons d'acció (imatge, emoji, Post) s'adapten sense desbordament.
- El textarea creix correctament en pantalla estreta.

---

## Grup 2 — Accessibilitat

### Focus visible

Tots els elements interactius han de tenir un `focus-visible` estilitzat. **No** uses `outline: none` sense alternativa.

Afegeix globalment a `src/styles/variables.css` o equivalent:

```css
:focus-visible {
  outline: 2px solid var(--color-accent); /* usa la variable del DESIGN.md */
  outline-offset: 2px;
  border-radius: 4px;
}
```

Verifica que no hi hagi cap `outline: none` sense un estil de focus alternatiu al projecte. Si en trobes, corregeix-los.

### aria-labels a icones-botó

Tots els botons que contenen **només una icona** (sense text visible) necessiten `aria-label`. Fes un recorregut per tots els components i afegeix els que falten:

| Component              | Botó         | aria-label                                                             |
| ---------------------- | ------------ | ---------------------------------------------------------------------- |
| `PostCardComponent`    | Menú ···     | `"Post options"`                                                       |
| `PostCardComponent`    | Like         | `"Like post"` / `"Unlike post"` (dinàmic)                              |
| `PostCardComponent`    | Comentaris   | `"View comments"`                                                      |
| `PostCardComponent`    | Pin          | `"Pin post"` / `"Unpin post"`                                          |
| `PostRedditCard`       | Upvote       | `"Upvote"`                                                             |
| `PostRedditCard`       | Downvote     | `"Downvote"`                                                           |
| `EmojiPickerComponent` | Cada emoji   | `"[nom de l'emoji]"` o simplement `aria-hidden="true"` si és decoratiu |
| `SearchBarComponent`   | Lupa / cerca | `"Search"`                                                             |
| `community.component`  | Hamburguesa  | `"Open menu"` / `"Close menu"` (dinàmic)                               |
| Modals                 | Botó X       | `"Close"`                                                              |
| `PostCardComponent`    | Eliminar     | `"Delete post"`                                                        |
| Comentaris             | Eliminar     | `"Delete comment"`                                                     |

Si trobes altres botons d'icona sense `aria-label`, afegeix-los.

### Rols ARIA per a components interactius

**Modals:**

```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-title-id">
  <h2 id="modal-title-id">Títol del modal</h2>
  ...
</div>
```

Aplica a: modal de Create Community, modal de Join Request, modal de sol·licitud pending, modal de followers/following, popup de cerca de topics.

**Menú de tres punts (dropdown):**

```html
<button aria-haspopup="true" [attr.aria-expanded]="isMenuOpen">···</button>
<ul role="menu">
  <li role="menuitem">...</li>
</ul>
```

**Pestanyes (Trending/Following, Top/Recent, All/Users/Posts/Communities):**

```html
<div role="tablist">
  <button role="tab" [attr.aria-selected]="activeTab === 'trending'">
    Trending
  </button>
  <button role="tab" [attr.aria-selected]="activeTab === 'following'">
    Following
  </button>
</div>
```

**Filtres de categoria al popup de topics:**
Usa `role="group"` per al contenidor i `aria-pressed` per a cada botó de filtre.

### Focus management als modals

Quan s'obre un modal:

1. El focus es mou automàticament al primer element interactiu dins el modal (o al botó de tancar si no n'hi ha d'altre).
2. El focus queda **atrapat** dins el modal mentre és obert (Tab i Shift+Tab circulen pels elements del modal, no surten).
3. En tancar el modal, el focus torna a l'element que l'havia obert.

Implementa el focus trap amb un helper reutilitzable:

```typescript
// src/app/shared/utils/focus-trap.utils.ts
export function trapFocus(element: HTMLElement): () => void {
  // Retorna una funció de cleanup per eliminar el listener
}
```

Aplica als modals: Create Community, Join Request, sol·licitud pending, followers/following.

### Atributs ARIA d'estat

- Botons de like: `aria-pressed="true|false"` (indica si l'usuari ha donat like).
- Botons de vot (PostReddit): `aria-pressed="true|false"` per a upvote i downvote per separat.
- Input de cerca: `aria-expanded="true|false"` quan el dropdown és obert, `aria-controls="search-dropdown-id"`.
- Llista de resultats del dropdown: `role="listbox"`, cada fila `role="option"`, fila activa `aria-selected="true"`.

---

## Grup 3 — Tancar menús en clicar fora

Fes un recorregut per tots els components del projecte que tenen elements que s'obren i es tanquen, i verifica que es tanquen en clicar fora. La llista completa:

| Component                        | Element               | Ja funciona?                      | Acció                       |
| -------------------------------- | --------------------- | --------------------------------- | --------------------------- |
| `PostCardComponent`              | Menú ···              | ⚠️ Pendent (Prompt 6 ho demanava) | Verifica i corregeix si cal |
| `CommunityMembersPanelComponent` | Dropdown Promote      | ⚠️ Pendent                        | Verifica i corregeix        |
| `SearchBarComponent`             | Dropdown de resultats | Fet al Prompt 13                  | Verifica                    |
| `TopicSearchPopup`               | Popup sencer          | Fet al Prompt 9                   | Verifica                    |
| `EmojiPickerComponent`           | Popover d'emojis      | Fet al Prompt 6                   | Verifica                    |

**Patró unificat per a tots:**

En lloc de múltiples `@HostListener('document:click')` dispersos (que poden interactuar malament entre ells), crea un servei centralitzat:

```typescript
// src/app/core/services/outside-click.service.ts
@Injectable({ providedIn: "root" })
export class OutsideClickService {
  // Emet cada clic al document
  readonly click$ = fromEvent<MouseEvent>(document, "click");
}
```

Cada component s'hi subscriu i comprova si el clic és dins o fora del seu element (`elementRef.nativeElement.contains(event.target)`). Dessubscriu a `ngOnDestroy`.

Si el patró de `@HostListener` ja funciona correctament a tots els components, no cal el servei. Però si trobes inconsistències o listeners que no es netegen, migra al servei centralitzat.

**Verifica especialment:**

- Que obrir un menú no dispara el tancament d'un altre menú simultàniament (problema clàssic de propagació d'events).
- Que `$event.stopPropagation()` s'usa al botó d'obertura per evitar que el clic d'obertura es propagui al document i tanqui el menú immediatament.

---

## Grup 4 — Gestió de sessió expirada

### Situació actual

Quan el refresh token expira, `AuthInterceptor` falla en renovar el token i probablement fa un redirect silent a `/login` sense explicar per què. L'usuari perd el context i no sap què ha passat.

### Comportament desitjat

Quan una crida retorna `401` i el refresc del token falla:

1. Mostra un toast o un banner persistent (no un toast que desapareix sol) amb el missatge: `"Your session has expired. Please sign in again."`
2. Esborra l'estat d'autenticació (`AuthService.logout()` o equivalent).
3. Redirigeix a `/login` **després d'un delay de 2 segons** perquè l'usuari pugui llegir el missatge.
4. A la pàgina de `/login`, si hi ha un query param `?reason=session_expired`, mostra un missatge informatiu sota el formulari: `"Your session expired. Please sign in to continue."` — diferent del missatge genèric d'error de credencials.

### Implementació

**A `AuthInterceptor`:**

```typescript
// Quan el refresh falla:
this.toastService.show(
  "Your session has expired. Please sign in again.",
  "error",
);
// El toast d'error no desapareix automàticament (o té un timeout molt llarg, 8s)
setTimeout(() => {
  this.router.navigate(["/login"], {
    queryParams: { reason: "session_expired" },
  });
}, 2000);
```

**A `LoginComponent`:**

```typescript
// En ngOnInit, llegeix el query param:
const reason = this.route.snapshot.queryParams["reason"];
if (reason === "session_expired") {
  // Mostra missatge informatiu (no d'error) sota el formulari
}
```

**Toast d'error de sessió:**
Modifica `ToastService` perquè accepti un `duration` opcional:

```typescript
show(message: string, type?: 'success' | 'error' | 'info', duration?: number): void
// duration en ms. Si és 0 o undefined, usa el valor per defecte (3000ms).
// Si és -1, el toast no desapareix automàticament (cal tancar manualment).
```

Usa `duration: -1` per al missatge de sessió expirada.

---

## Ordre de treball recomanat

1. **Sessió expirada** — és independent de tot i és fàcil de verificar.
2. **Focus visible global** — afegir el CSS a `variables.css` i eliminar `outline: none` orfes.
3. **aria-labels** — recorregut component per component, canvis mínims.
4. **Rols ARIA** — modals, menús, pestanyes.
5. **Focus trap** — implementar el helper i aplicar-lo als modals.
6. **Tancar menús** — verificar i corregir tots els components.
7. **Responsive** — el més extens; fes-ho per components, de major a menor impacte: header → layout principal → PostCardComponent → pàgines secundàries.

---

## Regles d'implementació

- CSS custom pur. Cap framework. Usa `@media` queries amb els breakpoints definits.
- No afegeixis `!important` per resoldre problemes de responsive. Si cal, revisa l'especificitat.
- El drawer del mòbil usa `transform` (no `left` o `margin`) per a la transició — és més performant (no provoca reflow).
- El focus trap no usa cap llibreria externa. El helper de `focus-trap.utils.ts` és CSS + JS pur.
- Tots els `setTimeout` de cleanup (sessió expirada, toasts llargs) es cancel·len a `ngOnDestroy` amb `clearTimeout`.
- **No trenquis cap funcionalitat existent** en fer els canvis de responsive. Testa cada secció en 3 amplades: 1280px (desktop), 900px (tablet), 375px (mòbil).

---

## Resum de fitxers a crear o modificar

**Crear:**

```
frontend/src/app/shared/utils/focus-trap.utils.ts
frontend/src/app/core/services/outside-click.service.ts  (opcional, si cal)
```

**Modificar (llista no exhaustiva — afegeix els que calgui):**

```
frontend/src/styles/variables.css                         → focus-visible global
frontend/src/app/core/interceptors/auth.interceptor.ts    → sessió expirada
frontend/src/app/features/auth/login/login.component.*    → missatge session_expired
frontend/src/app/core/services/toast.service.ts           → paràmetre duration
frontend/src/app/shared/components/navbar/*               → hamburguesa, cerca mòbil
frontend/src/app/features/community/community.component.* → drawer mòbil, layout tablet
frontend/src/app/features/community/components/post-card/* → aria, menú always visible mòbil
frontend/src/app/features/community/components/post-reddit-card/* → aria, responsive
frontend/src/app/shared/components/search-bar/*           → aria, responsive header
```

---

## Resultat esperat

**Responsive:**

- ✅ Drawer lateral en mòbil amb overlay i transició suau
- ✅ Botó hamburguesa visible només en mòbil
- ✅ Header adaptat a mòbil (cerca colapsable)
- ✅ Cap component amb overflow horitzontal en cap breakpoint
- ✅ Elements tàctils amb mínim 44px d'àrea de toc

**Accessibilitat:**

- ✅ `focus-visible` estilitzat a tots els elements interactius
- ✅ Cap `outline: none` sense alternativa
- ✅ `aria-label` a tots els botons d'icona
- ✅ `role="dialog"` + `aria-modal` als modals
- ✅ `role="tab"` a les pestanyes
- ✅ `aria-pressed` als likes i vots
- ✅ Focus trap als modals (Tab no surt del modal)
- ✅ Focus retorna a l'element origen en tancar un modal

**Menús:**

- ✅ Tots els dropdowns i menús es tanquen en clicar fora
- ✅ Cap menú es tanca immediatament en obrir-se (stopPropagation correcte)
- ✅ Cap listener d'event queda orfe en destruir un component

**Sessió:**

- ✅ Toast persistent quan la sessió expira
- ✅ Redirect a `/login` amb delay de 2s
- ✅ Missatge informatiu a `/login?reason=session_expired`
- ✅ `ToastService` accepta `duration` opcional (incloent -1 per a persistent)
