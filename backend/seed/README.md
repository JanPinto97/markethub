# Demo data dump

This folder holds frozen MongoDB + uploads dumps that the reviewer restores with
`npm run seed:demo` to see the application populated with demo content (communities,
posts, comments, images) without needing Ollama or running `seed:dev`.

## Files

- `demo-data.archive.gz` — `mongodump --archive --gzip` of the `markethub` database
  (excludes `users` and `discussiontopics` so the admin seed + topic seed remain
  authoritative).
- `uploads.tar.gz` — tarball of `backend/uploads/` (post and community images).

## Regenerate the dump (Jan only)

From a dev environment with demo content already loaded (`seed:dev` requires Ollama):

```bash
docker exec -it markethub-backend-1 npm run seed:generate-dump
```

Commit the resulting `.gz` files.

## Restore the dump (reviewer)

```bash
docker exec -it markethub-backend-1 npm run seed
docker exec -it markethub-backend-1 npm run seed:demo
```
