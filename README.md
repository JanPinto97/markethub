# MarketHub

Portal web financer i xarxa social. Els usuaris comparteixen anàlisi de mercats,
segueixen el calendari econòmic i interactuen en comunitats.

### !!! Important !!!

El codi penjat al main està adaptat per funcionar en producció, per tant, l'execució en local no funcionarà.
Si es vol executar en local s'ha de fer clone de la branca `feat/retocs`.

```bash
git clone -b feat/retocs https://github.com/JanPinto97/markethub
```

## Stack

- **Frontend:** Angular 21 (standalone components, signals), TypeScript 5.9, CSS custom + variables CSS, Tailwind via CDN com a complement
- **Backend:** Node.js 20 + Express 5, MongoDB 7 + Mongoose 9, autenticació JWT (access en memòria, refresh en cookie httpOnly)
- **Infraestructura:** Docker + docker-compose
- **APIs externes (Markets):** Finnhub, Twelve Data, CoinGecko, widgets de TradingView

## Estructura del repositori

```
/frontend           → SPA Angular (port 4200)
/backend            → API Express (port 3000), MVC (models/controllers/routes/middleware)
/seeder             → seeders externs basats en Ollama (generació de contingut amb IA)
/docker-compose.yml → serveis mongo + backend + frontend
/package-lock.json  → lockfile de dependències a nivell d'arrel
/.env.example       → plantilla de variables d'entorn
/.gitignore         → fitxers i carpetes ignorats per git
/README.md          → aquest fitxer
```

## Posada en marxa

### Docker (recomanat)

L'stack defineix 3 serveis al `docker-compose.yml`: `mongo`, `backend` i `frontend`.
Les carpetes de codi es munten amb bind-mount per tenir live reload
(`./backend:/app`, `./frontend:/app`) i els `node_modules` es guarden en volums
anònims (`/app/node_modules`) perquè les versions del host no sobreescriguin les
del contenidor.

**Primer arrencada (o després de fer pull de codi nou):**

```bash
cp .env.example .env       # després edita els valors (JWT secrets, Google OAuth, etc.)
docker-compose up --build
```

Els serveis arrenquen a:

- Frontend → http://localhost:4200
- Backend → http://localhost:3000
- MongoDB → localhost:27017 (db: `markethub`)

**Arrencades posteriors (sense canvis a dependències ni Dockerfile):**

```bash
docker-compose up
```

**Aturar:**

```bash
docker-compose down                # para contenidors, manté volums (BD + node_modules persisteixen)
docker-compose down -v             # ⚠️ també esborra volums — perdràs les dades de MongoDB
```

**Després d'afegir o treure una dependència a `backend/package.json` o `frontend/package.json`:**

El volum anònim de `node_modules` no es refresca només amb `--build`. Has de
treure'l o instal·lar dins del contenidor en marxa:

```bash
# Opció A — recrear el volum de node_modules net (recomanat)
docker-compose down
docker volume ls | grep _node_modules            # busca el nom exacte del volum
docker volume rm <markethub_backend_node_modules>  # repeteix per frontend si cal
docker-compose up --build

# Opció B — instal·lar directament al contenidor en marxa (solució ràpida)
docker-compose exec backend npm install
docker-compose exec frontend npm install
docker-compose restart backend frontend
```

**Reconstruir un sol servei:**

```bash
docker-compose up --build backend
docker-compose up --build frontend
```

**Logs i shell:**

```bash
docker-compose logs -f backend
docker-compose exec backend sh
docker-compose exec mongo mongosh markethub
```

**Carregar dades de demo (revisor / primer setup):**

```bash
docker-compose exec backend npm run seed:demo
```

`seed:demo` restaura un dump congelat de MongoDB (`backend/seed/demo-data.archive.gz`)
**incloent usuaris, topics, comunitats, posts, comentaris i notificacions**, més
el tarball d'uploads (imatges pujades). Després d'executar-lo l'aplicació queda
totalment poblada i a punt per navegar — no cal executar `seed` ni `seed:topics`
per separat.

