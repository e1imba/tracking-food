# Tracking Food — Tehnička dokumentacija

**Verzija 0.4 · 12.11.2026. (Europe/Belgrade)**

Predlog arhitekture i plan razvoja za MVP. Funkcionalni zahtevi su u dokumentu „Funkcionalna dokumentacija“ (u repozitorijumu `docs/functional-spec.md`).

## 1. Cilj i granice
Mobile-first responzivna web aplikacija za evidenciju obroka, namirnica i simptoma. U početku jedan korisnik. Brz unos, pregled i retroaktivne izmene su prioritet. Bez mikroservisa, posebnog REST API-ja, AI analize, kalorija ili nativne mobilne aplikacije u MVP-u.

## 2. Tehnološke odluke
| Sloj | Tehnologija | Odluka |
|---|---|---|
| Web/full-stack | Next.js App Router, React, TypeScript (strict) | Jedna aplikacija |
| UI | Tailwind CSS, shadcn/ui | Responzivan mobile-first |
| Forms | React Hook Form + Zod | Validacija na klijentu i serveru |
| Backend | Next.js Server Actions + servisni sloj | Bez zasebnog API servera |
| Baza | PostgreSQL | Relacioni model |
| ORM | Drizzle ORM + migracije | Tipizirani upiti |
| Testovi | Vitest + Playwright | Unit/integration i E2E |
| Deployment | Naknadna odluka | Ne vezivati arhitekturu za provajdera |

Verzije paketa se biraju i zaključavaju pri inicijalizaciji projekta.

## 3. Arhitektura i odgovornosti
- **Server Components**: stranice, čitanje podataka, inicijalno renderovanje i prikaz istorije.
- **Client Components**: formulari, autocomplete, date/time picker, dijalozi i interakcije.
- **Server Actions**: tanki transportni sloj za mutacije; obavezna provera sesije, validacija ulaza, poziv servisa, revalidacija relevantnih prikaza.
- **Services**: pravila unosa, izmene i završavanja simptoma, očuvanje istorije obroka, kontrola vlasništva.
- **Repositories/DB**: Drizzle upiti, transakcije i mapiranje modela.
- **Server-only moduli**: DB pristup, autentifikacija i privatni podaci nikada se ne uvoze u client bundle.

Primer strukture:
```text
src/
  app/(protected)/dashboard/page.tsx
  app/(protected)/meals/page.tsx
  app/(protected)/symptoms/page.tsx
  app/actions/{meals,symptoms}.ts
  features/meals/{components,schemas,services,repositories}/
  features/symptoms/{components,schemas,services,repositories}/
  features/foods/{components,schemas,services,repositories}/
  lib/{auth,db}/
drizzle/
tests/
```
Struktura je orijentaciona; izbegavati generičke apstrakcije bez potrebe.

## 4. Predlog modela podataka
Glavni entiteti koriste UUID identifikatore. Vremenska polja su navedena po tabelama.

**users**: `id`, `email` (unique), `created_at`. Implementacija autentifikacije određuje dodatna polja ili tabele.

**foods**: `id`, `user_id` (FK), `name`, `normalized_name` (za pretragu), `created_at`, `updated_at`. Unikatnost po korisniku i normalizovanom nazivu; čuvati originalni prikazni naziv.

**meals**: `id`, `user_id` (FK), `name`, `occurred_at` (timestamptz), `created_at`, `updated_at`.

**meal_foods**: `meal_id` (FK), `food_id` (FK), `food_name_snapshot`, kompozitni PK (`meal_id`, `food_id`). Snapshot štiti istorijski naziv od kasnijih promena kataloga; izmena jednog obroka ne menja druge.

**symptoms**: `id`, `user_id` (FK), `name`, `started_at` (timestamptz), `ended_at` (nullable timestamptz), `severity` (nullable integer 1–10), `note` (nullable text), `created_at`, `updated_at`. CHECK `ended_at IS NULL OR ended_at >= started_at`.

Indeksi: `meals(user_id, occurred_at DESC)`, `symptoms(user_id, started_at DESC)`, `foods(user_id, normalized_name)`. Vlasništvo se proverava i za povezane namirnice. Brisanje obroka briše samo njegove veze, ne katalog namirnica. Brisanje namirnica iz kataloga mora čuvati integritet istorije; za MVP ne nuditi globalno brisanje korišćene namirnice.

