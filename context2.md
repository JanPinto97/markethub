# MarketHub — Context Complementari

Aquest document és un complement al document de visió general del projecte.
Conté tota la informació nova, decisions i especificacions detallades que
s'han definit després del document original.

---

## Decisions de stack actualitzades

- **Bootstrap eliminat.** Angular ja cobreix el requisit de framework frontend.
  S'usa CSS custom pur amb variables. Cap framework CSS de tercers.
- **Docker posposat al final.** S'està desenvolupant localment (ng serve + npm run dev).
  Docker s'afegirà quan tot funcioni per preparar el desplegament.
- **Avatar d'usuari:** camp de text amb URL. No hi ha pujada de fitxers per avatars.
- **Imatges i vídeos en posts:** pujada de fitxers real amb multer.
  Fitxers servits estàticament des de `/backend/uploads/`.

---

## Estructura de fitxers de context del projecte

```
markethub/
├── CLAUDE.md         → context general, estat del projecte, regles
├── COMMUNITY.md      → especificació funcional completa de la pàgina Community
├── frontend/
│   ├── CLAUDE.md     → estructura Angular, components i rutes fets
│   ├── DESIGN.md     → sistema de disseny global (extret de la Home)
│   └── src/app/features/
│       ├── markets/DESIGN.md     → disseny específic de Markets
│       └── community/DESIGN.md  → disseny específic de Community
└── backend/
    └── CLAUDE.md     → models, rutes i infraestructura fets
```

**Regla important:** Qualsevol tasca relacionada amb Community ha de llegir
`COMMUNITY.md` completament abans d'escriure cap línia de codi.

---

## Navegació i rutes

```
/                   → Landing page pública. Usuaris autenticats → redirigeix a /markets
/markets            → Visible per a tothom. Accions requereixen login.
/community          → Visible per a tothom. Accions requereixen login.
/login              → Pública
/register           → Pública
/settings           → Privada. Canviar username, email, contrasenya.
/profile/:username  → Perfil públic d'usuari
/ai                 → Pàgina de chat IA completa. Accessible NOMÉS des del widget flotant.
```

Usuaris no autenticats que intenten fer qualsevol acció (publicar, fer like,
unir-se a comunitat, etc.) són redirigits a `/login`.

---

## Sistema de rols

### Rols de plataforma (User.role)

- `user` — rol per defecte en registrar-se
- `moderator` — pot eliminar qualsevol post o comentari a tota la plataforma
- `superadmin` — mateixos poders que moderator + pot eliminar usuaris

Els usuaris `moderator` i `superadmin` es creen via script de seed (`npm run seed`).
Mai es poden crear des de la UI.

**IMPORTANT:** Els rols de plataforma (`User.role`) són completament independents
dels rols de comunitat privada (`CommunityPrivate.members[].role`). Mai s'han de confondre.

### Rols de comunitat privada (CommunityPrivate.members[].role)

- `leader` — exactament 1 per comunitat. Poders màxims dins la comunitat.
- `moderator` — múltiples. Pot acceptar sol·licituds i eliminar posts.
- `little_whale` — múltiples. Bonus de posicionament al feed.
- `member` — rol per defecte en unir-se.

---

## Especificació detallada: tipus de posts

### PostX (estil Twitter/X)

- Usat a: feed general, comunitats públiques, comunitats privades
- Camps clau: `text` (max 400 chars), `mediaUrl`, `mediaType`, `origin`,
  `community`, `communityType`, `likes`, `trendingScore`, `isPinned`
- `origin` pot ser: `'general'`, `'public_community'`, `'private_community'`
- Sistema de likes (toggle)
- Comentaris amb un nivell de niament. Likes als comentaris.

### PostReddit (estil Reddit)

- Usat EXCLUSIVAMENT a: temes de discussió
- Camps clau: `title` (max 300 chars), `text` (max 2000 chars), `mediaUrl`,
  `mediaType`, `upvotes`, `downvotes`, `topic`
- Sistema de vots: upvote i downvote independents. Score = upvotes - downvotes.
  Votar l'oposat elimina el vot anterior.
