# Self-hosting the accountless client

This Compose setup runs one service: the Readest web client. It does not deploy
or require an official Readest account, Supabase, PostgreSQL, Kong, GoTrue,
PostgREST, MinIO, JWT keys, storage quotas, or translation quotas.

Books, reading state, settings, and credentials stay in the user's browser or
device. Users who want cross-device file sync configure their own WebDAV,
Google Drive, OneDrive, S3-compatible, or iCloud provider inside the app; those
providers are not part of this Compose stack.

## Quick start

```bash
cp docker/.env.example docker/.env
cd docker
docker compose up -d
```

Open <http://localhost:3000>. The default image is the personal fork at
`ghcr.io/liangkw16/readest:latest`.

Only the following variables are supported by this deployment:

| Variable | Default | Purpose |
| --- | --- | --- |
| `READEST_IMAGE` | `ghcr.io/liangkw16/readest:latest` | Client container image |
| `READEST_PORT` | `3000` | Host port mapped to the client |
| `SITE_URL` | `http://localhost:3000` | Public origin used in metadata and generated links |
| `API_BASE_URL` | empty | Optional user-owned compatible API origin; empty keeps `/api` same-origin |
| `NODE_BASE_URL` | empty | Optional user-owned Node API origin; empty keeps `/api` same-origin |
| `FONT_BASE_URL` | empty | Optional directory containing self-hosted CJK webfont bundles |
| `WORDLENS_BASE_URL` | empty | Optional directory containing a WordLens `manifest.json` and packs |
| `GOOGLE_BOOKS_API_KEYS` | empty | Optional comma-separated API keys for Google Books metadata search |

There are deliberately no account, JWT, database, object-storage, entitlement,
or quota variables. Empty optional URLs disable their external downloads or use
the client's same-origin routes, depending on the feature.

## Upgrade

```bash
cd docker
docker compose pull
docker compose up -d
```

There is no server-side database to migrate. Recreating the container does not
remove browser-local books or settings.

## Build locally

Initialize the required submodules before building:

```bash
git submodule update --init packages/foliate-js packages/simplecc-wasm
cd docker
docker compose -f compose.yaml -f compose.build.yaml up --build -d
```

The production build overlay uses the same client-only runtime configuration as
the prebuilt image.

## Development with hot reload

After initializing the submodules, run:

```bash
cd docker
docker compose -f compose.yaml -f compose.dev.yaml up --build -d
```

`compose.dev.yaml` builds the Next.js development target and mounts the local
repository while keeping container-owned dependency and generated-asset
directories.

## HTTPS and a custom domain

Set the public origin in `docker/.env`:

```env
SITE_URL=https://your-domain.com
```

Then use `nginx.conf.example` as a starting point for TLS termination. Only the
client's port needs proxying; its built-in API routes remain on the same origin.

If you host optional fonts or WordLens packs under the same domain, configure
their public directories as well:

```env
FONT_BASE_URL=https://your-domain.com/fonts
WORDLENS_BASE_URL=https://your-domain.com/wordlens
```

Leaving these empty keeps the optional hosted bundles disabled. System fonts
and already-downloaded local WordLens files remain available.

## Standalone Docker build

From the repository root:

```bash
docker build \
  --target production-stage \
  --build-arg NEXT_PUBLIC_APP_PLATFORM=web \
  -t readest-client .

docker run --rm -p 3000:3000 \
  -e SITE_URL=http://localhost:3000 \
  readest-client
```

Add any optional service or asset variables from the table above with extra
`-e` flags.

## Stop

```bash
cd docker
docker compose down
```

This stack declares no Docker data volumes. The existing `docker/volumes/`
directory contains upstream Supabase schema and migration artifacts retained
only for repository history and possible reference; the accountless Compose
files do not mount or execute them.
