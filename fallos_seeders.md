# Anàlisi de fallades dels seeders

Anàlisi del log `./seeder/logs/orchestrator_20260514_163801.log` (443 decisions, 5 agents, 5 posts únics al feed).

---

## Problemes detectats

### 1. Tots els `reply` fallen amb HTTP 404 ⚠️

El client crida `POST /posts/:postId/comments/:commentId/reply` (`api-client.ts:299`), però aquesta ruta **no existeix al backend** — només existeix per topics (`/topics/...`). El `CLAUDE.md` del backend la llista però el `routes/posts.js` no la registra. La forma correcta és `POST /posts/:postId/comments` amb `parentCommentId` al body (vegis `postXController.js:174-178`).

→ Totes les 26 decisions `reply` van resultar en error 404. `repliedCommentIds` no s'omple → el següent intent torna a fallar amb el mateix comment.

### 2. Like toggle pot fer "un-like" ⚠️

Backend (`postXController.js:103-106`): `like` és un **toggle**. Si l'agent perd o desincronitza el seu estat `likedPostIds` (per exemple en una segona execució amb backend ja sembrat), tornarà a cridar `likePost(id)` i el backend treurà el like (`res.liked=false`). Al codi:

```ts
if (res.liked) this.state.likedPostIds.push(picked.id);
```

Si `res.liked === false`, l'estat **no s'actualitza**, així que la propera vegada el mateix post torna a ser candidat → oscil·la like/unlike.

**Recomanació:** o bé desar sempre l'ID quan la crida retorna `false` també (no és cert que "no l'havíem fet"), o bé sincronitzar `likedPostIds` consultant el feed amb un usuari autenticat i mirant `liked: true` al post abans d'incloure'l com a candidat.

### 3. El LLM està sobre-biaixat cap a `like`

El prompt explícitament diu *"LIKES are the most common action by far. Most engagement turns should be a 'like'"* (`agent.ts:134`). Resultat: el LLM ignora l'heurística i tria `like` el 88% del temps, fins i tot quan ja no queden posts per likear → 367 de 390 decisions `like` retornen silenciosament sense fer res (només 5 posts únics existeixen al feed).

### 4. Cap activitat de communities, topics ni discussions

0 decisions per `community_post`, `community_engage`, `join_community`, `create_community`, `handle_requests`, `topic_post`, `start_discussion`, `reply_discussion`. Causa: el LLM rarament les escull i tampoc no es força a partir de l'heurística.

### 5. Cap `follow` durant tota la sessió

Mateixa causa: el LLM gairebé sempre tira pel `like`.

### 6. Mostra petita

Només 5 agents actuant. Pocs posts al feed (5 únics) → cicles que no aporten res perquè la cua de candidates s'esgota.

---

## Probabilitats: esperades vs reals

Mitjana de perfils: `silenceRate ≈ 0.20`, `socialRate ≈ 0.55`, `postRate ≈ 0.45`. Calculat aplicant `rollAction()` (`agent.ts:85-118`):

| Acció | Esperat (heurística) | Real (443 turns) | Desviació |
|---|---|---|---|
| like | ~34% | **88.0%** (390) | **+54 pts** (sobre-representat 2.6×) |
| post | ~13.6% | **0.5%** (2) | **–13 pts** (gairebé inexistent) |
| comment | ~7.8% | 4.3% (19) | –3.5 pts |
| reply | ~4.1% | 5.9% (26) ❌ 100% fallen | engany |
| nothing | ~20% | 0.5% (2) | –19.5 pts |
| follow | ~2.4% | **0%** | absent |
| topic_vote | ~2.4% | 0.5% (2) | –2 pts |
| topic_comment | ~2% | 0.5% (2) | –1.5 pts |
| topic_post | ~0.8% | 0% | absent |
| community_engage | ~4% (si pertany) | 0% | absent |
| community_post | ~2.4% (si pertany) | 0% | absent |
| join_community | ~2.4% | 0% | absent |
| create_community | ~0.8% | 0% | absent |
| handle_requests | ~0.8% (si lead/mod) | 0% | absent |
| start_discussion | ~0.8% (si té comments) | 0% | absent |
| reply_discussion | ~1.6% (si té discussions) | 0% | absent |

Eficiència real: només **23 likes reals** sobre 390 decisions `like` (5.9%) — la resta retornen sense fer res perquè no queden posts candidates.

---

## Recomanacions per ordre d'impacte

1. **Arreglar `replyToComment`** al client: cridar `POST /posts/:postId/comments` amb `{ text, parentCommentId: commentId }` enlloc del path `/reply`.
2. **Treure el biaix `like`-fortíssim del prompt** (línia 134). Deixar només "lean toward the heuristic suggestion". El LLM ja té el `heuristic` al prompt.
3. **Fer servir directament l'heurística** en lloc del LLM per triar acció (o usar el LLM només com a desempat). El LLM perd molt el sentit estadístic.
4. **Actualitzar l'estat també quan `res.liked === false`** (perquè significa que el backend ja el considerava liked) per evitar l'oscil·lació like/unlike.
5. **Crear més posts inicialment** abans d'executar la simulació, o pujar `postRate` efectiu, perquè ara no hi ha contingut nou per likear.
6. **Investigar `nothing` quasi inexistent** (0.5% vs 20% esperat): el LLM mai escull "nothing" — probablement perquè el prompt no inclou explícitament aquesta opció com a recomanable.
