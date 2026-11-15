# Issue #13 — vizuelna provera

Snimci su napravljeni Playwright-om u lokalnom Chromium-u, sa sintetičkim nalogom
i sintetičkim obrokom. Pregledani su mobilni i desktop prikaz i oba formulara.
Namerno duga reč i napomena proveravaju prelamanje i sažimanje sadržaja.

- `issue-13-390.png`: pregled na 390 px.
- `issue-13-1440.png`: pregled na 1440 px.
- `issue-13-form-390.png`: mobilni bottom sheet.
- `issue-13-form-1440.png`: desktop modal.

E2E proverava i 360/768 px, prošireni tekst, dno istorije bez prekrivanja poslednjeg
unosa, kao i vidljivost submit dugmeta pri visini viewport-a od 480 px.
Ovo je browser emulacija: fizička softverska tastatura i hardverski safe-area
na iOS/Android telefonu nisu ručno provereni u ovom okruženju. Postupak je u
[setup vodiču](../setup.md#ručna-provera-redizajna-issue-13).