Comptes de demo (tots amb contrasenya `Test1234!`): `alice_trader`, `bob_crypto`,
`carol_quant`, `david_value`, `eve_scalper`, `frank_macro`, `grace_whale`,
`henry_analyst`. Els comptes de superadmin i moderator utilitzen les credencials
incrustades al dump.

Avançat (només per regenerar el dump des d'un entorn de desenvolupament amb
contingut ja carregat via `seed:dev`):

```bash
docker-compose exec backend npm run seed:generate-dump
```

**Reiniciar només la base de dades (mantenint node_modules):**

```bash
docker-compose down
docker volume rm <markethub_mongo_data>
docker-compose up
```

### Desenvolupament local (sense Docker)

```bash
cd backend && npm install && npm run dev   # nodemon, requereix Mongo a localhost:27017
cd frontend && npm install && ng serve     # port 4200
```

**Seeders:**

```bash
cd seeder && npm run bootstrap 5   # seeders, requereix Mongo a localhost:27017 i Ollama en marxa
cd seeder && npm run orchestrate   # seeders, requereix Mongo a localhost:27017 i Ollama en marxa
```

## Variables d'entorn

Copia `.env.example` a `.env` i omple els valors. El backend carrega `.env` des de
l'arrel del projecte via dotenv.

Variables obligatòries:

- `PORT`, `MONGO_URI`, `NODE_ENV`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SUPERADMIN_*`, `MODERATOR_*` (utilitzades pels seeders)

Opcionals (Google OAuth — sense això el botó `Continue with Google` retorna 503,
però el login amb email/contrasenya segueix funcionant):

- `FRONTEND_URL` (per defecte `http://localhost:4200`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` (ha de coincidir amb l'URI de redirecció registrat a la
  Google Cloud Console — típicament `http://localhost:3000/api/v1/auth/google/callback`)

Després d'editar `.env`, reinicia el contenidor del backend perquè agafi els nous valors:

```bash
docker-compose restart backend
```

## API

Totes les rutes estan prefixades amb `/api/v1`.

- **Resposta correcta:** `{ success: true, ... }`
- **Resposta d'error:** `{ success: false, message, code }`

## Rutes de pàgina

| Ruta                                   | Accés                          |
| -------------------------------------- | ------------------------------ |
| `/`                                    | Landing (pública)              |
| `/markets`                             | Panell de mercats              |
| `/community`                           | Feed de Community              |
| `/community/c/:id`                     | Detall comunitat pública       |
| `/community/p/:id`                     | Comunitat privada (auth)       |
| `/community/p/:id/details`             | Membres/sol·licituds (auth)    |
| `/community/t/:slug`                   | Topic de discussió             |
| `/community/t/:slug/p/:postId`         | Detall de PostReddit           |
| `/community/discussion/new/:commentId` | Obrir nova discussió (auth)    |
| `/community/discussion/:discussionId`  | Fil de discussió (auth)        |
| `/profile/:username`                   | Perfil públic d'usuari         |
| `/search`                              | Resultats de cerca complets    |
| `/settings`                            | Configuració privada (auth)    |
| `/login`, `/register`                  | Formularis d'autenticació      |

## Estat del projecte

**Projecte finalitzat ✅**

- **Fase 1: Infraestructura** — Completada
- **Fase 2: Autenticació** — Completada
- **Fase 3: Community** — Completada (feed, comunitats públiques/privades, topics, perfils, cerca, discussions, popup de discover, notificacions)
- **Fase 4: Markets** — Completada (Overview amb tickers en directe de 3 APIs, calendari econòmic, news, charts)
- **Fase 5: Assistent d'IA + Polit de la Home** — Completada (landing editorial, footer, assistent Warren)

## Convencions

- Angular: standalone components, signals per a l'estat sempre que sigui possible, rutes lazy-loaded
- Backend: async/await + propagació d'errors via `next(err)`, estructura MVC
- TypeScript en mode strict
- CSS custom + variables a `frontend/src/styles/variables.css` (Tailwind via CDN permès)
- Sense Bootstrap ni cap altre framework CSS