- Comentaris amb un nivell de niament. Sense likes als comentaris.

**Regla fonamental:** PostX i PostReddit MAI es barregen. Mai apareixen junts
en cap feed, cerca o perfil d'usuari.

---

## Especificació detallada: feed general

### Mode Trending (per defecte, públic)

- Mostra PostX amb `origin: 'general'` i `origin: 'public_community'` barrejats.
- Posts de comunitats públiques mostren una etiqueta amb el nom de la comunitat.
- MAI mostra posts de `origin: 'private_community'`.
- Ordenat per `trendingScore` descendent.

### Mode Following (requereix login)

- Mostra PostX dels usuaris que segueixes.
- Inclou posts de `origin: 'general'` i `origin: 'public_community'`.
- MAI inclou posts de `origin: 'private_community'` encara que segueixis l'autor.
- Ordenat per `createdAt` descendent.

### Algorisme de trending score

```
baseScore = (likes × 1) + (commentCount × 2)
Si edat < 24h  → score = baseScore × 1.0
Si edat 24-48h → score = baseScore × 0.5
Si edat > 48h  → score = baseScore × 0.25
```

El `trendingScore` es recalcula cada 30 minuts via `setInterval` en `server.js`.

---

## Especificació detallada: comunitats públiques

- Qualsevol usuari autenticat pot unir-se directament (sense aprovació).
- Sense rols. Tots els membres són iguals.
- Sense moderació. Ningú pot eliminar posts excepte l'autor i els moderadors/superadmins de plataforma.
- Posts apareixen al feed general Trending amb etiqueta de comunitat.
- Quan l'últim membre marxa → comunitat eliminada automàticament i silenciosament.
- Una comunitat pública NO pot convertir-se en privada mai.
- El creador NO té cap rol especial i NO s'afegeix automàticament com a membre.

---

## Especificació detallada: comunitats privades

### Successió del líder quan marxa

1. Moderador aleatori → promogut a líder
2. Si no n'hi ha, Little Whale aleatori → promogut a líder
3. Si no n'hi ha, membre aleatori → promogut a líder
4. Si no hi ha ningú → comunitat eliminada automàticament

### Feed de comunitat privada

- Posts ordenats per `trendingScore` + bonus de rol:
  - Líder: +50 punts
  - Moderador: +20 punts
  - Little Whale: +10 punts
  - Membre: +0 punts
- El bonus s'aplica en temps de query (JavaScript), NO s'emmagatzema a MongoDB.
- Posts ancorats apareixen sempre al principi, per sobre dels trending.
- Posts de comunitats privades MAI apareixen al feed general.
- Posts de comunitats privades NO apareixen al perfil públic de l'autor.

### Pàgina de detalls de comunitat privada

- Tots els membres veuen: llista de membres amb rols, botó d'abandonar.
- Líder i moderadors veuen addicionalment: sol·licituds d'entrada pendents.
  En clicar una sol·licitud → popup amb el missatge complet i opcions acceptar/rebutjar.
- Líder veu addicionalment: botó d'expulsar membres, botó de promoure,
  botó d'eliminar la comunitat.

---

## Especificació detallada: temes de discussió

### Categories i temes

Hardcodejats via seed (`npm run seed:topics`). Mai canvien via UI.

**CORE_MARKETS:** Forex, Crypto, Stocks, Indices, ETFs, Bonds, Commodities, Metals, Energy

**ECONOMIA_I_MACRO:** Macro Economics, Central Banks, Interest Rates, Inflation,
GDP & Economic Data, Monetary Policy, Fiscal Policy, Geopolitics, Global Economy

**ASSETS_ESPECIFICS:** Large Cap Stocks, Small Cap & Penny Stocks, Growth Stocks,
Value Investing, Dividend Investing, IPOs, SPACs, Startups & Venture Capital,
Real Estate & REITs

**TRADING_I_INVERSIO:** Day Trading, Swing Trading, Position Trading, Long-term Investing,
Scalping, Algorithmic Trading, Quant Trading, High Frequency Trading

### Cerca de temes

