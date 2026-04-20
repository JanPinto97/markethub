# PROMPT 1 — Community Frontend: Scaffold + Layout

## Context del projecte

Estem construint **MarketHub**, un portal financer i xarxa social. El stack és:

- **Frontend:** Angular 17+ amb standalone components, CSS custom pur (sense Bootstrap ni Tailwind), TypeScript strict.
- **Rutes:** `/community` és la pàgina que ara construïm.

Tens disponible el fitxer `frontend/DESIGN.md` amb tots els tokens de disseny globals del projecte (colors, tipografia, espaiat, variables CSS). **Llegeix-lo completament abans d'escriure cap línia de codi.** Tot el CSS d'aquesta pàgina ha d'usar les variables definides allà.

La imatge adjunta és una referència visual aproximada de l'estructura. **No la copiïs literalment:** és només per entendre la distribució general de columnes. El que mana és la descripció d'aquest prompt.

---

## Objectiu d'aquest prompt

Crear l'**esquelet complet de la pàgina `/community`** amb el layout de 3 columnes i totes les seccions buides però presents, amb dimensions i posicionament correctes.

**No implementis lògica ni dades reals en aquest prompt.** Tot el contingut és estàtic o placeholder.

---

## Estructura general de la pàgina

La pàgina té **4 zones principals:**

```
┌─────────────────────────────────────────────────────┐
│                     HEADER                          │ ← fixed, full width
├──────────────┬──────────────────────┬───────────────┤
│              │                      │               │
│   SIDEBAR    │    FEED CENTRAL      │   SIDEBAR     │
│  ESQUERRA    │                      │   DRETA       │
│   ~240px     │       flex: 1        │   ~300px      │
│              │                      │               │
│   (scroll)   │      (scroll)        │   (fixed)     │
│              │                      │               │
└──────────────┴──────────────────────┴───────────────┘
```

- El **header** és `position: fixed`, `top: 0`, `z-index` alt.
- El contingut principal comença amb un `padding-top` igual a l'alçada del header.
- La **sidebar esquerra** i el **feed central** fan scroll.
- La **sidebar dreta** és `position: sticky, top: [header height]` i NO fa scroll.

---

## 1. Header

Barra superior fixa que ocupa tota l'amplada.

**Elements (d'esquerra a dreta):**

1. Nom de la plataforma: `MarketHub` (text, no logo)
2. Barra de cerca: `<input>` amb placeholder `"Search communities, topics..."`
3. Icona de configuració (⚙️ o similar, routerLink a `/settings`)
4. Avatar de l'usuari (cercle, placeholder gris si no hi ha avatar, routerLink a `/profile/:username`)

**Comportament:**

- La barra de cerca ocupa l'espai central i és la més ampla.
- Les icones de la dreta estan alineades verticalment al centre.

---

## 2. Sidebar esquerra

Columna fixa a l'esquerra (~240px). Té scroll propi si el contingut és llarg.

Conté **4 seccions**, separades visualment (pot ser amb un petit espai o un separador subtil):

### Secció 1 — Navegació principal

Un sol botó/link actiu:

- 🏠 `Home` (és la vista per defecte, la que estem construint)

### Secció 2 — My Communities

Títol de secció: `MY COMMUNITIES`
Llista de comunitats de l'usuari (de moment, 2-3 items placeholder):

- Cada item: `[Inicial en cercle de color] Nom de la comunitat`
- Exemple: `G  Gold Bugs [Public]` / `W  Whale Alerts [Private]`

### Secció 3 — Topics

Títol de secció: `TOPICS`

- Si no hi ha topics afegits: mostra un botó `+ Add Topics`
- Si n'hi ha: llista de topics, cadascun amb una icona/logo de la seva categoria a l'esquerra, i al final de la llista el botó `+ Add Topics`
- De moment posa 2-3 topics placeholder (ex: Gold, Crypto, Macro)

### Secció 4 — Zona inferior

A la part inferior de la sidebar (pot ser `margin-top: auto` si la sidebar és flex column):

- Botó prominent: `Create Community`

---

## 3. Feed central

La columna central, la més ampla. Té scroll propi.

### 3.1 — Selector Trending / Following

Dues pestanyes o botons toggle a la part superior:

- `Trending` (activa per defecte)
- `Following`

### 3.2 — Caixa de creació de post

Targeta amb:

- Avatar de l'usuari (petit, a l'esquerra)
- Input de text amb placeholder `"What's on your mind regarding the markets?"`
- Fila d'accions:
  - Icona d'imatge
  - Icona d'emoji
  - Botó `Post` (a la dreta)

### 3.3 — Feed de posts (placeholder)

2-3 targetes de post estàtiques per veure com quedaran. Cada targeta té:

- **Capçalera:** Avatar + Nom + Handle (@username) + temps (ex: "4h ago")
- **Cos:** Text del post (lorem ipsum financer)
- **Peu:** Icona like + número | Icona comentari + número

---

## 4. Sidebar dreta

Columna dreta (~300px), `position: sticky`.

**De moment BUIDA**, només amb:

- Text de copyright a la part inferior: `MarketHub © 2026. All rights reserved.`

---

## Fitxers a crear

Crea o modifica únicament els fitxers necessaris per a aquest layout. L'estructura esperada és la d'Angular standalone components:

```
frontend/src/app/features/community/
├── community.component.ts
├── community.component.html
└── community.component.css
```

Si cal crear subcarpetes per a components fills (header, sidebar, etc.), fes-ho, però en aquest primer prompt pot ser tot en un sol component per simplicitat.

Assegura't que la ruta `/community` ja existeix al router d'Angular (`app.routes.ts`). Si no existeix, afegeix-la.

---

## Regles de CSS

- **Només CSS custom.** Cap framework extern.
- **Totes les variables** de color, tipografia i espaiat han de venir del `DESIGN.md` / `variables.css` del projecte.
- El layout principal s'ha de fer amb **CSS Grid o Flexbox** (tria el que millor s'adapti).
- **Responsive:** de moment no cal fer-lo completament responsive, però el layout no ha de trencar-se en pantalles de ≥1200px. Per sota de 768px pot col·lapsar a una sola columna si vols, però no és prioritari ara.
- No usar `!important` llevat que sigui estrictament necessari.

---

## Resultat esperat

Al final d'aquest prompt ha d'existir una pàgina `/community` visible al navegador amb:

- ✅ Header fix amb nom, cerca, icona config i avatar
- ✅ Layout de 3 columnes correctament posicionat
- ✅ Sidebar esquerra amb les 4 seccions (placeholder)
- ✅ Feed central amb selector, caixa de post i 2-3 posts placeholder
- ✅ Sidebar dreta buida amb copyright
- ✅ Tot el CSS usant les variables del sistema de disseny

**No implementis cap crida a l'API, cap servei Angular ni cap lògica en aquest prompt.**
