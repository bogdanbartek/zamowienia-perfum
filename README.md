# Zamówienia perfum

Aplikacja na Windows do zbierania zamówień perfum od znajomych i składania jednego zamówienia w hurtowni.

## Co umie

- Katalog perfum wczytany z eksportu kanału Telegram (`messages.html`), z wyszukiwarką i filtrami: damskie, męskie, unisex, zestawy, testery, Sospiro promo.
- Osoby z własnymi stawkami za flakon, tester i Sospiro. Dopłaty z katalogu (np. `+25 ZŁ`) doliczają się automatycznie.
- Ręczna cena dla pojedynczej pozycji (przycisk "auto" wraca do stawki osoby).
- Oznaczanie, kto już zapłacił, oraz suma: razem, zapłacone, do odebrania.
- Generator wiadomości do hurtowni w gotowym formacie, z danymi do wysyłki i numerem paczkomatu.
- Przycisk "Aktualizuj katalog": wybierasz nowy eksport `messages.html` i lista się odświeża.

Dane zapisują się lokalnie na komputerze (każdy użytkownik ma swoje osobne dane).

## Uruchomienie z kodu

Wymagany Node.js 20+.

```
npm install
npm start
```

## Zbudowanie exe

**Na Windowsie lokalnie:**

```
npm install
npm run dist
```

Gotowy plik pojawi się w folderze `dist/` jako `Zamowienia-perfum-1.0.0.exe`. To wersja przenośna, nie wymaga instalacji.

**Przez GitHub Actions (bez instalowania niczego):**

1. Wrzuć repozytorium na GitHuba.
2. Zakładka **Actions**, workflow **Build exe**, przycisk **Run workflow**.
3. Po kilku minutach exe jest do pobrania na dole strony uruchomienia, w sekcji **Artifacts**.

Możesz też wypchnąć tag, np. `git tag v1.0.0 && git push --tags`, wtedy exe trafi do zakładki **Releases**.

## Uwaga przy pierwszym uruchomieniu

Exe nie jest podpisane certyfikatem, więc Windows SmartScreen może pokazać ostrzeżenie. Kliknij **Więcej informacji**, potem **Uruchom mimo to**.

## Struktura

```
main.js            okno aplikacji (Electron)
src/index.html     interfejs
src/styles.css     wygląd
src/app.js         logika: osoby, ceny, wiadomość do hurtowni
src/parser.js      odczyt eksportu z Telegrama
src/catalog.js     domyślny katalog
src/fonts/         czcionki (działa offline)
```