## 5. Funkcionalni tokovi
**Dodaj obrok**: validacija naziva/vremena i liste namirnica → identifikacija ili kreiranje namirnica → kreiranje obroka i veza u jednoj transakciji → osvežavanje istorije. Autocomplete naziva obroka predlaže prethodne unose; izbor popunjava prethodni skup namirnica koji korisnik može izmeniti. Ako isto ime ima više skupova, pravilo izbora ostaje otvoreno.

**Izmeni obrok**: proveri vlasništvo → ažuriraj obrok i njegove veze transakciono; drugi obroci ostaju nepromenjeni.

**Simptomi**: kreiranje bez završetka, više aktivnih istovremeno; završavanje postavlja `ended_at` (podrazumevano sada, uz izmenu); omogućiti retroaktivne izmene.

**Dashboard**: agregirana hronološka lista obroka i početaka/završetaka simptoma za izabrani period; bez zaključivanja da je obrok izazvao simptom.

## 6. Autentifikacija, privatnost i bezbednost
- Privatna aplikacija: pristup samo autentifikovanom korisniku; nema javne registracije u MVP-u. Odabrati provereno auth rešenje kompatibilno sa Next.js i hostingom (npr. Auth.js ili managed provider) pre implementacije.
- Autorizacija na svakoj serverskoj operaciji, uključujući čitanje; nikad ne verovati `user_id` sa klijenta.
- Validacija svih Server Actions ulaza preko Zod; zaštita od prevelikih payload-a i ograničavanje zahteva prema potrebi.
- TLS, tajne isključivo u server environment varijablama, minimalne DB privilegije.
- Bez zdravstvenih podataka u analitičkim događajima, URL parametrima i aplikacionim logovima.
- Backup i provera vraćanja podataka pre stvarne upotrebe; definisati retenciju i izvozni format. Izvoz i brisanje sopstvenih podataka planirati kao osnovne kontrole privatnosti.
- Ako aplikacija postane javna, ponovo proceniti obaveze privatnosti, regulatorni okvir i multi-tenant izolaciju.

## 7. Datum, vreme i korisnički interfejs
Trenutke čuvati kao `timestamptz`. Na unosu i prikazu eksplicitno konvertovati između trenutka i lokalnog vremena korisnika, uz podršku za letnje i zimsko računanje. Na telefonu donja navigacija Dashboard/Obroci/Simptomi i plutajuće dugme za unos; na desktopu bočna navigacija. Formulari moraju raditi na uskom ekranu i biti dostupni tastaturom.

## 8. Testiranje i kvalitet
- Unit: validacija, normalizacija naziva, završetak simptoma, vremenske granice.
- Integration (test DB): transakcije, FK, izolacija po korisniku, očuvanje istorije, retroaktivne izmene.
- E2E: prijava, unos/izmena/brisanje obroka, autocomplete, aktivan/završen simptom, pregled hronologije.
- CI: lint, typecheck, test, build; migracije se primenjuju kontrolisano i odvojeno od build-a.

## 9. Deploy i operativnost
Hosting je zamenljiv (Vercel ili drugi Next.js kompatibilan hosting). PostgreSQL može biti managed servis. Konfigurisati odvojena dev i production okruženja, konekcioni pooling ako hosting koristi serverless runtime, kontrolisane migracije, nadzor grešaka bez osetljivih payload-a i budžetska upozorenja. Besplatan hosting nije arhitektonski zahtev.

## 10. Van obima i moguća evolucija
- PDF izveštaji, analitika, pravila ishrane i AI su kasnije faze.
- Mobilna aplikacija (React Native/Expo) **nije planirana za MVP** i možda nikada neće biti napravljena. Ne uvoditi REST API samo zbog hipotetičkog mobilnog klijenta. Ako se pojavi potreba, postojeće servise izložiti kroz API ili preispitati arhitekturu; prepisivanje je prihvatljivo.
- Bez CQRS, event bus-a, mikroservisa i zasebnog NestJS/.NET backend-a u prvoj verziji.

