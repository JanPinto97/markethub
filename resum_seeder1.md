# Resum execució seeder — log `orchestrator_20260515_134843.log`

## Marc temporal

- **Inici**: 2026-05-15 11:48:43 UTC
- **Aturada**: 2026-05-15 16:46:16 UTC (SIGINT manual)
- **Durada total**: ~4h 58min
- **Mode**: `noRest=true`, `cycleSize=50`, base `http://localhost:3000/api/v1`
- **Línies de log**: 25.474

## Volum global

- **Cicles completats**: 255
- **Agents actius**: 50 (tots actuant a cada cicle)
- **Decisions totals**: 12.231
- **Errors / warnings**: només **2** (ambdós `HTTP 409` per nom de comunitat ja existent en `create_community` — recuperables, el següent intent va passar)

## Distribució de decisions (heurística)

| Acció | Decisions | % |
|---|---|---|
| like | 5.603 | 45,8% |
| comment | 1.902 | 15,6% |
| post | 1.877 | 15,3% |
| community_engage | 599 | 4,9% |
| follow | 572 | 4,7% |
| topic_vote | 494 | 4,0% |
| join_community | 407 | 3,3% |
| community_post | 379 | 3,1% |
| topic_comment | 292 | 2,4% |
| start_discussion | 192 | 1,6% |
| reply_discussion | 143 | 1,2% |
| create_community | 123 | 1,0% |
| topic_post | 117 | 1,0% |
| handle_requests | 32 | 0,3% |

## Accions efectivament executades

| Acció | Èxits |
|---|---|
| posted (PostX) | 1.877 |
| liked | 1.500 |
| commented | 1.409 |
| community_engage (like o comment dins comunitat) | 580 |
| community_post | 379 |
| topic_vote | 372 |
| joined (públiques) | 348 |
| **auto-follow (nou 10% post-like/comment)** | **259** |
| topic_comment | 251 |
| start_discussion | 192 (58 amb objectiu, 134 sense candidat elegible) |
| reply_discussion | 143 (58 enviats, 287 cicles sense res pendent agregats) |
| topic_post | 117 |
| created (comunitats) | 85 (58 públiques + 27 privades) |
| handle_requests | 32 |
| requested (privades) | 30 |

## Comportament destacat

- **Heurística sana**: la distribució segueix les bandes esperades — `like` domina, `comment`/`post` al voltant del 15% cadascun, i les accions especials (topics, discussions, comunitats) ocupen percentatges baixos però consistents.
- **Auto-follow funciona**: 259 follows generats pel nou 10% després de like/comment. Top seguits: `thetadrift23` (14), `shadowledger_2`, `phase3pokerface27`, `lostcause`, `chronosync`, `blackspur` (13 cadascun). Cap auto-follow duplicat (filtre `followedUsernames` actiu).
- **Votació a topics**: 244 upvotes vs 128 downvotes (~66% positius, coherent amb el biaix `contrarianness * 0.4`).
- **Comunitats**: 85 creades en total (58 públiques, 27 privades). Cap conflicte greu — només 2 col·lisions de nom (409), resoltes amb el reintent automàtic.
- **Discussions privades (chat des de comentari)**: 58 obertes i 58 respostes. La resta de torns de `reply_discussion` (287) van sortir "nothing pending" perquè cap missatge nou esperava resposta. `start_discussion` no troba candidat ~70% dels intents (poques branques noves on l'agent pot encara obrir-ne una).
- **Pin posts**: 0 (cap leader privat va decidir fer pin durant l'execució; l'acció pin existeix però es dispara molt rarament).
- **Topics més vibrants**: Small Cap & Penny Stocks (86 vots), Position Trading (74), Interest Rates (40), Large Cap Stocks (33), Central Banks (30).

## Throughput

- **Decisions/segon mitjana**: ~0,68 (12.231 / 17.853s)
- **Cicle mitjà**: ~70s (255 cicles en ~4h58)
- Amb `noRest=true` no hi ha pauses entre agents ni cicles → el coll d'ampolla és Ollama + la velocitat de les peticions HTTP.

## Conclusió

Execució neta i estable de gairebé 5 hores. Cap regressió: només 2 errors recuperables (409 nom duplicat). El nou auto-follow s'està disparant amb la freqüència esperada (~10% de likes+comments combinats ≈ 290 esperats, 259 reals — la diferència són casos on l'autor ja és seguit o és l'agent mateix). El sistema d'estat persistit funciona — els 50 agents han actuat ininterrompudament als 255 cicles.
