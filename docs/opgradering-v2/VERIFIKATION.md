# Verifikation af v2-opgraderingen (2026-10-23)

Denne fil dokumenterer en fuld, uafhængig gennemkørsel af verifikationen beskrevet i
`RUNBOOK.md`. En tidligere agent-session havde allerede merget upstream v2.1.0-beta.0 og
skrevet RUNBOOK.md, men dens egen verifikation (en baggrunds-Newman-kørsel) gik tabt uden
rapport. Alt nedenfor er kørt og observeret på ny i denne session, på `agent-worker`
(ikke Mads' PC), i egne Docker-containere. **Ingen kald mod `filer.mahoje.dk`, Dokploy eller
Hetzner.**

## Oprydning af efterladenskaber fra forrige session

| Fund | Handling |
|---|---|
| Orphaned `nest start` (pid 2259825 + børn) fra backendens `npm run test:system`, startet i baggrunden af forrige agent | Stoppet (`kill -TERM` på process-gruppen). Verificeret væk, port 8080 fri. |
| Docker compose-projekt `v2`, container `v2-postgres-1` | **Ikke stoppet.** Undersøgt først: containerens compose-fil ligger i `~/dev/worktrees/uk-portal-v2-auth-sync/v2/docker-compose.dev.yml` og kører Postgres 18 for databasen `uk_portal_v2` — et helt andet projekt. Denne backends `prisma/.env` har som default `DATABASE_URL="file:../data/pingvin-share.db"` (SQLite), så pingvin-testen bruger ikke denne Postgres-container overhovedet. Opgavebeskrivelsens antagelse om at `v2-postgres-1` hørte til denne opgave var forkert — den er efterladenskab fra en anden, igangværende session, og blev efterladt urørt for ikke at forstyrre andres arbejde. Den forsvandt siden af sig selv (stoppet/fjernet af sin egen ejer-session) under denne opgave, uden indgreb herfra. |

## 1. Kvalitetsgates (forgrund, reelle exit-koder)

| Trin | Kommando | Exit | Resultat |
|---|---|---|---|
| Backend lint | `npm run lint` (backend/) | **1** | **FEJL**: 1 reel fejl — `'User' is defined but never used` i `src/adminNotice/adminNotice.service.ts:2` (unused-imports/no-unused-imports). Derudover 16 advarsler (`@typescript-eslint/no-explicit-any`, 1x unused arg). Ikke rettet her — opgaven er at verificere og dokumentere ærligt, ikke stiltiende rette upstream/merge-kode. |
| Backend tsc | `./node_modules/.bin/tsc --noEmit -p tsconfig.json` | 0 | OK, ingen typefejl. |
| Backend build | `npm run build` (nest build) | 0 | OK. |
| Backend unit-tests | — | — | **Findes ikke.** Ingen `*.spec.ts`/`*.test.ts`, ingen jest-config, intet `test`-script i `package.json`. Kun systemtesten (Newman) nedenfor findes som automatiseret backend-test. |
| Backend systemtest | `npm run test:system` (= `prisma migrate reset -f && nest start & wait-on … && npx newman run ./test/newman-system-tests.json`) | 0 | OK — 25/25 requests, 50/50 test-scripts, 34/34 assertions, 0 fejl, total 1552 ms. Scriptet efterlader selv `nest start` kørende i baggrunden (ingen cleanup i `package.json`-scriptet) — ryddet op manuelt efter kørslen (samme mønster som efterladenskabet fra forrige session). |
| Frontend lint | `npm run lint` (frontend/, = `next lint`) | 0 | OK, "No ESLint warnings or errors". (`next lint` er deprecated fra Next 16, upstream-varsel, ikke noget at rette her.) |
| Frontend tsc | `./node_modules/.bin/tsc --noEmit` | 0 | OK, ingen typefejl. |
| Frontend build | `npm run build` (next build) | 0 | OK. Advarsler (ikke fejl): `_app`-chunk 2.79 MB > PWA-precache-grænsen; 3x "Node.js API … not supported in Edge Runtime" fra `axios` via `config.service.ts`; opt-out af automatisk static optimization pga. `getInitialProps` i `_app`. Ingen af disse stopper bygget eller er introduceret af denne opgave. |

## 2. E2E-opgraderingssimulering

### MinIO var ikke tilgængelig — brugte `adobe/s3mock` i stedet

MinIO kunne ikke hentes under denne kørsel (2026-10-23):
- `docker pull minio/minio` / `minio/mc` (Docker Hub): "pull access denied … may require 'docker login'".
- `docker pull quay.io/minio/minio` (flere tags): "unauthorized: access to the requested resource is not authorized".
- `docker pull ghcr.io/minio/minio`: "denied".
- `https://dl.min.io/server/minio/release/linux-amd64/minio` og `.../client/mc/...`: HTTP `410 Gone`.
- MinIO's GitHub releases har ikke længere vedhæftede binaries (kun kildekode-tags, "go install" eller selv-build).

MinIO's open-source-images/binaries er altså ikke længere offentligt tilgængelige fra nogen
af de normale kanaler på dette tidspunkt. I stedet blev `adobe/s3mock` (en S3-API-kompatibel
Java-mock, ofte brugt til integrationstest) brugt som S3-server. Verificeret før resten af
testen byggede videre på den:
```
curl -i http://localhost:9090/mahope
  → 200, gyldigt ListBucketResult XML

curl -i -X OPTIONS http://localhost:9090/mahope/testkey \
  -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: PUT"
  → 200, Access-Control-Allow-Origin: http://localhost:3000 (reflekteret), Allow-Methods: PUT
```
s3mock svarer altid med permissive CORS-headers (reflekterer `Origin`) uden selv at
understøtte `PutBucketCors`/`GetBucketCors` som API-kald — det er en forenkling i mock'en, ikke
noget man kan sætte op på Hetzner/MinIO. Den reelle CORS-opsætning på `mahoje-filer`-bucketen
(nævnt i RUNBOOK's "Breaking change") skal stadig laves manuelt på Hetzner før cutover; det er
**ikke** verificeret af denne test. Resten af testen (presignerede URL'er, multipart-upload,
bucket-til-bucket-kopiering uden server-side `CopyObject`) er ægte S3-API-opførsel og dermed
repræsentativ.

Miljø: `--network host` for app-containerne og s3mock (ingen eksterne porte eksponeret ud over
localhost), så både backend-containeren og browseren (Playwright, kørende direkte på
værtsmaskinen, ikke i en container) kunne nå `http://localhost:9090` under samme navn — det er
den eneste måde presignerede URL'er virker konsistent for begge parter uden en DNS/hosts-hack.

### 2a. Gammelt image (`:filer-5`) på tom volume + mock-S3

| Handling | Kommando/metode | Resultat |
|---|---|---|
| Image hentet | `docker pull ghcr.io/mahope/pingvin-share-x:filer-5` | OK |
| Container startet | `docker run -d --network host -v pingvin-verify-data:/opt/app/backend/data ghcr.io/mahope/pingvin-share-x:filer-5` | OK, klar efter ~21 s (`/api/configs` svarer 200) |
| Admin oprettet | `POST /api/auth/signUp` (første bruger bliver automatisk admin) | OK, `isAdmin: true` |
| S3 konfigureret | `PATCH /api/configs/admin` med `s3.enabled/endpoint/region/bucketName/bucketPath/key/secret/useChecksum` | OK |
| Registrering + uautoriserede delinger slået fra | `PATCH /api/configs/admin` — **men ikke under `security.*`**: på dette image ligger de under `share.allowRegistration` / `share.allowUnauthenticatedShares` (`security.allowRegistration` gav `404 Config variable not found`). Det bekræfter RUNBOOK's beskrivelse af migrationen `general`/`share` → `security` — de nøgler findes kun under `security.*` **efter** v2-migrationen. | OK, sat til `false`/`false` |
| Deling med fil > 25 MB | 27.000.000 byte tilfældig fil, uploadet i 4 chunks (7 MB råbytes pr. chunk — se note nedenfor) via det samme legacy-endpoint som Newman-systemtesten bruger (`POST /api/shares/:id/files?name=&chunkIndex=&totalChunks=`, **rå bytes, ikke base64** — se note) | OK, downloadet igen og sha256 matcher originalen |
| Reverse share + anonym upload | `POST /api/reverseShares` (`publicAccess: true`, `shareExpiration: "7-days"`), derefter en anonym `POST /api/shares` + chunk-upload + complete med kun cookien `reverse_share_token` sat (ingen login) | OK, en lille tekstfil uploadet og delingen completed anonymt |
| Anonym opretter deling direkte | `POST /api/shares` uden cookie | 403, som forventet |
| Anonym signup | `POST /api/auth/signUp` | 403, som forventet |

**Note om chunk-upload-formatet:** `FileController.create` læser `req.body` via
`bodyParser.raw({ type: "application/octet-stream" })`, og `S3FileService.create` gør
`Buffer.from(data, "base64")`. Det ser ud som om data skal være base64, men når `data` allerede
er en Node `Buffer` (fordi `body-parser.raw` gav en Buffer, ikke en streng), ignorerer
`Buffer.from` encoding-argumentet og kopierer bytes direkte — det matcher præcis hvad frontend
reelt sender (`api.post(..., chunk, { headers: { "Content-Type": "application/octet-stream" } })`
med en rå `Blob`, **ikke** base64-kodet). Mit første forsøg sendte fejlagtigt base64-tekst og gav
et korrupt 500-fejlende upload (opdaget via en sha256-mismatch på download: ca. 4/3 af den
rigtige størrelse). Rettet i testscriptet, ikke i produktionskoden — dette er ikke en bug i
pingvin-share, kun en fælde for den der skriver et test-script mod dette endpoint manuelt.
Chunk-størrelsen (7 MB rå) er valgt fordi body-parserens default-grænse
(`share.chunkSize` = 10.000.000 byte) er på selve den modtagne body, ikke filens totale
størrelse.

### 2b. Nyt v2-image bygget og startet på samme volume

| Trin | Kommando | Resultat |
|---|---|---|
| Build | `docker build -t pingvin-v2-test .` (fra repo-roden, denne branch) | OK, exit 0 |
| Start på samme volume | `docker run -d --network host -v pingvin-verify-data:/opt/app/backend/data pingvin-v2-test` | OK, klar efter ~10 s |
| Migrationer | Logget af containeren: "41 migrations found in prisma/migrations", derefter 15 "Applying migration …" (de migrationer der ikke allerede var anvendt på dette v1-volume), "All migrations have been successfully applied." | OK, ingen fejl |
| Admin-login | `POST /api/auth/signIn` med samme brugernavn/kodeord som oprettet under 2a | OK, access-/refresh-token udstedt |
| Gammel 27 MB-deling downloades | `GET /api/shares/old-big-share/files/<fileId>` | Giver nu `302 Found` med `Location:` en presignet S3-URL (brud med v1, hvor samme endpoint streamede filen direkte) — fulgt med `curl -L`, sha256 matcher originalen byte-for-byte |
| Config bevaret | `GET /api/configs/admin/security` og `.../s3` | `security.allowRegistration=false`, `security.allowUnauthenticatedShares=false`, og alle `s3.*`-værdier uændrede under de nye nøglenavne |
| Anonym opretter deling | `POST /api/shares` uden cookie | 403 |
| Anonym signup | `POST /api/auth/signUp` | 403 |

### 2c. Playwright (Chromium headless) — anonym upload via reverse share på v2

**Fund før testen kunne gennemføres korrekt:** browserkontekst sat til `locale: "da-DK"`
(sætter også `Accept-Language`), men siden viste alligevel engelsk UI
("Upload files", "Home", "Sign in" …). Grunden: `pages/_app.tsx` beregner sproget som
`ctx.req.cookies["language"] || defaultLanguage || requestLanguage` — altså cookie, **så**
config-nøglen `general.defaultLanguage` (default `"en-US"`, en sand/truthy streng), og kun hvis
den er tom falder den tilbage til at læse `Accept-Language`-headeren. Browserens sprog bliver
dermed reelt ignoreret, så længe `general.defaultLanguage` er sat til noget. Efter
`PATCH /api/configs/admin` med `general.defaultLanguage=da-DK` viste siden korrekt dansk tekst.
Dette er tilføjet som et eksplicit tjekpunkt i RUNBOOK.md, da det ellers er usynligt indtil en
gæst med en bestemt browserindstilling rapporterer engelsk UI.

| Trin | Resultat |
|---|---|
| `/upload/<reverseShareToken>` viser dansk | OK — "Upload filer", "Klik her eller træk og slip …", "Upload mappe", "Bygget på Pingvin Share X". Ingen engelske strenge fundet i den synlige tekst. |
| Anonym upload af 28,3 MB-fil + 30 byte-fil via reverse share, rigtig browser (ikke curl) | OK — reel presignet multipart S3-upload direkte fra browseren gennem CORS mod mock-S3'en, ingen CORS-fejl |
| Delingsside (`/s/<id>`) viser dansk | OK — "Download alle", "Navn", "Størrelse", filnavne og størrelser, ingen engelske strenge |
| Download af begge filer via browserens download-knapper | OK — sha256 matcher de originale filer for begge |
| ZIP-download ("Download alle") | OK — zip indeholder begge filer, `unzip -l` + sha256 på begge udpakkede filer matcher originalerne |
| Forside (`/`) viser dansk | OK — "Store filer, sendt direkte", "Her sender jeg filer til mine kunder, og her kan du sende filer til mig. Op til 25 GB ad gangen.", "Hos mig, ikke hos en tredjepart" osv. Ingen engelske strenge fundet. |

Fuld synlig tekst fra alle tre sider er gengivet i commit-historikken for denne fil (se
scriptets output i sessionens log); ingen af dem indeholdt engelske UI-strenge udover
egennavne (`Mahoje`, `Pingvin Share X`).

### 2d. Bucket-flytning

| Trin | Metode | Resultat |
|---|---|---|
| Ny bucket oprettet | `PUT http://localhost:9090/mahoje-filer` | OK |
| Objekter kopieret | `GetObject` fra `mahope` + `PutObject` til `mahoje-filer` for hver nøgle (s3mock understøtter ikke server-side `CopyObject` for bucket-til-bucket — samme begrænsning RUNBOOK beskriver for Hetzner, så download+upload er den rigtige metode at teste, ikke en afvigelse) | OK, 4 objekter mirrored (den gamle 27 MB-fil, den gamle reverse-share-upload, og de to v2-testfiler) |
| `s3.bucketName` ændret | `PATCH /api/configs/admin` → `mahoje-filer` | OK |
| Gammel deling downloades stadig | `GET -L /api/shares/old-big-share/files/<fileId>` efter skiftet | OK, sha256 matcher stadig originalen |

## 3. Oprydning efter testen

Alle selvoprettede ressourcer fjernet: `verify-pingvin-old`/`verify-pingvin-new`/`verify-s3mock`
(stoppet + `docker rm`), volumet `pingvin-verify-data` (`docker volume rm`), det lokalt byggede
testimage `pingvin-v2-test` (`docker rmi`). Ingen eget docker-netværk blev oprettet (kørte med
`--network host`). De generiske pullede images (`ghcr.io/mahope/pingvin-share-x:filer-5`,
`adobe/s3mock`) blev **ikke** fjernet fra den lokale image-cache — de er genanvendelige og
harmløse at lade stå. Alle midlertidige filer under `/tmp` ryddet op.

## Rettelser til RUNBOOK.md som følge af denne verifikation

1. Migrationsantal præciseret: 41 migrationer findes i alt i historikken, men kun de 15
   nyeste var faktisk ventende/blev anvendt på et eksisterende v1-volume.
2. Tilføjet et tjekpunkt om at download nu er en `302`-redirect til en presignet URL (ikke kun
   upload, som den oprindelige "Breaking change"-note antydede).
3. Tilføjet et helt nyt, kritisk tjekpunkt: `general.defaultLanguage` skal være `da-DK`, da
   Accept-Language-baseret sprogvalg for gæster **ikke** sker, hvis denne config-nøgle har en
   værdi (hvilket den har som default: `en-US`).
4. "Hvad er testet lokalt" omskrevet til at pege på denne fil og nævne MinIO-substitutionen.

## Åbne punkter (uændret fra RUNBOOK, gælder stadig)

- Selve prod-cutoveren (stop/start af containeren på Dokploy, den faktiske sidste `rclone sync`,
  config-ændringen i prod-UI) er ikke udført her og kræver Mads' eksplicitte go.
- Den reelle CORS-opsætning på Hetzner-bucketen `mahoje-filer` er **ikke** verificeret af denne
  test (s3mock giver altid permissive CORS uanset bucket-config) — det skal stadig tjekkes
  manuelt i Hetzners S3-konsol/API før cutover, som RUNBOOK's "Breaking change"-afsnit allerede
  nævner.
- Backend-lint-fejlen (ubrugt `User`-import i `adminNotice.service.ts`) er dokumenteret, ikke
  rettet.
