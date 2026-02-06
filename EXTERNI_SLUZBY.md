# Externí služby a princip fungování aplikace

Aplikace Scrum Board používá **pouze Firebase** pro přihlašování, projekty a úkoly.

---

## Instalace a spuštění

### Požadavky

- **Node.js** v22 nebo vyšší
- **npm**
- **Git**

### Instalace

1. Naklonujte repozitář a nainstalujte závislosti:
   ```bash
   git clone <url-repozitare>
   cd scrum-board
   npm install
   ```

2. Vytvořte soubor `.env` a nastavte **Firebase** konfiguraci (povinné):
   ```env
   NUXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NUXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

3. Spusťte vývojový server:
   ```bash
   npm run dev
   ```
   Aplikace běží na `http://localhost:3000`.

---

## Firebase

- **Authentication:** přihlášení e-mailem/heslem nebo Google účtem.
- **Firestore:** ukládání projektů, úkolů, uživatelů a členů týmů.

### Kolekce ve Firestore

- **users** – profily uživatelů (uid z Firebase Auth)
- **projects** – projekty (pole `createdBy` = uid vlastníka)
- **tasks** – úkoly (pole `projectId`, `createdBy`)

Pravidla přístupu jsou v souboru `firestore.rules`.

---

## Pozvánky

Endpoint `/api/invite` (POST) slouží k odeslání pozvánky do týmu (email). V produkci je potřeba doplnit skutečné odeslání e-mailu (např. SendGrid, Resend).
