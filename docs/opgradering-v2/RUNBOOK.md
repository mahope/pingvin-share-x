# Opgradering af Mahoje Filer til Pingvin Share X v2

Cutover-runbook for `filer.mahoje.dk`. Dokploy-compose `pingvin` (composeId `NsnwHujRZvNfNNqtofWYD`),
data-volume mountet til `/opt/app/backend/data` i containeren (SQLite-databasen
`pingvin-share.db` ligger der). Nuværende image: `ghcr.io/mahope/pingvin-share-x:filer-5`.
Nyt image bygget fra denne gren (`agent/pingvin-v2`), som har merget upstream v2.1.0-beta.0
oven på forkens branding.

**Breaking change i v2:** S3-uploads/downloads går direkte browser ↔ S3 via presignede URL'er.
Browseren skal derfor kunne nå S3-bucketen direkte, og bucketen skal have CORS for
`https://filer.mahoje.dk`. Samtidig skifter vi til en ny bucket `mahoje-filer` (Hetzner, hel1),
som allerede har CORS sat op (origin `https://filer.mahoje.dk`, GET/PUT/HEAD, header
`Content-Type`, expose `ETag`).

Lokalt verificeret i denne opgave: merge af v2.1.0-beta.0, Docker-build, en fuld
opgraderingssimulering med MinIO (gammelt image → nyt image på samme volume) og en
browser-baseret (Playwright/Chromium) anonym upload via et upload-link, inkl. download,
ZIP-download og en bucket-flytning med `mc mirror`. Se "Hvad er testet" nederst.

## Før cutover

1. **Backup af SQLite-volumet.** DB-migrationerne i v2 er ikke bagudkompatible, så en frisk
   backup er den eneste vej tilbage.
   Tages **mens containeren er stoppet** (se rækkefølgen under Deploy), så SQLite-filen ikke
   skrives til undervejs. Volumet hedder `filer-pingvin-jkbio0_pingvin-data` på hoved-Dokploy'en
   (`hetzner-main`):
   ```bash
   mkdir -p /root/backups
   docker run --rm \
     -v filer-pingvin-jkbio0_pingvin-data:/data:ro \
     -v /root/backups:/backup \
     alpine tar czf /backup/pingvin-filer-data-$(date +%Y%m%d-%H%M).tar.gz -C /data .
   ```
   Verificér at arkivet er ikke-tomt og indeholder `pingvin-share.db`:
   ```bash
   tar tzf /root/backups/pingvin-filer-data-<dato>.tar.gz | grep pingvin-share.db
   ```

2. **Sidste `rclone sync` fra den gamle til den nye bucket.** Første kopi er allerede lavet
   23/10. Kør en afsluttende sync lige før cutover, så de sidste timers uploads også kommer med.
   Brug `--disable Copy`, fordi Hetzners S3-implementering giver `404 NoSuchKey` på
   server-side `CopyObject` (rclone falder så tilbage til download+upload, hvilket virker).
   ```bash
   # Dry-run først:
   rclone sync hetzner:mahope/filer hetzner:mahoje-filer/filer --disable Copy --dry-run -v

   # Når dry-run ser rigtig ud:
   rclone sync hetzner:mahope/filer hetzner:mahoje-filer/filer --disable Copy -v

   # Verificér med en reel download-sammenligning (ikke kun checksum-metadata):
   rclone check hetzner:mahope/filer hetzner:mahoje-filer/filer --download
   ```

   rclone-kommandoerne må KUN læse fra `mahope/filer` og skrive til `mahoje-filer/filer`. Kør
   aldrig `rclone backend …`, `cleanup`, `purge` eller `delete` mod `mahope`: bucket'en er delt og
   versioneret, og `backend cleanup-hidden` slettede 23/10-26 dens gamle versioner.

