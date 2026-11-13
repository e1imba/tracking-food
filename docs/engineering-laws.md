# Vodič za inženjerske odluke

Vodič je zasnovan na knjizi *Laws of Software Engineering* dr Milana Milanovića (prvo izdanje, april 2026). [Knjiga i sadržaj](https://lawsofsoftwareengineering.com/book/) · [Autorov javni katalog principa](https://lawsofsoftwareengineering.com/)

Pri razradi tiketa pročitaj relevantan odeljak [funkcionalne](functional-spec.md) ili [tehničke specifikacije](technical-spec.md). Izaberi princip prema odluci koju tiket otvara. U predlogu navedi konkretan kompromis, odluku koju donosimo sada i uslov pod kojim vredi otvoriti odloženu odluku. Za detalje otvori povezani tekst autora ili koristi broj poglavlja ako je PDF dostupan u sesiji.

| Princip i poglavlje | Primena u Tracking Food-u |
|---|---|
| [Gall’s Law](https://lawsofsoftwareengineering.com/laws/galls-law/) (1) | Prvo završi tok od unosa obroka do trajnog čuvanja, istorije i korekcije. Proveri ga pre širenja na simptome i Dashboard. |
| [Tesler’s Law](https://lawsofsoftwareengineering.com/laws/teslers-law/) (3) i Principle of Least Astonishment (44) | Ponudi trenutno vreme i ranije korišćene namirnice. Korisnik proverava predlog i može da ga izmeni pre čuvanja. |
| KISS (40) i [YAGNI](https://lawsofsoftwareengineering.com/laws/yagni/) (41) | Zadrži jednu aplikaciju. Razmotri poseban API kad postoji drugi klijent sa konkretnim potrebama. |
| Technical Debt (29) i [Boy Scout Rule](https://lawsofsoftwareengineering.com/laws/boy-scout-rule/) | Za prihvaćen kompromis zabeleži razlog, posledicu i okidač za doradu. Lokalna poboljšanja ograniči na deo koda koji tiket menja. |
| The Testing Pyramid (32) | Pravila unosa proveri ciljanim testovima. Provere autorizacije i baze radi na integracionom nivou, a unos i naknadnu izmenu proveri kroz ključni E2E tok. |
| Sunk Cost Fallacy (48) i First-Principles Thinking (53) | Preispitaj izbor kad provera pokaže da konkretan zahtev ostaje neispunjen. Proceni trošak promene i budućeg održavanja. |

Kad se principi sukobe, koristi dogovorene kriterijume tiketa, privatnost, integritet podataka i ono što je provereno u radu aplikacije. Za redosled odluka o autentifikaciji, bazi i rezervnim kopijama otvori [tehničku specifikaciju](technical-spec.md#132-kada-je-odluka-potrebna).