- Els temes NO apareixen a la cerca general.
- Tenen un buscador popup propi accessible des de la barra lateral.
- Es pot filtrar per categoria (estil TradingView).
- Des del buscador es poden ancorar temes a la barra lateral.

---

## Especificació detallada: perfil d'usuari

### Perfil públic (`/profile/:username`)

Mostra: avatar, imatge de fons (`coverImage`), username, nombre de seguidors,
nombre de seguits, bio, comunitats públiques de les quals és membre,
i els posts públics de l'usuari.

**Posts públics** = PostX amb `origin: 'general'` o `origin: 'public_community'`.
MAI mostra: posts de comunitats privades, PostReddit.

### Pàgina de configuració privada (`/settings`)

Completament separada del perfil públic. Permet canviar: username, email, contrasenya.
Per canviar la contrasenya cal introduir la contrasenya actual.

---

## Especificació detallada: cerca general

Cobreix: usuaris, PostX públics (general + comunitats públiques), comunitats
públiques i privades (nom i descripció, mai contingut intern).

NO cobreix: PostReddit, temes de discussió (tenen el seu propi buscador).

Filtres disponibles per tipus: `users`, `posts`, `communities`.

---

## Especificació detallada: assistent IA

- Widget flotant a la part inferior de TOTES les pàgines.
- Requereix login. Si no autenticat → missatge amb enllaç a `/login`.
- A tota la web hi ha botons contextuals (al costat de notícies, actius, posts)
  que obren el widget amb una pregunta predeterminada ja enviada.
  Exemple: al costat d'una notícia → "Què representa aquesta notícia i quin
  impacte pot tenir sobre l'actiu?"
- Dins el widget hi ha un enllaç → `/ai` (pàgina de chat completa estil ChatGPT).
- La ruta `/ai` NO apareix a la navbar ni en cap altra part. Accessible NOMÉS
  des del widget.
- Usa OpenAI API. Clau SEMPRE al backend, mai exposada al frontend.

---

## Infraestructura de pujada de fitxers

- Llibreria: `multer`
- Carpetes: `/backend/uploads/images/` i `/backend/uploads/videos/`
- Fitxers servits a: `http://localhost:3000/uploads/images/nom.jpg`
- Mida màxima: 10MB imatges, 100MB vídeos
- Formats acceptats:
  - Imatges: jpeg, png, gif, webp
  - Vídeos: mp4, webm, quicktime
- La carpeta `/backend/uploads/` està al `.gitignore`.
  Cada subcarpeta té un `.gitkeep` per ser trackejada per Git.

---

## Estat actual del projecte

```
✅ Fase 1: Infraestructura
  ✅ Estructura de carpetes i Git
  ✅ Backend Express scaffold (MVC)
  ✅ Frontend Angular scaffold (standalone, routing, ApiService)
  ✅ Docker (docker-compose + Dockerfiles)

✅ Fase 2: Autenticació
  ✅ Model User complet
  ✅ Seed superadmin i moderador
  ✅ API auth (register, login, logout, refresh, me)
  ✅ API perfil (editar perfil, canviar contrasenya)
  ✅ JWT (access token memòria + refresh token httpOnly cookie)
  ✅ Límit 5 intents → bloqueig 15 minuts
  ✅ AuthService, AuthInterceptor, AuthGuard Angular
  ✅ Pàgines Login i Register
  ✅ Navbar aware d'autenticació

🔄 Fase 3: Community (backend complet, frontend pendent)
  ✅ Models: PostX, PostReddit, Comment, CommunityPublic,
     CommunityPrivate, DiscussionTopic, User actualitzat
  ✅ Seed temes de discussió
  ✅ Infraestructura multer (pujada fitxers)
  ✅ API feed general i PostX (posts, likes, comentaris, trending job)
  ✅ API comunitats públiques
  ✅ API comunitats privades (rols, successió, bonus trending, pins)
  ✅ API temes de discussió (PostReddit, upvotes/downvotes)
  ✅ API perfils d'usuari i seguidors
  ✅ API cerca general
  🔄 Frontend Community (en procés)

⬜ Fase 4: Markets
⬜ Fase 5: IA + Home
```