3. **Tjek for igangværende uploads.** Aktive upload-links (fx Adamos' reverse share) må ikke
   have en upload i gang, når containeren stoppes — en igangværende multipart-upload på det
   gamle image er ikke med i backup/sync. Giv besked til aktive uploadere, eller vent til der er
   stille.

4. **Opret et test-upload-link på det gamle image** (admin → Upload-links, 1 brug, 1 dag). Det
   bruges efter cutover til at bevise, at links oprettet på v1 virker på v2, og at CORS mod den
   rigtige Hetzner-bucket virker. Rør ikke kundernes egne links. Slet testlinket og dets deling
   bagefter.

## Deploy

1. **Image-tag.** Byg og push `ghcr.io/mahope/pingvin-share-x:filer-N` fra `main` (workflowet
   `.github/workflows/ghcr.yml` tagger automatisk `:filer` + `:filer-${{ github.run_number }}`
   ved push til `main`). Brug det konkrete `:filer-N`-tag i Dokploy, ikke det flydende `:filer`,
   så et evt. senere build på en anden gren (som nu kun tagger `:filer-v2-N`) ikke ved et uheld
   ændrer hvad prod kører.

2. **S3-config — kun disse felter ændres** (admin-UI `/admin/config/s3` eller
   `PATCH /api/configs/admin`), resten af S3-opsætningen er uændret, da det er samme
   Hetzner-konto:
   | Felt | Fra | Til |
   |---|---|---|
   | `s3.bucketName` | `mahope` | `mahoje-filer` |
   | `s3.bucketPath` | `filer` | `filer` (uændret) |
   | `s3.endpoint`, `s3.region`, `s3.key`, `s3.secret` | uændret | uændret |

   Dette er nøjagtig den ændring der blev testet lokalt (se "Hvad er testet"): en gammel deling
   oprettet før skiftet downloadede byte-identisk efter at kun `s3.bucketName` blev ændret.

3. **Rækkefølge:**
   1. Stop containeren (`pingvin`) i Dokploy (`compose.stop`). Fra nu kan ingen uploade, så
      hverken DB eller bucket ændrer sig.
   2. Backup af volumet (punkt 1 under "Før cutover") og sidste rclone-sync + `check --download`
      (punkt 2).
   3. Sæt nyt image-tag `:filer-N` i compose-filen, behold samme volume-mount til
      `/opt/app/backend/data`.
   4. Deploy/start containeren. Migrationerne kører automatisk ved opstart. `prisma/migrations`
      indeholder 41 migrationer i alt, men på et eksisterende v1-volume er langt de fleste
      allerede anvendt — verificeret lokalt var det kun de 15 nyeste (migrationer fra
      30/4-2026 og frem) der reelt kørte, herunder flytning af
      `allowRegistration`/`allowUnauthenticatedShares`/`secureCookies`/`sessionDuration`/
      `enableEmailVerification`/`allowAdminAccessAllShares` fra `general`/`share` til
      `security`-kategorien, og `enableShareEmailRecipients`/`enableShareDownloadNotifications`
      fra `email` til `share`. Config-værdierne overlever migrationen under de nye nøgler —
      det er verificeret lokalt, ikke kun antaget.
   5. Log ind som admin, ret `s3.bucketName` som i punkt 2.
   6. Tjek `/admin/config/security` at `Tillad oprettelser` og `Tillad uautoriserede delinger`
      stadig står som før (se "Efter"-tjeklisten — dette er specifikt det der tidligere er
      observeret flippe ved et image-skift).

## Efter (verifikationstjekliste)

- [ ] Admin-login virker.
- [ ] En ny upload via et eksisterende upload-link (Upload-link/reverse share) med en fil
      **over 25 MB** virker i en rigtig browser (ikke kun curl) — det er præcis den vej CORS
      kan fejle stille. Tjek browserens devtools-konsol for CORS-fejl hvis uploaden hænger ved
      0 % eller fejler på en `PUT` mod bucketen.
- [ ] Download af en **gammel** deling (oprettet før opgraderingen) virker og filen er intakt.
      I v2 svarer download-endpointet med `302` til en presignet S3-URL (ikke filen direkte) —
      normalt for browseren, men et script/curl-tjek skal følge redirects (`curl -L`), ellers
      ser det ud som en tom/fejlende download.
- [ ] ZIP-download af en deling med flere filer virker.
- [ ] Anonym forsøger at oprette en deling direkte (uden upload-link) → 403.
- [ ] Anonym forsøger at oprette en bruger (`/auth/signUp`) → 403, "Tillad oprettelser" er
      stadig slået fra.
- [ ] `Tillad uautoriserede delinger` (`security.allowUnauthenticatedShares`) står stadig på
      **fra**. Denne er tidligere observeret slået til af sig selv efter et image-skift —
      tjek den eksplicit, stol ikke på hukommelsen fra sidste deploy.
- [ ] Sprog: med `Accept-Language: da-DK` viser forsiden "Store filer, sendt direkte", med
      `Accept-Language: it-IT,it` viser den "Large files, sent directly" — også med en gammel
      cookie `language=da-DK`. Siden commit ff78fe8 vælger browserens sprog (kun dansk eller
      engelsk er brandet), og `general.defaultLanguage` bruges kun når browseren ikke sender noget
      sprog. Cookien for brugerens eget valg hedder nu `mahoje-language`.
- [ ] Upload via test-upload-linket fra "Før cutover" punkt 4 (oprettet på v1) med en fil over
      25 MB i en rigtig browser, download igen og sammenlign sha256. Slet testlinket bagefter.

## Rollback

Hvis noget fejler efter deploy:
1. Stop containeren.
2. Sæt image-tag tilbage til `ghcr.io/mahope/pingvin-share-x:filer-5`.
3. Gendan volumet fra backuppen taget i punkt 1 under "Før cutover" (DB-migrationerne i v2 er
   **ikke** bagudkompatible — et v2-migreret SQLite-schema kører ikke på v1-koden, så volumet
   skal gendannes, ikke bare rulles tilbage i git).
4. Sæt `s3.bucketName` tilbage til `mahope` (det gamle image kender ikke den nye bucket, og
   gendannes DB'en fra backup, peger config'en alligevel allerede på `mahope` igen).
5. Start containeren.

Den gamle bucket-prefix (`mahope/filer`) slettes **ikke** før 14 dage efter en vellykket
cutover, så der er en vej tilbage selv hvis rollback sker flere dage senere.

## Beta-status og vej til v2.1.0 stabil

Vi kører `v2.1.0-beta.0`, ikke en stabil release — upstream har endnu ikke tagget 2.1.0 final.
Når den kommer: `git fetch upstream --tags`, `git merge v2.1.0` (samme fremgangsmåde som denne
opgave, formentlig færre/ingen konflikter da betaen allerede er merget ind), nyt build, samme
teststeps som i denne runbook før deploy.

Beta-ændringer der er relevante for os (ud over branding-konflikterne løst i mergen):
- **`fix: reverse share access`** — strammer adgangen til anonyme delinger oprettet via et
  upload-link: før kunne *enhver* (ikke kun den der har `reverse_share_token`-cookien)
  fortsætte/afslutte en chunk-upload på en anonym deling, hvis de kendte/gættede share-ID'et.
  Nu kræves cookien stadig at matche. Relevant sikkerhedsforbedring for vores Upload-link-funktion.
- **`fix: never ignore custom password policy`** — en tidligere bug kunne ignorere en tilpasset
  adgangskodepolitik under visse betingelser. Vi bruger ikke en tilpasset politik i dag
  (standard: min. 8 tegn), men relevant hvis vi slår det til.
- **`fix(shares): wrap maxViews handling in prisma transaction`** — race condition-fix ved
  samtidige visninger af en deling med `maxViews` sat.
- **`fix(footer): make 'powered by' text translatable`** (#245) — håndteret i mergen, vores
  "Bygget på Pingvin Share X" bevaret og nu drevet af `footer.poweredBy`-nøglen.

## Hvad v2 giver os ud over opgraderingen (forslag, ikke slået til)

Ikke aktiveret nu, men nævnes fordi de kan være relevante for Mahoje Filer senere:
- **Per-bruger kvoter/rettigheder** (`admin.users.edit.tabs.permissions`): grænse for
  lagerplads, maks. antal aktive delinger/upload-links og maks. delingsstørrelse pr. bruger.
  Kunne bruges til fx brugeren "frederik" hvis der er behov for at begrænse en specifik kundes
  forbrug uden at ændre den globale grænse.
- **Tilpasset adgangskodepolitik** (`admin.config.security.custom-password-policy`): krav om
  store/små bogstaver, tal, specialtegn — i dag kun minimumslængde 8 tegn.
- **"Vis godkendelsesknapper"-toggle** (`admin.config.general.show-auth-buttons`): mulighed for
  at skjule login/opret bruger-knapperne på delings- og upload-sider, hvis Mahoje Filer skal
  fremstå rent som et upload-værktøj for eksterne uden synlig konto-mulighed.

## Hvad er testet lokalt (denne opgave)

Se `docs/opgradering-v2/VERIFIKATION.md` for den fulde, trin-for-trin dokumenterede kørsel
(kommandoer, forventet/faktisk, OK/FEJL) — det er den autoritative kilde. Kort resumé:

Ingen kald mod `filer.mahoje.dk`, Dokploy eller Hetzner. MinIO kunne ikke bruges (se
VERIFIKATION.md for hvorfor) — testen kørte i stedet mod `adobe/s3mock`, en S3-API-kompatibel
mock med samme presignerede-URL- og CORS-opførsel:
1. Gammelt prod-image (`:filer-5`) startet mod en tom data-volume + mock-S3. Admin oprettet,
   S3 sat op, registrering og uautoriserede delinger slået fra, en deling med en fil på 27 MB
   uploadet i 4 chunks, og et upload-link med en anonym upload.
2. Samme volume genstartet med det nye v2-image. De ventende migrationer kørte uden fejl
   (se note ved punkt 3.4 ovenfor om antal). Admin-login virkede. Den gamle 27 MB-fil
   downloadede byte-identisk (sha256-match, via det nye 302-til-presignet-URL-flow). S3- og
   security-config var bevaret under de nye nøglenavne. Anonym fik fortsat 403 på både
   oprettelse af deling og signup.
3. Browser-test (Playwright/Chromium headless, dansk sprog) mod v2-imaget: anonym upload via
   upload-linket af en fil på 28,3 MB og en lille tekstfil (reel presignet S3-upload gennem
   CORS, ikke en server-relayed upload), download af begge filer (sha256-match), ZIP-download
   af begge filer verificeret med `unzip -l` + sha256. Forside, tom upload-side og delingsside
   var fuldt dansk med Mahoje-branding — men kun efter `general.defaultLanguage` blev sat til
   `da-DK` (se tjekpunktet ovenfor). Screenshots fra en tidligere kørsel ligger stadig i
   `docs/opgradering-v2/screenshots/`.
4. Bucket-flytning: en ny bucket oprettet, objekter kopieret (download+upload, ikke
   server-side copy — samme begrænsning som Hetzner), kun `s3.bucketName` ændret i config.
   Den gamle 27 MB-delings download virkede stadig (ny presignet URL pegede på den nye bucket,
   byte-identisk fil).

## Åbne punkter

- Prod-cutoveren selv (stop/start af containeren, den faktiske sidste `rclone sync`, og
  config-ændringen i prod-UI) er **ikke** udført af denne agent og kræver Mads' go — ingen
  adgang til Dokploy/Hetzner/filer.mahoje.dk herfra, og kundeprod ændres aldrig uden eksplicit
  godkendelse.
- Den eksakte `docker run`/volume-navngivning i backup-kommandoen ovenfor er skrevet ud fra
  compose-strukturen i `docker-compose.yml` (`/opt/app/backend/data`) — tjek det faktiske
  volume-navn i Dokploy (`docker volume ls` på serveren) før kommandoen køres, da Dokploy ofte
  navngiver volumes med et projekt-præfiks.
