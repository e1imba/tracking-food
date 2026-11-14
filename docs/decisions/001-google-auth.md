# ADR-001: Google autentifikacija i sesija bez baze

Date: 2026-11-14
Status: accepted

## Context

[Issue #7](https://github.com/e1imba/tracking-food/issues/7) potvrđuje pristup za svaki Google nalog, izbor naloga jednim dugmetom, prvi i ponovljeni pristup bez registracije, zaštićenu početnu stranicu i odjavu. Lokalna provera je na localhost-u. Trenutni projekat koristi Next.js 16.4.6 i React 19.3.1; dnevnik još nema trajno čuvanje.

## Decision

**DECIDE NOW:** Auth.js v5, zaključan `next-auth@5.0.0-beta.32`. Njegovi peer dependencies prihvataju Next.js 16 i React 19; implementacija koristi asinhrone `headers()` i `cookies()`. Pročitani su lokalni Next.js vodiči za autentifikaciju, route handlers, cookies i redirect. Kompatibilnost potvrđuju typecheck, produkcioni build i Playwright provera stvarnog serverskog auth toka sa sintetičkim sesijama. v5 je beta: zaključavanje verzije i regresione provere su potrebni pri nadogradnji. Alternativa je drugo održavano auth rešenje; sopstveni OAuth protokol nije opravdan.

Google OIDC je jedini provider, sa `openid email profile` i `prompt=select_account`. Nema aplikacione liste naloga ili provere domena. JWT callback čuva verifikovani Google `providerAccountId` (`sub`) kao identitet; Auth.js bez adaptera generiše novi korisnički UUID pri svakoj prijavi, pa taj UUID nije stabilan identitet. Email je prikazni podatak. Google access/refresh tokeni nisu deo izložene sesije. Auth logger beleži samo kategoriju greške, bez tokena, profila ili provider odgovora.

Sesija je podrazumevani Auth.js šifrovani JWT u HttpOnly, SameSite=Lax kolačiću, Secure na HTTPS. `SESSION_MAX_AGE_SECONDS` u `src/lib/auth/config.ts` određuje trajanje JWT-a i kolačića, podrazumevano 7 dana. Važeća sesija može da se obnovi preko Auth.js session endpoint-a; istekla se odbija. Server Component čitanje sesije ne produžava kolačić. `requireUser()` proverava verifikovan identitet na zaštićenoj stranici; buduće privatne operacije moraju raditi istu proveru i proveru vlasništva. Prijava i odjava su Server Actions. Auth.js obrađuje OAuth validaciju i zaštitu svojih POST endpoint-a.

**DEFER:** PostgreSQL/Drizzle, trajni korisnici i šema vlasništva do prvog čuvanja dnevnika. Tada mapirati stabilni Google identitet na vlasnika i testirati izolaciju svakog čitanja/pisanja. Hosting i backup/restore odlučiti pre čuvanja stvarnih podataka. Serverski opoziv svih sesija razmotriti ako bude zahteva za odjavu sa svih uređaja ili trenutni opoziv kompromitovane sesije.

**NOT NEEDED:** Apple, posebna registracija/lozinka, Google API pristup van osnovnog identiteta i DB adapter u ovom tiketu. KISS/YAGNI iz [repozitorijumskog vodiča](../engineering-laws.md) opravdavaju izostavljanje baze dok nema podataka za čuvanje, uz obaveznu kontrolu pristupa. Autorov povezani YAGNI tekst nije bio dostupan (mrežni proxy: HTTP 403); konsultovan je repozitorijumski vodič.

## Consequences

- Nema migracija ili Google kredencijala u CI-u. Testovi ubacuju sintetički šifrovan JWT samo iz test procesa; aplikacija nema testni provider ili zaobilaznu prijavu.
- Odjava briše kolačić u trenutnom pregledaču. Stateless JWT nema centralni opoziv kopiranog tokena pre isteka; ovaj obim ne zahteva odjavu sa svih uređaja.
- `.env.local` sadrži lokalne tajne; `.env.example` samo prazne vrednosti i uputstva. Google OAuth klijent podešava vlasnik prema README-u. Stvarni prvi/ponovljeni Google pristup i dva naloga zahtevaju ručnu proveru.
