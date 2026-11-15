# Tracking Food — Tehnička dokumentacija

**Verzija 0.9 · 15.11.2026. (Europe/Belgrade)**

Predlog arhitekture i plan razvoja za MVP. Funkcionalni zahtevi su u dokumentu „Funkcionalna dokumentacija“ (u repozitorijumu `docs/functional-spec.md`).

## 1. Cilj i granice
Mobile-first responzivna web aplikacija za evidenciju obroka, namirnica i simptoma. Svaki Google nalog može da pristupi svom privatnom dnevniku; nema aplikacione liste dozvoljenih naloga. Brz unos, pregled i retroaktivne izmene su prioritet. Bez mikroservisa, posebnog REST API-ja, AI analize, kalorija ili nativne mobilne aplikacije u MVP-u.

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
| Autentifikacija | Auth.js v5 (`next-auth`), Google OIDC | Šifrovana JWT sesija u HttpOnly kolačiću, 7 dana; [ADR-001](decisions/001-google-auth.md) |
| Deployment | Naknadna odluka | Ne vezivati arhitekturu za provajdera |

Verzije paketa su zaključane u `package.json` i `package-lock.json`. PostgreSQL/Drizzle i trajni korisnici uvedeni su u issue #11; autentifikacija i dalje koristi JWT bez DB adaptera. Model i transakcije opisuje [ADR-002](decisions/002-meal-persistence.md).

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

**users**: UUID `id`, jedinstveni `google_sub`, opcioni `email`, `created_at`. Serverski verifikovani Google `sub` određuje trajnog vlasnika putem konkurentno bezbednog upsert-a; email nije autorizacioni ključ.

**foods**: `id`, `user_id` (FK), `name`, `normalized_name` (za pretragu), `created_at`, `updated_at`. Unikatnost po korisniku i normalizovanom nazivu; čuvati originalni prikazni naziv.

**meals**: `id`, `user_id` (FK), `name`, `note` (nullable text), `occurred_at` (timestamptz), `created_at`, `updated_at`.

**meal_foods**: `meal_id`, `food_id`, `user_id`, `food_name_snapshot`; kompozitni FK (`meal_id`, `user_id`) i (`food_id`, `user_id`) ograničavaju veze na istog vlasnika; kompozitni PK (`meal_id`, `food_id`). Snapshot štiti istorijski naziv od kasnijih promena kataloga; izmena jednog obroka ne menja druge.

**symptoms**: `id`, `user_id` (FK), `name`, `started_at` (timestamptz), `ended_at` (nullable timestamptz), `severity` (nullable integer 1–10), `note` (nullable text), `created_at`, `updated_at`. CHECK `ended_at IS NULL OR ended_at >= started_at`.

Indeksi: `meals(user_id, occurred_at DESC)`, `symptoms(user_id, started_at DESC)`, `foods(user_id, normalized_name)`. Vlasništvo se proverava i za povezane namirnice. Brisanje obroka briše samo njegove veze, ne katalog namirnica. Brisanje namirnica iz kataloga mora čuvati integritet istorije; za MVP ne nuditi globalno brisanje korišćene namirnice.

