# ADR-002: Privatno čuvanje obroka u PostgreSQL-u

Date: 2026-11-14
Status: accepted

## Context

Issue #11 uvodi prvi trajni dnevnik nakon ADR-001: naziv obroka, opcione namirnice i napomena, lokalno vreme i privatna istorija. Google `sub` je stabilan identitet; email nije ključ vlasništva.

## Decision

**DECIDE NOW:** PostgreSQL 17 za lokalni razvoj/test i Drizzle sa verzionisanim SQL migracijama. `users.google_sub` je jedinstven; serverski `requireUser()` prethodi bezbednom upsert-u vlasnika. Svako čitanje i pisanje koristi njegov UUID. Paralelni prvi pristupi dobijaju istog vlasnika. Email je opcioni podatak pri kreiranju, nije jedinstven niti izvor autorizacije.

Obrok, nove namirnice i veze nastaju u jednoj transakciji. Namirnice su jedinstvene po vlasniku i nazivu normalizovanom preko Unicode NFKC, trim, sažimanja belina i lowercase; akcenti se čuvaju. Postojeći prikazni naziv se zadržava pri koliziji. Veze sadrže snapshot naziva. Kompozitni strani ključevi sa `user_id` dodatno odbijaju povezivanje različitih vlasnika. Nema globalnog brisanja korišćenih namirnica.

Naziv je dovoljan; napomena je opciono `text`, prazna/beline postaju NULL. Granice: 200 znakova za naziv obroka/namirnice, 5000 za napomenu i ukupno 100 izabranih/novih namirnica. Zod validira na serveru, React Hook Form/Zod i HTML ograničenja pomažu na klijentu. Greška čuvanja je generička bez privatnih detalja; unos ostaje u formularu radi ispravke.

Uređaj pretvara `datetime-local` u UTC ISO trenutak; PostgreSQL čuva `timestamptz`. Prikaz koristi trenutnu zonu uređaja. Nepostojeće lokalno vreme tokom prelaska na letnje vreme se odbija; kod ponovljenog sata bira se prvi trenutak prema browser Date pravilima. Korisnik proverava prikaz pre čuvanja; izbor drugog ponovljenog sata odložen je do konkretne potrebe. Istorija se sortira po vremenu obroka silazno, pa vremenu kreiranja i ID-ju radi stabilnosti. Server čita privatne podatke bez zajedničkog keša; klijent formatira samo vreme i interakcije.

KISS/YAGNI: jedna aplikacija i transakcija, bez novog servisa/API-ja ili modela recepata. Konsultovan je [repozitorijumski vodič](../engineering-laws.md); autorov YAGNI link je pri proveri vratio HTTP 403. Alternativa, odvojen API, trenutno nema konkretan drugi klijent.

**DEFER:** autocomplete, izmena i brisanje do sledećih tiketa za obroke; paginacija/pretraga istorije i kataloga kada obim oteža korišćenje. Hosting, minimalne produkcione DB privilegije, backup i provereni restore moraju biti rešeni pre stvarnih podataka. Ovaj PR koristi samo sintetičku lokalnu/test bazu.

**NOT NEEDED:** auth DB adapter, simptomi, Dashboard, medicinska tumačenja i infrastruktura za hipotetičko skaliranje.

## Consequences

Prva migracija samo dodaje četiri nove tabele, ograničenja i indeks; ne menja postojeće podatke. Migracije su eksplicitan korak, nikada deo build-a. Integracioni testovi zahtevaju eksplicitni `TEST_DATABASE_URL` sa nazivom baze koji završava na `_test`; koriste dva sintetička identiteta, proveravaju vlasništvo, snapshot, normalizaciju, konkurentni upis i rollback posle upisa obroka i namirnice. Playwright proverava mobilni i desktop tok sa sintetičkim JWT sesijama. Prava Google prijava ostaje zasebna ručna provera iz ADR-001.
