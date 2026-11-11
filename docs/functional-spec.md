# Tracking Food — Funkcionalna dokumentacija
Funkcionalna dokumentacija · Verzija 0.3 · 11.11.2026. u 12:50

Tracking Food je radni naziv ličnog dnevnika ishrane i simptoma. Aplikacija je namenjena
jednom korisniku. Služi za brz unos sa telefona, pregled istorije i kasniju pripremu
izveštaja za razgovor sa lekarom.

## Obroci
- Na ekranu Obroci korisnik vidi hronološku listu i može da pregleda, izmeni ili obriše svaki unos.
- Formular sadrži naziv u slobodnom tekstu, višestruki izbor namirnica i datum i vreme. Podrazumevano vreme je sada, uz mogućnost retroaktivnog unosa. Nova namirnica može da se doda u katalog tokom unosa.
- Izbor prethodnog obroka iz predloga popunjava njegov skup namirnica, koji korisnik može da prilagodi pre čuvanja. Predlozi mogu da pomognu pri tipfelerima, uz očuvanje unetog teksta.
- Svaki unos čuva svoj skup namirnica. Naziv je dovoljan za opis obroka. Obavezne kategorije i poseban editor recepata ili šablona izostavljeni su iz prve faze.

## Simptomi
- Formular sadrži naziv ili opis u slobodnom tekstu uz predloge, datum i vreme početka, opcionu jačinu od 1 do 10 i opcionu napomenu.
- Simptom ostaje aktivan dok nema vreme završetka. Više simptoma može biti aktivno istovremeno. Akcija „Završi“ nudi trenutno vreme i dozvoljava da se unese raniji završetak, od vremena početka nadalje.
- Ekran Simptomi ima liste aktivnih i završenih simptoma. Završeni unos prikazuje početak, završetak i trajanje. Unosi se mogu pregledati, izmeniti i obrisati.

## Dashboard i navigacija
- Dashboard prikazuje aktivne simptome i zajedničku hronologiju obroka, početaka i završetaka simptoma za izabrani dan ili period.
- Responzivna web aplikacija koristi donju navigaciju na telefonu i bočnu na desktopu. Dugme „+“ sa svakog glavnog ekrana nudi unos obroka ili simptoma.
- Podaci se čuvaju na serveru. Pristup je privatan, uz prijavu i kontrolu pristupa. Osnovna rezervna kopija je deo prve verzije.
## Izveštaji i plan ishrane
- Izveštaji za poslednjih 1, 2 ili 3 meseca prikazuju unose, učestalost namirnica i simptoma, trendove i vremenska poklapanja. PDF izvoz za lekara je deo ove faze. Poklapanja služe za pregled evidencije i razgovor sa lekarom.
- Kasnija faza uvodi plan ishrane sa dozvoljenim, ograničenim i zabranjenim namirnicama. Pravila mogu da zavise od doba dana. Ocena obroka služi za povratnu informaciju uz slobodan unos i mesečni pregled učestalosti odstupanja.

## Redosled razvoja i otvorene odluke
- Redosled razvoja MVP-a je unos i istorija obroka, zatim simptomi, pa osnovni Dashboard. Izveštaji, analitika i plan ishrane slede posle osnovnog Dashboard-a.
- Kalorije, makronutrijenti i AI preporuke izostavljeni su iz MVP-a. PWA i zasebna nativna mobilna aplikacija ostaju opcije za kasnije.
- Otvoreno je ponašanje predloga za istoimene obroke sa različitim namirnicama, potvrda brisanja ili vraćanje unosa, izgled ekrana, detalji PDF izveštaja, skala ocenjivanja i konačan naziv proizvoda.

## Istorija izmena
0.3 · 11.11.2026. u 12:50 (Europe/Belgrade) — Objedinjeni osnovni zahtevi, funkcionalna
dopuna i plan razvoja.