## 5. Funkcionalni tokovi
**Dodaj obrok (issue #11)**: naziv je dovoljan, namirnice su opcione. Napomena do 5000 znakova je opcioni običan tekst, trim i prazno/beline → NULL. Nazivi do 200 znakova, najviše 100 izabranih i novih namirnica ukupno. Normalizacija namirnica: Unicode NFKC, trim, sažimanje belina i lowercase, uz očuvanje akcenata i postojećeg prikaznog naziva pri koliziji. Serverska Zod validacija prethodi transakciji; vlasnik se uzima iz `requireUser()`. Istorija i katalog se serverski ograničavaju na vlasnika.

Tok: validacija naziva/vremena i liste namirnica → identifikacija ili kreiranje namirnica → kreiranje obroka i veza u jednoj transakciji → osvežavanje istorije. Planirano za naredni tiket: autocomplete naziva obroka predlaže prethodne unose; izbor popunjava prethodni skup namirnica koji korisnik može izmeniti. Ako isto ime ima više skupova, pravilo izbora ostaje otvoreno.

**Izmeni obrok**: proveri vlasništvo → ažuriraj obrok i njegove veze transakciono; drugi obroci ostaju nepromenjeni.

**Simptomi**: kreiranje bez završetka, više aktivnih istovremeno; završavanje postavlja `ended_at` (podrazumevano sada, uz izmenu); omogućiti retroaktivne izmene.

**Dashboard**: agregirana hronološka lista obroka i početaka/završetaka simptoma za izabrani period; bez zaključivanja da je obrok izazvao simptom.

## 6. Autentifikacija, privatnost i bezbednost
- Google OIDC preko Auth.js v5 (`next-auth@5.0.0-beta.32`), kompatibilan sa Next.js 16 i React 19, uz asinhrone `headers()`/`cookies()` API-je. Svaki uspešno autentifikovan Google nalog je prihvaćen; prvi i ponovljeni pristup koriste isti tok bez registracionog formulara ili lozinke. Google traži samo `openid email profile`, uz `prompt=select_account`.
- Šifrovana JWT sesija u HttpOnly, SameSite=Lax kolačiću (Secure na HTTPS). Podrazumevano trajanje određuje jedino `SESSION_MAX_AGE_SECONDS` u `src/lib/auth/config.ts` (7 dana); Auth.js primenjuje istu vrednost na JWT i kolačić. Auth.js session endpoint obnavlja rok važeće sesije. Nevažeći ili istekao token se odbija. Odjava briše sesiju iz tog pregledača, bez odjave Google naloga. Nema auth DB adaptera; trajni korisnici dnevnika uvedeni su zasebno kroz issue #11.
- `/` i `/meals` pozivaju serverski `requireUser()` i bez verifikovanog identiteta preusmeravaju na `/login`. Auth.js GET/POST handler je na `/api/auth/[...nextauth]`; prijava i odjava koriste Server Actions. `/login` i `/api/health` su javni. Provera u layout-u ili prisustvo kolačića nisu dovoljni za zaštitu.
- Lokalni OAuth callback: `http://localhost:3000/api/auth/callback/google`. `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` i `AUTH_URL` idu u `.env.local`; samo placeholderi u `.env.example`. Google tokeni se ne izlažu u sesiji klijenta. JWT callback čuva verifikovani Google `providerAccountId` (`sub`) kao stabilan identitet; Auth.js generisani korisnički UUID bez adaptera nije stabilan između prijava. Auth logger beleži samo kategoriju greške, bez uzroka, tokena ili profila. Lokalno podešavanje i ručna provera su u [README](../README.md#google-oauth-on-localhost). Apple i hosting su van issue #7.
- Autorizacija na svakoj serverskoj operaciji, uključujući čitanje; nikad ne verovati `user_id` sa klijenta. Unose dnevnika, povezane namirnice i buduće izveštaje ograničiti na vlasnika na serveru, prema verifikovanom identitetu sesije.
- Validacija svih Server Actions ulaza preko Zod; zaštita od prevelikih payload-a i ograničavanje zahteva prema potrebi.
- TLS, tajne isključivo u server environment varijablama, minimalne DB privilegije.
- Bez zdravstvenih podataka u analitičkim događajima, URL parametrima i aplikacionim logovima.
- Backup i provera vraćanja podataka pre stvarne upotrebe; definisati retenciju i izvozni format. Izvoz i brisanje sopstvenih podataka planirati kao osnovne kontrole privatnosti.
- Pre hostinga i čuvanja stvarnih podataka proceniti obaveze privatnosti i regulatorni okvir; izolacija podataka po korisniku je obavezna od prvog trajnog unosa i testira se između dva naloga.

## 7. Datum, vreme i korisnički interfejs
Trenutke čuvati kao `timestamptz`. Na unosu browser pretvara lokalno vreme uređaja u UTC ISO trenutak, a prikaz koristi trenutnu zonu uređaja. Nepostojeća vremena tokom DST prelaza se odbijaju; ponovljeni sat koristi prvi trenutak. Istorija je silazna po `occurred_at`, zatim `created_at` i ID-ju za stabilan redosled. Issue #13: `/` proverava sesiju i preusmerava na `/meals`. Zajednički `(protected)` layout sadrži okvir; stranice i operacije i dalje zasebno proveravaju identitet. Server čita istoriju i katalog postojećim servisom; klijent formatira/grupiše po lokalnom datumu. Desktop >=1024 px koristi sidebar od 240 px i tabelu; manji ekrani header i levi drawer. Telefon ima centrirani island sa jednom akcijom za obrok (plus i fork/knife SVG), desktop floating dugme dole desno. Nema tab bara ni neimplementiranih destinacija.

Unos koristi minimalni shadcn-style Dialog zasnovan na Radix UI (`@radix-ui/react-dialog`) za focus trap/restore, Escape i modalnu izolaciju. Na telefonu bottom sheet, na većem ekranu modal do 560 px. Skroluje se telo formulara, footer ostaje vidljiv; `interactive-widget=resizes-content`, visualViewport resize/scroll i safe-area insets prilagođavaju panel tastaturi. Pretraga kataloga prikazuje ograničen skrolujući prostor rezultata i uklonjive izbore; nije autocomplete prethodnih obroka. Uspeh zatvara panel uz refresh i status, greška čuva unos. Dirty stanje uključuje polja, izbore i tekst pretrage; inicijalno vreme nije izmena. Zatvaranje traži potvrdu za izmenjen unos, a tokom čuvanja je blokirano. Pregled rezerviše prostor za floating kontrolu. Stil i kontrolna lista: `.agents/skills/styling/SKILL.md`.

**DECIDE NOW:** postojeći Server Actions, RHF/Zod i Radix-backed UI primitive ispunjavaju dogovoreni tok bez novog servisa. **DEFER:** paginacija/filteri do zahteva ili merljivog problema sa obimom. **NOT NEEDED:** migracije i generički design-system projekat (KISS/YAGNI, repozitorijumski engineering guide).

## 8. Testiranje i kvalitet
- Unit: validacija, normalizacija naziva, završetak simptoma, vremenske granice.
- Integration (test DB): transakcije, FK, izolacija po korisniku, očuvanje istorije, retroaktivne izmene.
- E2E: prijava, unos/izmena/brisanje obroka, autocomplete, aktivan/završen simptom, pregled hronologije.
- Za issue #7 CI koristi sintetičke Auth.js JWT sesije i proverava zaštitu rute, dva nezavisna identiteta, osvežavanje, istek, neispravan token i odjavu, bez pravih Google kredencijala. Stvarni izbor naloga, prvi i ponovljeni Google pristup proveravaju se ručno na localhost-u.
- CI: lint, typecheck, test, build; migracije se primenjuju kontrolisano i odvojeno od build-a.

## 9. Deploy i operativnost
Hosting je zamenljiv (Vercel ili drugi Next.js kompatibilan hosting). PostgreSQL može biti managed servis. Konfigurisati odvojena dev i production okruženja, konekcioni pooling ako hosting koristi serverless runtime, kontrolisane migracije, nadzor grešaka bez osetljivih payload-a i budžetska upozorenja. Besplatan hosting nije arhitektonski zahtev.

## 10. Van obima i moguća evolucija
- PDF izveštaji, analitika, pravila ishrane i AI su kasnije faze.
- Mobilna aplikacija (React Native/Expo) **nije planirana za MVP** i možda nikada neće biti napravljena. Ne uvoditi REST API samo zbog hipotetičkog mobilnog klijenta. Ako se pojavi potreba, postojeće servise izložiti kroz API ili preispitati arhitekturu; prepisivanje je prihvatljivo.
- Bez CQRS, event bus-a, mikroservisa i zasebnog NestJS/.NET backend-a u prvoj verziji.

## 11. Otvorene odluke pre implementacije
1. Trajni korisnici i vlasništvo rešeni su u [ADR-002](decisions/002-meal-persistence.md); Google autentifikacija i sesija u [ADR-001](decisions/001-google-auth.md).
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

## 13. Inženjerski principi i pravila odlučivanja

**Referenca:** [Vodič za inženjerske odluke](engineering-laws.md) povezuje relevantna poglavlja knjige *Laws of Software Engineering* sa odlukama o razvoju Tracking Food-a.

### 13.1 Podrazumevani pristup
- **Gall’s Law:** razvijati najmanji koristan tok do upotrebljivog stanja pre širenja. Prvi vertikalni segment: prijava → unos obroka → trajno čuvanje → istorija → izmena/brisanje. Tek potom slede simptomi i Dashboard.
- **KISS + YAGNI:** jedan Next.js projekat i PostgreSQL; nema dodatnog API-ja, mikroservisa, event bus-a, generičkog framework-a, AI integracije, mobilne aplikacije ili MCP-a bez konkretne potrebe. Ne uvoditi slojeve samo radi buduće fleksibilnosti.
- **Tesler’s Law + Least Astonishment:** minimizovati korake za unos; podrazumevano trenutno vreme, retroaktivna korekcija, jednostavan izbor prethodnog obroka. Ne skrivati korisniku značajne promene podataka niti automatski donositi medicinske zaključke.
- **Technical Debt + Boy Scout Rule:** kada je brži kompromis opravdan, evidentirati njegov razlog, uticaj i uslov za vraćanje; popravljati male probleme pri radu u neposrednom kodu. Ne prepravljati preventivno ceo sistem.
- **Testing Pyramid:** više brzih testova domena, ciljano testiranje baze/autorizacije i mali broj kritičnih E2E tokova. Bez fiksnih procenata pokrivenosti kao cilja samog za sebe.
- **First Principles + Sunk Cost:** preispitati unapred izabrane tehnologije kada postoje dokazi da ne rešavaju problem; prethodni trud nije argument da se loša odluka zadrži.

### 13.2 Kada je odluka potrebna
| Odluka | Trenutak / okidač | Šta ne radimo unapred |
|---|---|---|
| Autentifikacija | Pre prvog privatnog deploy-a ili implementacije zaštićenih tokova | Ne razvijamo sopstveni auth |
| Model baze i migracije | Pre implementacije prvog unosa i istorije obroka | Ne modelujemo unapred dijetetska pravila i analitiku |
| Hosting i backup/restore | Pre čuvanja stvarnih podataka | Ne biramo infrastrukturu prema hipotetičkom velikom opterećenju |
| Pravilo za istoimene obroke | Tokom implementacije autocomplete-a; testirati na stvarnim primerima | Ne pravimo sistem šablona/recepata |
| API za mobilni klijent | Tek kada postoji konkretan drugi klijent | Ne izlažemo REST API za moguću buduću aplikaciju |
| PWA, AI, izveštaji i dijetetska pravila | Nakon korišćenja osnovnih funkcija i jasnog zahteva | Ne uvodimo njihove zavisnosti u MVP |
| Novo arhitektonsko izdvajanje | Kada merljiv problem u održavanju, testiranju ili performansama opravda promenu | Ne uvodimo mikroservise radi predviđene skale |

### 13.3 Mini-protokol za sledeće zahteve i Codex
Pre svake značajne izmene: (1) definisati korisnički problem i kriterijum uspeha; (2) klasifikovati odluku kao **sada**, **kasnije uz okidač**, ili **nepotrebna**; (3) navesti relevantan princip, njegovu granicu i alternativu; (4) izabrati najmanju promenu koja čuva privatnost i integritet podataka; (5) dodati testove srazmerne riziku; (6) zabeležiti samo odluke koje imaju trajne posledice. Ako se principi sukobe, prednost imaju konkretni zahtevi, bezbednost podataka i dokazi iz korišćenja, a ne mehaničko praćenje jednog zakona.

**Status:** Ovo je smernica za buduće predloge i review; ne znači da su pomenute funkcionalnosti implementirane niti da su otvorene odluke rešene.

## Istorija izmena

- **0.9 · 15.11.2026.** — Issue #13: responzivni okvir i pregled, modalni unos i styling skill.

- **0.8 · 14.11.2026.** — Issue #11: PostgreSQL/Drizzle, trajni vlasnici, transakcioni unos sa napomenom, izolacija i testovi. Lokalni postupak migracija i provera: [setup](setup.md#postgresql-i-obroci-issue-11).

- **0.7 · 14.11.2026.** — Issue #7: Auth.js/Google i sedmodnevne JWT sesije; uklonjena pretpostavka jednog korisnika i posebne registracije. Baza i trajni korisnici odloženi do čuvanja dnevnika.

- **0.6 · 14.11.2026.** — Definisani Google prijava, lokalna provera, trajanje sesije i izolacija podataka po korisniku.

- **0.5 · 13.11.2026.** — Usklađene smernice iz knjige i postojeći tok rada u repozitorijumu.

- **0.4 · 12.11.2026.** — Dogovoren ručni tok od razrade tiketa do zasebnih coding/review sesija i vlasničkog merge-a.

- **0.3 · 11.11.2026. u 12:50** — Objedinjena arhitektura, razvojni tok i koraci za pokretanje projekta.
- **0.2 · 06.11.2026.** — Dodat plan rada sa Codexom, GitHub-om i MCP integracijama.
- **0.1 · 06.11.2026.** — Početni predlog arhitekture.
