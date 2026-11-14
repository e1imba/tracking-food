# Tracking Food — Next Steps

## Početno podešavanje

- [x] Kreiran je repozitorijum `e1imba/tracking-food`.
- [x] Starter kit je uklopljen u repo, a Next.js scaffold i healthcheck su spojeni kroz [PR #5](https://github.com/e1imba/tracking-food/pull/5).
- [x] Funkcionalna i tehnička dokumentacija su u [docs/](./).
- [ ] Potvrdi željenu vidljivost repozitorijuma. Trenutno je javan.
- [ ] U Codex Cloudu izaberi `e1imba/tracking-food` i proveri da sesija čita `AGENTS.md`, obe specifikacije i [vodič za inženjerske odluke](engineering-laws.md).
- [ ] U VS Code-u prijavi se u Codex, kloniraj repo ako već nemaš lokalnu kopiju i proveri lokalni pristup.
- [ ] Podesi lokalni Google OAuth klijent i proveri prijavu/odjavu prema [README](../README.md#google-oauth-on-localhost) i [ADR-001](decisions/001-google-auth.md).
- [ ] Pre čuvanja obroka dogovori razvojnu PostgreSQL bazu, Drizzle migracije i trajne korisnike. Pre unosa stvarnih podataka proveri rezervne kopije i oporavak.

## Rad na tiketima

Prati [tok od ideje do merge-a](workflow.md). Razradu, implementaciju i pregled pokreće vlasnik. GitHub tiketi i PR-ovi nose kontekst, a specifikacije opisuju dogovoreno ponašanje i tehničke odluke.

MCP integracije uvodi kad postoji konkretan zadatak koji ih traži. Kandidati za pregled su u [tehničkoj specifikaciji](technical-spec.md#124-mcp-integracije--kandidati-za-pregled).

## PostgreSQL i obroci (issue #11)

Koristiti samo sintetičke podatke dok hosting, backup i restore nisu dogovoreni.
Lokalno pokrenite PostgreSQL 17 (lozinku izaberite lokalno):

```bash
docker run --name tracking-food-dev -e POSTGRES_USER=tracking_food \
  -e POSTGRES_PASSWORD='<local-password>' -e POSTGRES_DB=tracking_food_dev \
  -p 127.0.0.1:5432:5432 -d postgres:17-alpine
export DATABASE_URL='postgresql://tracking_food:<local-password>@localhost:5432/tracking_food_dev'
npm run db:migrate
npm run dev
```

Za Next.js dodajte `DATABASE_URL` i u ignorisani `.env.local`, uz postojeće auth
varijable. Drizzle CLI čita shell environment; ne učitava automatski `.env.local`.
`npm run db:generate` pravi migraciju nakon izmene šeme;
pregledajte SQL i commit-ujte `drizzle/` uključujući metadata. `db:migrate` primenjuje
samo neprimenjene migracije. Build ne pristupa bazi niti primenjuje migracije.
Prva migracija samo dodaje tabele i ograničenja. Ne koristiti `push` ili destruktivni
reset na bazi sa podacima. Migracije za produkciju zahtevaju zaseban pregled i
odobrenje; ovaj postupak je samo za lokalni razvoj.

Za testove napravite **odvojenu praznu** bazu `tracking_food_test` (možete pokrenuti
drugi kontejner na portu 5433 sa `POSTGRES_DB=tracking_food_test`). Zatim:

```bash
export TEST_DATABASE_URL='postgresql://tracking_food:<local-password>@localhost:5433/tracking_food_test'
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
npm run test:integration
npm run build
npx playwright install chromium
npm run test:e2e
```

Integracioni testovi odbijaju implicitni fallback na aplikacionu bazu i naziv koji
ne završava na `_test`. Dodaju sintetičke naloge i privremeni trigger za simulaciju
greške upisa; uklanjaju svoje podatke/trigger po završetku. Playwright namerno
ostavlja sintetičke unose u disposable test bazi; ne čuvati prave podatke u njoj.
Testove ne pokretati istovremeno nad istom bazom. Playwright prosleđuje isključivo
`TEST_DATABASE_URL` svom serveru, uz sintetičke auth tajne.

Ručna provera: otvoriti `/meals` posle prijave, sačuvati samo naziv, zatim obrok sa
više namirnica, višerednom napomenom i ranijim lokalnim vremenom. Osvežiti, proveriti
redosled, namirnice i napomenu. Prijaviti drugi nalog i proveriti prazan privatni
dnevnik/katalog; odjaviti se i otvoriti `/meals` direktno. Nepostojeće vreme pri DST
prelazu se odbija; ponovljeni sat koristi prvi trenutak. Pravu Google OAuth proveru
uraditi prema README-u, bez unošenja stvarnih zdravstvenih podataka.