## 11. Otvorene odluke pre implementacije
1. Konkretan auth provider i način pristupa samo jednom korisniku.
2. Autocomplete za isti naziv obroka sa različitim skupovima namirnica.
3. Potvrda brisanja ili undo; politika brisanja korišćenih namirnica.
4. Backup interval, retencija, restore procedura i izvoz podataka.
5. Izbor hostinga, deployment pipeline i konkretne verzije paketa.

## 12. Razvoj uz Codex i GitHub

### 12.1 Cilj i granice
Codex je glavni razvojni agent, a GitHub izvor istine za kod, zadatke, dokumentaciju i pull requestove. Korisnik može da zadaje zadatke kroz Codex Cloud sa telefona ili da radi lokalno kroz VS Code/Codex. Cloud zadaci rade u izdvojenom okruženju; promene se pregledaju kroz PR. **Nema automatskog merge-a, produkcionog deploy-a ili pristupa produkcionoj bazi.** Ova automatizacija je planirani workflow, ne tvrdnja da je već konfigurisana.

### 12.2 Šta rade MD fajlovi iz starter kita
| Putanja | Svrha |
|---|---|
| `AGENTS.md` | Stalna projektna pravila: izvori zahteva, arhitektura, bezbednost, kvalitet i granice autonomije |
| `.agents/skills/refine-ticket/SKILL.md` | Razrada ideje u kratak dogovoren tiket |
| `.agents/skills/implement-feature/SKILL.md` | Postupak za razvoj jedne funkcionalnosti od zahteva do testova |
| `.agents/skills/database-change/SKILL.md` | Postupak za promene Drizzle šeme i bezbedne migracije |
| `.agents/skills/write-tests/SKILL.md` | Unit, integracioni i Playwright E2E scenariji |
| `.agents/skills/review-code/SKILL.md` | Provera ispravnosti, autorizacije, privatnosti i održavanja |
| `.github/pull_request_template.md` | Kontrolna lista za pregled izmena |
| `docs/decisions/000-template.md` | Šablon za arhitektonske odluke (ADR) |
| `mcp/README.md` | Kandidati za MCP integracije i bezbednosna ograničenja |

`SKILL.md` su instrukcije za agenta, ne samostalni procesi ili nezavisni AI agenti. `.github/workflows/ci.yml` je GitHub Actions konfiguracija, ne Markdown dokument.

### 12.3 Dogovoreni tok sa odvojenim sesijama

Detaljan postupak i poruke za kopiranje su u [docs/workflow.md](workflow.md).
Razrada ide kroz chat i `refine-ticket` skill; agent priprema i dopunjava GitHub
Issue prema obe specifikacije i Laws heuristikama iz AGENTS.md. Tiket ima 3–5
kratkih, proverljivih acceptance criteria i potvrdu vlasnika pre implementacije.

Vlasnik ručno otvara zaseban Codex zadatak za implementaciju tiketa i zatim
zaseban zadatak za nezavisan review PR-a. Ispravke zadaje prvobitnoj coding sesiji.
Review objavljuje nalaze prema aktuelnom `review-code` skill-u; promene očekivanja
beleže se u projektnim fajlovima. GitHub čuva kontekst između sesija.

Potvrda tiketa ne pokreće novu sesiju automatski. GitHub Projects ostaje opciona
tabla, a automatizacija se odlaže do provere jednog celog toka. Vlasnik na kraju
ručno pregleda i spaja PR; agenti ne merge-uju niti deploy-uju.

Cloud i lokalni rad koriste isti GitHub repozitorijum; sinhronizovati grane pre
nastavka rada. Ne pokretati dva agenta nad istom granom bez koordinacije.

### 12.4 MCP integracije — kandidati za pregled

**GitHub MCP / GitHub integracija — prioritet 1.** Pristup issues, PR-ovima i kodu. Koristiti najmanji potreban skup dozvola i ograničiti pristup na Tracking Food repozitorijum. GitHub Actions ostaje nezavisan izvor CI rezultata.

**Context7 — opcioni prioritet 2.** Dohvatanje aktuelne dokumentacije za Next.js, Drizzle i ostale biblioteke. Koristiti kao referencu, ne kao izvor projektnih zahteva. Proveriti provajdera, tačnost dokumentacije i ograničenja pre povezivanja.

