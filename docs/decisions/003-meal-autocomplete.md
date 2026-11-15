# ADR-003 — Tipovi i predlozi obroka

Status: prihvaćeno kroz dogovor u [issue #16](https://github.com/e1imba/tracking-food/issues/16), 15.11.2026.

**DECIDE NOW:** pet stabilnih tipova sa srpskim labelama, nullable tekstualno polje sa DB CHECK i obaveznom serverskom validacijom novih unosa. Stari zapisi ostaju NULL, bez zaključivanja tipa iz vremena. Lokalno vreme forme predlaže tip do prvog ručnog izbora; server ga ne prepisuje.

**DECIDE NOW:** normalizovani puni naziv (NFKC, trim, sažimanje belina, lowercase bez uklanjanja dijakritike), prefix pretraga i poslednji pojeden obrok: occurred_at DESC, created_at DESC, id DESC. Izbor zamenjuje skup namirnica, uključujući prazan; drugi podaci se ne kopiraju. Svaki obrok i dalje čuva sopstvene veze i snapshot nazive.

Predloge pripremamo iz postojeće serverski ograničene istorije i šaljemo samo naziv, ID obroka i ID-jeve namirnica. Sinhroni izbor izbegava zastarele odgovore. Upis ponovo proverava vlasništvo. Cena je prenos predloga svih različitih naziva uz već postojeće čitanje istorije.

**DEFER:** paginacija/server pretraga do merljivog problema sa obimom; podesivi tipovi do eksplicitnog novog zahteva. **NOT NEEDED:** posebna tabela kategorija, REST servis, recepti ili šabloni.

Tesler: aplikacija preuzima ponovljeni izbor, korisnik zadržava izmenu pre čuvanja. KISS/YAGNI: postojeći servis i ograničen skup tipova. Konsultovan [repo vodič](../engineering-laws.md); autorov povezani Tesler tekst nije bio dostupan iz okruženja. Pravila i granice su u kanonskoj [funkcionalnoj](../functional-spec.md#obroci) i [tehničkoj](../technical-spec.md#5-funkcionalni-tokovi) specifikaciji.
