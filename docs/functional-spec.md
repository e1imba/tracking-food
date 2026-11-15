# Tracking Food — Funkcionalna dokumentacija

Funkcionalna dokumentacija · Verzija 0.9 · 15.11.2026.

Tracking Food je radni naziv ličnog dnevnika ishrane i simptoma. Svaki korisnik pristupa svom privatnom dnevniku preko Google naloga. Služi za brz unos sa telefona, pregled istorije i kasniju pripremu izveštaja za razgovor sa lekarom.

## Prijava i odjava

- Dugme „Nastavi preko Google-a“ otvara izbor Google naloga. Svaki nalog koji Google uspešno autentifikuje može da pristupi aplikaciji, bez aplikacione liste dozvoljenih naloga, posebne registracije ili lozinke. Prvi i ponovljeni pristup koriste isti tok.
- Početna stranica `/` je zaštićena i prijavljenog korisnika preusmerava na `/meals`. Bez važeće sesije korisnik ide na `/login`. Svaki Google nalog ima nezavisnu sesiju, koja ostaje aktivna posle osvežavanja; podrazumevano traje 7 dana. Istek traži novu prijavu.
- „Odjavi se“ završava sesiju u tom pregledaču i vraća ekran za prijavu. Ponovno direktno otvaranje ili osvežavanje početne stranice traži prijavu. Google nalog u pregledaču ostaje prijavljen kod Google-a.
- Za ovu fazu tok se proverava lokalno na `localhost`; Apple i hosting dolaze u posebnim tiketima. Issue #11 uvodi trajne korisnike i privatni unos/istoriju obroka. Svaki korisnik može da pristupi samo svojim unosima i izveštajima; svaki serverski pristup mora proveriti vlasništvo.

## Obroci

- Pregled je početni ekran: na desktopu tabela Datum/vreme | Obrok | Namirnice | Napomena, na telefonu kompaktni redovi grupisani po lokalnom datumu. Dugi sadržaj može da se proširi preko „Prikaži više“.

- Zaštićeni ekran `/meals` omogućava unos i privatnu istoriju od najnovijeg ka najstarijem po vremenu obroka. Unosi ostaju posle osvežavanja. Izmena i brisanje slede u narednim tiketima; privatni predlozi naziva uvedeni su u #16.

- Unos se otvara plutajućim dugmetom sa „+“ i ikonicom pribora za jelo, pristupačnog naziva „Dodaj obrok“. Na telefonu je skoro celoekranski bottom sheet, na desktopu modal. Formular skroluje unutar panela, uz dostupno dugme za čuvanje. Namirnice se pretražuju u autocomplete dropdown-u bez checkboxova i biraju višestruko kao uklonjivi tagovi bez duplikata, uz dodavanje novih. Uspeh zatvara panel, osvežava pregled i prikazuje potvrdu; greška čuva unos. Zatvaranje popunjene forme traži potvrdu odbacivanja.

- Formular sadrži naziv u slobodnom tekstu, tip obroka, višestruki izbor namirnica, opcionu višerednu Napomenu i datum i vreme. Podrazumevano vreme je sada, uz mogućnost retroaktivnog unosa. Nova namirnica može da se doda u katalog tokom unosa.

- Naziv od prvog nepraznog znaka predlaže sopstvene ranije obroke po prefiksu, bez fuzzy pretrage. Isti puni naziv se deduplikuje preko NFKC, trim, sažimanja belina i lowercase, uz očuvanje dijakritike. „Sendvič“ i „Sendvič sa pavlakom“ ostaju različiti predlozi. Novi naziv može slobodno da se sačuva.

- Samo eksplicitni izbor predloga zamenjuje namirnice skupom poslednjeg pojedenog istoimenog obroka (vreme obroka, pa vreme kreiranja i ID silazno), uključujući prazan skup. Tip, vreme i napomena se ne kopiraju. Korisnik može da promeni tagove; prethodni obroci ostaju nepromenjeni. Samo kucanje ili naknadna izmena naziva ne menja namirnice.

- Tačno pet fiksnih tipova: Doručak, Ručak, Večera, Užina i Ostalo. Lokalno polje „Datum i vreme“ automatski predlaže Doručak od 04:00 do 11:59, Ručak od 12:00 do 16:59, Večeru od 17:00 do 23:59 i Ostalo od 00:00 do 03:59. Užina se bira ručno. Promena vremena prati predlog dok korisnik ručno ne izabere tip; zatim se njegov izbor zadržava. Svaka nova forma resetuje taj režim. Inicijalni predlog nije izmena, ručni izbor i promena vremena jesu. Novi obroci obavezno čuvaju tip; stari ostaju bez tipa i prikazuju „—“.

- Dropdown-i rade tastaturom: strelice menjaju aktivni predlog, Enter bira bez slanja forme, Escape prvo zatvara otvoreni dropdown. Izabrane namirnice se ne nude ponovo. Katalog zadržava contains pretragu.

- Napomena se čuva uz obrok i prikazuje kao običan tekst u privatnoj istoriji; prazan unos ili same beline znače da napomene nema. Obrok radi i sa praznim katalogom i bez namirnica. Nove namirnice i obrok čuvaju se zajedno; pri grešci ništa od tog unosa ne ostaje delimično sačuvano.

- Vreme se unosi i prikazuje u lokalnoj zoni uređaja. Nepostojeće vreme pri prelasku na letnje računanje se odbija; ponovljeni sat pri povratku koristi prvi trenutak.

