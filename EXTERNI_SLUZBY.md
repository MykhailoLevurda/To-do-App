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

   # Resend – odesílání pozvánkových emailů
   RESEND_API_KEY=re_xxxxxxxxx
   # Odesílatel – používejte ověřenou doménu (např. send.levtodo.online)
   RESEND_FROM_EMAIL=Scrum Board <noreply@send.levtodo.online>
   # URL aplikace pro odkazy v pozvánkách
   NUXT_PUBLIC_APP_URL=https://levtodo.online
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

## Pozvánky (Model A – pozvánka přímo do projektu)

Endpoint `/api/invite` (POST) slouží k odeslání pozvánky do **konkrétního projektu**. Pro skutečné odeslání je použita služba **Resend**. Nastavte v `.env` proměnnou `RESEND_API_KEY` (získejte klíč na [resend.com](https://resend.com)). Bez nastaveného klíče běží demo režim (logování místo odeslání).

**Konfigurace pro send.levtodo.online:**
- Doména `send.levtodo.online` je nastavena v Resend (DKIM, SPF, MX v Forpsi)
- Do `.env` přidejte: `RESEND_FROM_EMAIL=Scrum Board <noreply@send.levtodo.online>`
- Po ověření DNS v Resend (status „Pending“ → „Verified“) bude odesílání na libovolné adresy fungovat

**Flow:** Owner/Admin projektu přidá člena emailem → odešle se pozvánka → pozvaný klikne na odkaz, přihlásí se → přijme pozvánku a stane se členem projektu.

**Firebase Service Account (pro přijímání pozvánek):** Endpoint `/api/invite/accept` používá Firebase Admin. Dva způsoby konfigurace:

1. **Soubor (doporučeno):** Stáhněte JSON z Firebase Console (Service accounts → Generate new private key). Uložte jako `firebase-service-account.json` do kořene projektu. Do `.env` přidejte:
   ```
   FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json
   ```
2. **Proměnná:** Do `.env` přidejte `FIREBASE_SERVICE_ACCOUNT` s celým JSON (v jednoduchých uvozovkách). V produkci (Vercel) přidejte jako Environment Variable.

**Nasadit aplikaci pro funkční odkazy v pozvánkách:**
- Odkazy v emailech vedou na `NUXT_PUBLIC_APP_URL` (např. `https://levtodo.online`)
- Bez nasazení na veřejnou doménu vedou odkazy na localhost a nefungují
- Nasazení: Vercel, Netlify, Firebase Hosting, Cloudflare Pages nebo VPS (např. Forpsi)
- Po nasazení nastavte v produkci `NUXT_PUBLIC_APP_URL` na skutečnou URL aplikace
