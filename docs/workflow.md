# Rad kroz Codex i GitHub

Jedan Codex, odvojene sesije za razradu, implementaciju i nezavisan review.
Korisnik ručno pokreće svaku sesiju i bira `e1imba/tracking-food`.
Skills su uputstva; ne pokreću zadatke. Nema automatskog prenosa između sesija.
GitHub Issues i PR-ovi čuvaju dogovor i rezultate, bez oslanjanja na memoriju chata.

## Od ideje do merge-a

1. **Razrada u chatu.** Korisnik opisuje ideju. Agent čita `AGENTS.md`, obe
   specifikacije i `refine-ticket` skill, otvara draft GitHub Issue i dopunjava
   isti tiket kroz razgovor. Draft ovde znači običan otvoren issue u razradi.
   Dogovor mora biti zapisan u tiketu pre predaje drugoj sesiji.
2. **Potvrda tiketa.** Korisnik potvrđuje obim i 3–5 kratkih acceptance criteria.
   Agent u tiket beleži potvrdu i preostale blokere. Potvrda sama ne pokreće kodiranje.
3. **Nova coding sesija.** Korisnik otvara novi Codex zadatak sa porukom ispod.
   Agent radi na posebnoj grani, proverava rezultat i otvara PR povezan sa tiketom.
4. **Nova review sesija.** Korisnik otvara zaseban zadatak za PR. Reviewer čita
   aktuelna projektna pravila, tiket, diff i CI rezultate, pa objavljuje nalaze na PR-u.
5. **Ispravke u coding sesiji.** Korisnik vraća PR komentare prvobitnoj sesiji.
   Agent proverava svaki nalaz, ispravlja opravdane probleme, odgovara na komentare
   i navodi provere. Neslaganje obrazlaže; ne odbacuje nalaz bez razloga.
   Korisnik po potrebi pokreće novi review ažuriranog PR-a.
6. **Ručni završetak.** Korisnik pregleda diff, razgovor i CI, odlučuje o odobrenju
   i ručno spaja PR. Na sopstvenom PR-u GitHub ne omogućava formalni self-approval;
   ručni pregled i merge su završna odluka vlasnika. Agenti ne merge-uju niti deploy-uju.

## Poruke za kopiranje

**Razrada:** „Razradimo sledeću ideju: … Koristi refine-ticket skill i pripremi
GitHub tiket sa kratkim acceptance criteria. Ne započinji implementaciju.”

**Coding — novi zadatak:** „Implementiraj issue #12 u e1imba/tracking-food prema
AGENTS.md i implement-feature skill-u. Pročitaj dogovor u tiketu, radi na posebnoj
grani, pokreni relevantne provere i otvori PR. Bez merge-a i deploy-a.”

**Review — novi zadatak:** „Pregledaj PR #15 u e1imba/tracking-food prema povezanom
tiketu, aktuelnoj dokumentaciji i review-code skill-u. Ostavi konkretne nalaze
na PR-u i kratak pregled. Ne menjaj kod i ne merge-uj.”

**Ispravke — coding sesija:** „Obradi review komentare na PR-u #15 koristeći
implement-feature skill. Ispravi opravdane nalaze, odgovori na komentare i ponovi
relevantne provere. Bez merge-a.”

Brojevi su primeri. Nova sesija proverava aktuelni issue/PR i granu pre rada.
Ako nema pristup tiketu, PR-u ili objavljivanju komentara, prijavljuje konkretan
blokator i daje pripremljen sadržaj; ne tvrdi da je nešto objavljeno.

## Tiketi i pravila koja se menjaju

Tiket sadrži cilj, kratak obim, 3–5 proverljivih acceptance criteria i samo
potrebne reference/tehničke napomene. Otvorene odluke koje blokiraju rad moraju
biti razrešene pre implementacije. Dokumentacija i Laws heuristike iz AGENTS.md
usmeravaju razradu; ne izmišljati sadržaj knjige ako nije dostupna.

Review se vodi projektnim pravilima. Kada vlasnik promeni očekivanja, ažurirati
odgovarajući skill ili specifikaciju, uz konkretno pravilo/primer, i povezati
izmenu u PR-u. Svaka naredna sesija ponovo čita ta pravila. Spoljni skills su
opcione reference nakon pregleda; nisu iznad projektne dokumentacije.

**DECIDE NOW:** Issues, odvojene sesije i ručni merge su dogovoreni tok.
**DEFER:** GitHub Projects tabla dok praćenje većeg broja tiketa ne postane potrebno;
automatsko pokretanje agenata dok jedan mali tiket ne prođe ceo tok.
Dodatni servis za tikete trenutno **NOT NEEDED**. Ovaj dokument ne konfiguriše
automatizaciju, Projects tablu ili branch protection.