**Playwright / browser MCP — prioritet 2 kada UI postoji.** Agent može da otvori lokalnu aplikaciju, proveri korisničke tokove i prikupi snimke ekrana. Automatizovani Playwright testovi u repozitorijumu ostaju primarni ponovljivi testovi. Koristiti isključivo sintetičke podatke.

**Figma MCP — kasnije.** Potreban tek kada postoje konkretni Figma dizajni; omogućava čitanje dizajna i precizniju implementaciju komponenti. Ne uvoditi ga pre potrebe.

**PostgreSQL MCP — opciono, sa velikim oprezom.** Ako bude potreban za inspekciju, dozvoliti samo razvojnu bazu, poželjno read-only. Migracije izvoditi kontrolisano kroz Drizzle i CI/deployment postupak. Nikada ne davati agentu produkcione DB kredencijale.

MCP serveri nisu instalirani, povezani niti verifikovani kao kompatibilni sa konkretnim Codex Cloud okruženjem. Pre povezivanja proveriti zvaničnu dokumentaciju, način autentifikacije, podršku u lokalnom/cloud režimu i bezbednosni model.

### 12.5 Autonomija i odobravanja
**Bez dodatnog odobrenja u okviru poverenog zadatka:** čitanje specifikacija, planiranje, pisanje koda, lokalni testovi, izmena razvojne grane i priprema PR-a (ako su alati povezani i zadatak to dozvoljava).

**Uz eksplicitno odobrenje:** spajanje PR-a, produkcioni deploy, destruktivne migracije, promene pristupa i tajni, troškovno značajne akcije i izmene produkcionih podataka.

### 12.6 Redosled uvođenja
1. Dogovoriti naziv repozitorijuma (predlog `tracking-food`) i napraviti privatan GitHub repo. Pregledati obe specifikacije i dodati ih kao `docs/functional-spec.md` (sadržaj Word dokumenta u Markdown-u) i `docs/technical-spec.md`.
2. Raspakovati sadržaj starter kita u koren repozitorijuma. Dodati `AGENTS.md`, četiri skilla, issue/PR šablone i prateće konfiguracije.
3. Povezati Codex Cloud sa konkretnim repozitorijumom i proveriti pristup kodu. Na računaru instalirati i prijaviti Codex u VS Code-u, pa klonirati isti repo i proveriti lokalni rad.
4. Dogovoriti granice odobravanja iz odeljka 12.5. Za probu otvoriti mali GitHub Issue, npr. inicijalizacija Next.js projekta i healthcheck. Proveriti da Codex Cloud može da izvrši testove i otvori PR, da GitHub Actions prolazi i da korisnik može da pregleda i spoji PR. CI iz starter kita je početni šablon.
5. Povezivanje GitHub-a sa ChatGPT-om je opciono za pripremu i razradu issues, pregled koda, PR-ova i CI rezultata i pomoć pri prvom cloud zadatku. Mogućnost direktnog pokretanja Codex Cloud zadataka iz razgovora proverava se zasebno. Codex interfejs je dostupan kao planirani put za zadavanje cloud poslova.
6. Uvoditi GitHub, Context7 i Playwright MCP pojedinačno, nakon provere dozvola. Figma i PostgreSQL MCP dodati po potrebi.

Početna faza je završena kada privatan repo ima obe specifikacije i starter kit, Codex radi lokalno i u cloud okruženju, a korisnik pregleda prvi PR sa uspešnim CI proverama. Tajne i tokene čuvati u odgovarajućim podešavanjima okruženja.

**Otvoreno za tvoju reviziju:** izbor MCP provajdera, konkretne dozvole, izbor hostinga za cloud razvoj, granica samostalnosti agenta i da li je potrebno više skillova.

## Istorija izmena

- **0.4 · 12.11.2026.** — Dogovoren ručni tok od razrade tiketa do zasebnih coding/review sesija i vlasničkog merge-a.

- **0.3 · 11.11.2026. u 12:50** — Objedinjena arhitektura, razvojni tok i koraci za pokretanje projekta.
- **0.2 · 06.11.2026.** — Dodat plan rada sa Codexom, GitHub-om i MCP integracijama.
- **0.1 · 06.11.2026.** — Početni predlog arhitekture.