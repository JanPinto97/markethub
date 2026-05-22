La meva recomanació per a un projecte de DAW que avalua un professor: opció híbrida.

  1. Manté el seeder actual (npm run seed) per a usuaris d'sistema (superadmin, moderator) i els topics fixos — això ja existeix.
  2. Afegeix un dump del contingut "demo" (comunitats d'exemple, posts, comentaris) com a fitxer al repo, p. ex. backend/seed/demo-data.archive.gz.  
  3. Crea un script npm run seed:demo que faci mongorestore d'aquest fitxer dins el contenidor.
  4. Al docker-compose.yml pots afegir un servei one-shot (o un command al backend al primer arrencada) que executi seed + seed:demo si la BD està   
  buida.
  5. Si tens imatges/vídeos pujats que apareixen als posts demo, comprimeix-les a backend/seed/uploads.tar.gz i descomprimeix-les a /app/uploads al  
  mateix script.

  Al README:
  docker-compose up --build
  docker exec -it markethub-backend-1 npm run seed       # admins + topics
  docker exec -it markethub-backend-1 npm run seed:demo  # contingut d'exemple

  Així el professor té un comandament per veure el projecte ple, i tu controles què veu. És el que faria.