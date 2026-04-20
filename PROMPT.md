# PROMPT 2 — Community Frontend: Sidebar Esquerra

## Context

Continuem amb el frontend de `/community` de **MarketHub**. El Prompt 1 ja ha creat
l'esquelet de la pàgina amb el layout de 3 columnes. Ara implementem la **sidebar esquerra**
amb lògica real: dades de l'API, navegació funcional i interaccions.

Llegeix `frontend/DESIGN.md` i `frontend/CLAUDE.md` abans d'escriure cap línia de codi.
Tot el CSS ha d'usar les variables del sistema de disseny.

---

## Objectiu

Implementar la sidebar esquerra completament funcional, connectada a l'API,
amb els estats corresponents (autenticat / no autenticat, comunitats buides, topics buits).

---

## Estructura de la sidebar

```
┌─────────────────────────┐
│  🏠 Home                │  ← Navegació principal
├─────────────────────────┤
│  MY COMMUNITIES         │  ← Secció 2
│  · Gold Bugs [Public]   │
│  · Whale Alerts [Priv.] │
├─────────────────────────┤
│  TOPICS                 │  ← Secció 3
│  · Gold                 │
│  · Crypto               │
│  [+ Add Topics]         │
├─────────────────────────┤
│                         │
│  [Create Community]     │  ← Zona inferior
└─────────────────────────┘
```

---

## Secció 1 — Navegació principal

Un sol element de navegació:

- **Home** amb icona de casa. Sempre visible. `routerLink="/community"`.
- Estil "actiu" quan estem a la ruta `/community` (usa `routerLinkActive`).

---

## Secció 2 — My Communities

**Títol:** `MY COMMUNITIES`

**Dades:** Crida a l'API per obtenir les comunitats de l'usuari autenticat.

- Endpoint: `GET /api/communities/my` (retorna llista de comunitats públiques
  i privades de les quals l'usuari és membre).
- Cada item mostra:
  - Cercle de color amb la inicial del nom de la comunitat (color generat
    a partir del nom, consistent, no aleatori en cada render).
  - Nom de la comunitat.
  - Etiqueta `[Public]` o `[Private]` al costat del nom, en text petit i discret.
  - `routerLink` a `/community/c/:communityId` (ruta que no implementem ara,
    però el link ha d'existir).

**Estats:**

- **Carregant:** placeholder/skeleton de 2-3 items.
- **Sense comunitats:** text discret "You haven't joined any community yet."
- **Amb comunitats:** llista completa sense límit de scroll.
- **No autenticat:** no es mostra aquesta secció.

---

## Secció 3 — Topics

**Títol:** `TOPICS`

**Dades:** Els topics els gestiona l'usuari localment (quins ha ancorat a la sidebar).
Es guarden a `localStorage` com a llista d'IDs. En carregar, es fa una crida
per obtenir els detalls d'aquests topics.

- Endpoint: `GET /api/topics?ids=id1,id2,id3`

Cada topic a la llista mostra:

- **Icona de categoria** a l'esquerra. Assigna una icona o color per categoria:
  - `CORE_MARKETS` → 📈 o color blau
  - `ECONOMIA_I_MACRO` → 🏦 o color verd
  - `ASSETS_ESPECIFICS` → 💼 o color taronja
  - `TRADING_I_INVERSIO` → ⚡ o color groc
  - Pots usar emojis, SVG inline simples o lletres amb color de fons. El que
    quedi més net visualment.
- Nom del topic.
- `routerLink` a `/community/t/:topicId` (ruta futura, el link ha d'existir).

**Botó "+ Add Topics":**

- Apareix sempre: si no hi ha topics, és l'únic element de la secció;
  si n'hi ha, apareix al final de la llista.
- De moment, en clicar, mostra un `console.log('open topic search')`.
  El modal/popup el farem en un prompt posterior.

**Estats:**

- **Sense topics ancorats:** mostra directament el botó `+ Add Topics`.
- **Amb topics:** llista + botó al final.
- **No autenticat:** la secció es mostra igual (els topics son públics),
  però el botó "+ Add Topics" no apareix.

---

## Secció 4 — Zona inferior

Situada a la part baixa de la sidebar (`margin-top: auto` si la sidebar
és un flex container en columna).

**Contingut:**

- Botó `Create Community` prominent, estil CTA (call to action).
- En clicar obre un modal/formulari. **De moment:** `console.log('open create community modal')`.
- **Visibilitat:** Només visible si l'usuari està autenticat. Si no ho està,
  no es mostra res en aquesta zona (o es pot mostrar un missatge "Join to create communities").

---

## Servei Angular a crear o ampliar

Crea o amplia `CommunityService` a `frontend/src/app/features/community/`:

```typescript
// Mètodes necessaris per a aquest prompt:
getMyCommunitites(): Observable<Community[]>
getTopicsByIds(ids: string[]): Observable<Topic[]>
```

Usa `ApiService` existent per fer les crides HTTP. No implementis la lògica
de gestió d'errors complexa, però sí que el component mostri l'estat de
"carregant" i "error genèric" si la crida falla.

---

## Topics al localStorage

```typescript
// Clau: 'mh_pinned_topics'
// Valor: JSON array d'strings amb els IDs, ex: '["id1","id2"]'

// Helpers a implementar (poden ser mètodes del servei o utils):
getPinnedTopicIds(): string[]
addPinnedTopic(id: string): void
removePinnedTopic(id: string): void
```

---

## Fitxers a crear o modificar

```
frontend/src/app/features/community/
├── community.component.ts         → injecta CommunityService, crida getMyCommunitites()
├── community.component.html       → afegeix la lògica @if/@for a la sidebar
├── community.component.css        → estils de la sidebar
└── services/
    └── community.service.ts       → nou, amb els mètodes descrits
```

Si en el Prompt 1 la sidebar era un component fill separat, modifica'l.
Si era tot en un sol component, pot continuar sent-ho.

---

## Regles

- CSS custom pur, variables del `DESIGN.md`.
- Usa `@if` i `@for` d'Angular 17+ (sintaxi nova, no `*ngIf` ni `*ngFor`).
- Usa `inject()` en comptes de constructor injection on sigui possible.
- El component ha de ser `standalone: true`.
- No implementis cap modal ni popup real en aquest prompt (només `console.log`).
- No implementis la pàgina de detall de comunitat ni de topic.

---

## Resultat esperat

Al final d'aquest prompt, la sidebar esquerra ha de:

- ✅ Mostrar les comunitats reals de l'usuari (o estat buit)
- ✅ Mostrar els topics ancorats des de localStorage (o botó si no n'hi ha)
- ✅ Tenir el botó "Create Community" visible només si autenticat
- ✅ Gestionar correctament els estats: carregant, buit, amb dades, no autenticat
- ✅ Tots els links creats amb `routerLink` (encara que la ruta destí no existeixi)
- ✅ CSS cohesiu amb el sistema de disseny del projecte