- Svaki unos čuva svoj skup namirnica. Naziv je dovoljan za opis obroka. Fiksni tip obroka je obavezan za nove unose; korisničke kategorije i poseban editor recepata ili šablona nisu deo ove faze.

## Simptomi

- Formular sadrži naziv ili opis u slobodnom tekstu uz predloge, datum i vreme početka, opcionu jačinu od 1 do 10 i opcionu napomenu.

- Simptom ostaje aktivan dok nema vreme završetka. Više simptoma može biti aktivno istovremeno. Akcija „Završi“ nudi trenutno vreme i dozvoljava da se unese raniji završetak, od vremena početka nadalje.

- Ekran Simptomi ima liste aktivnih i završenih simptoma. Završeni unos prikazuje početak, završetak i trajanje. Unosi se mogu pregledati, izmeniti i obrisati.

## Dashboard i navigacija

- Dashboard prikazuje aktivne simptome i zajedničku hronologiju obroka, početaka i završetaka simptoma za izabrani dan ili period.

- Trenutni okvir ima bočni meni od 1024 px i kompaktno zaglavlje sa levim drawer menijem na manjim ekranima. Meni prikazuje Obroke, nalog i odjavu. Na telefonu postoji donji centrirani island sa jednom akcijom za unos obroka; na desktopu dugme je dole desno. Simptomi i Dashboard dobijaju navigaciju tek u svojim tiketima.

- Podaci se čuvaju na serveru. Pristup je privatan, uz prijavu i kontrolu pristupa. Osnovna rezervna kopija je deo prve verzije.

## Izveštaji i plan ishrane

- Izveštaji za poslednjih 1, 2 ili 3 meseca prikazuju unose, učestalost namirnica i simptoma, trendove i vremenska poklapanja. PDF izvoz za lekara je deo ove faze. Poklapanja služe za pregled evidencije i razgovor sa lekarom.

- Kasnija faza uvodi plan ishrane sa dozvoljenim, ograničenim i zabranjenim namirnicama. Pravila mogu da zavise od doba dana. Ocena obroka služi za povratnu informaciju uz slobodan unos i mesečni pregled učestalosti odstupanja.

## Redosled razvoja i otvorene odluke

- Redosled razvoja MVP-a je prijava i odjava, zatim unos i istorija obroka, zatim simptomi, pa osnovni Dashboard. Izveštaji, analitika i plan ishrane slede posle osnovnog Dashboard-a.

- Kalorije, makronutrijenti i AI preporuke izostavljeni su iz MVP-a. PWA i zasebna nativna mobilna aplikacija ostaju opcije za kasnije.

- Otvorena je potvrda brisanja ili vraćanje unosa, detalji PDF izveštaja, skala ocenjivanja i konačan naziv proizvoda.

## Principi proizvoda i redosled odluka

Vodič za razvoj je knjiga dr Milana Milanovića „Laws of Software Engineering“ (2026). Primena njenih principa na ovaj projekat opisana je u [vodiču za inženjerske odluke](engineering-laws.md).

- Gall’s Law: isporučiti prvo kompletan, upotrebljiv tok za obroke (unos, čuvanje, istorija, izmena i brisanje), proveriti iskustvo korišćenja, a tek zatim dodavati simptome i Dashboard.

- KISS i YAGNI: ne širiti obim MVP-a na recepte, kalorije, AI, PWA, ocene obroka ili napredne izveštaje pre konkretne potrebe.

- Tesler’s Law: složenost obrade predloga obroka, vremena i namirnica treba da preuzme aplikacija kad god to pojednostavljuje unos; korisnik uvek može da pregleda i ispravi rezultat.

- Princip najmanjeg iznenađenja: retroaktivni unos, promena vremena, završavanje simptoma i brisanje moraju imati očekivano i jasno ponašanje. Ne sugerisati uzročno-posledičnu vezu između obroka i simptoma.

- Pravilo istoimenih obroka rešava #16 (poslednji pojeden); odluke o potvrdi brisanja donositi pri izradi tog toka; dizajn izveštaja i pravila ishrane odložiti do njihovih faza.

- Zahtev za novu funkcionalnost prvo proceniti: potreba sada, odluka kasnije uz konkretan okidač ili funkcionalnost van obima. Prednost imaju brzina unosa, pouzdana istorija, privatnost i jednostavnost.

## Istorija izmena

0.9 · 15.11.2026. — Issue #16: pet tipova sa lokalnim predlogom, autocomplete naziva i namirnica, poslednji pojeden istoimeni obrok.

0.8 · 15.11.2026. — Issue #13: početni pregled, sidebar/drawer, island i izdvojen unos.

0.7 · 14.11.2026. — Issue #11: privatni unos i trajna istorija, opciona napomena i lokalno vreme.

0.6 · 14.11.2026. — Issue #7: Google prijava za svaki nalog, nezavisne sedmodnevne sesije i odjava; izolacija budućih dnevnika po korisniku.

0.5 · 14.11.2026. — Dogovoreni Google prijava i odjava, trajanje sesije i vlasništvo nad unosima.

0.4 · 12.11.2026. — Dodat vodič za prioritizaciju i pravovremeno donošenje odluka prema knjizi Laws of Software Engineering.

0.3 · 11.11.2026. u 12:50 (Europe/Belgrade) — Objedinjeni osnovni zahtevi, funkcionalna dopuna i plan razvoja.
