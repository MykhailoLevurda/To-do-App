# Externí služby

Tento dokument popisuje všechny externí služby používané v projektu a jak je nastavit a používat.

## Freelo API

Freelo API je hlavní externí služba pro načítání projektů a úkolů z Freelo aplikace.

### Co se používá

- **Freelo API** - načítání projektů a úkolů z Freelo účtu
- **HTTP Basic Authentication** - autentizace pomocí emailu a API klíče

### Konfigurace

Freelo API podporuje dva způsoby autentizace:

1. **Interaktivní přihlášení** (doporučeno pro produkci)
   - Uživatel zadá email a API klíč při přihlášení
   - Credentials se ukládají do sessionStorage

2. **Automatické přihlášení z .env** (pro vývoj, volitelné)
   - Můžete nastavit credentials v `.env` souboru pro automatické přihlášení
   - Užitečné pro vývoj, aby se nemuselo pokaždé přihlašovat

Pro automatické přihlášení přidejte do `.env`:
```env
NUXT_PUBLIC_FREELO_EMAIL=vas@email.com
NUXT_PUBLIC_FREELO_API_KEY=vash-api-klic
```

⚠️ **DŮLEŽITÉ:** 
- Nikdy necommitněte `.env` soubor s API klíčem do Git repozitáře
- `.env` soubor je v `.gitignore` a neměl by být commitnut
- Pro produkci používejte interaktivní přihlášení (bez .env)

### Jak získat Freelo API klíč

1. Přejděte na [Freelo aplikaci](https://app.freelo.io/)
2. Přihlaste se do svého účtu
3. Přejděte na **Profil** → **Nastavení** (https://app.freelo.io/profil/nastaveni)
4. Najděte sekci **API klíč**
5. Zkopírujte svůj API klíč

### Jak se přihlásit

1. V aplikaci klikněte na tlačítko **Přihlásit se**
2. Zadejte svůj **Freelo email** (stejný, jaký používáte pro přihlášení do Freelo)
3. Zadejte svůj **API klíč** (získaný z nastavení Freelo)
4. Klikněte na **Přihlásit se**

### Co se načítá z Freelo

- **Projekty** - všechny aktivní projekty z vašeho Freelo účtu
- **Úkoly** - všechny úkoly z projektů
- **Uživatelé** - informace o členech týmu

### Omezení

V současné verzi aplikace:
- Projekty a úkoly se **pouze načítají** z Freelo (read-only)
- Vytváření, úprava a mazání projektů/úkolů je dostupné pouze v Freelo aplikaci
- Pro plnou správu projektů a úkolů použijte Freelo aplikaci

### API Endpointy

Aplikace používá tyto Freelo API endpointy:
- Base URL: `https://api2.freelo.io/v1/` (pro vývoj, `api2` místo `api` kvůli CORS)
- `GET /projects` - načtení vlastních aktivních projektů
- `GET /all-projects` - načtení všech projektů (s paginací)
- `GET /all-tasks` - načtení všech úkolů s filtrováním
- `GET /project/{project_id}/tasklist/{tasklist_id}/tasks` - načtení úkolů z konkrétního tasklistu

**Poznámka:** 
- Aplikace používá `api2.freelo.io` místo `api.freelo.io`, protože `api.freelo.io` je pouze pro produkci
- Aplikace používá **server-side proxy** (`/api/freelo/[...path]`) pro volání Freelo API, což řeší CORS problém
- Všechny požadavky na Freelo API procházejí přes Nuxt server, kde není CORS omezení

### Rate Limiting

Freelo API má limit **25 požadavků za minutu**. Pokud limit překročíte, obdržíte chybu 429 a musíte počkat 60 sekund.

### Dokumentace

Kompletní dokumentace Freelo API je k dispozici v souboru `freelo-apib.md` v projektu.

---

## Firebase

Firebase je hlavní externí služba používaná v projektu pro autentizaci uživatelů a ukládání dat.

### Co se používá

- **Firebase Authentication** - přihlášení uživatelů (email/heslo, Google OAuth)
- **Cloud Firestore** - NoSQL databáze pro ukládání projektů, úkolů, uživatelů
- **Firebase Storage** - ukládání souborů (konfigurováno, ale zatím nevyužíváno)

### Konfigurace

Firebase se konfiguruje pomocí environment proměnných v souboru `.env`:

```env
NUXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NUXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Jak získat Firebase konfiguraci

1. Přejděte na [Firebase Console](https://console.firebase.google.com/)
2. Vyberte nebo vytvořte projekt
3. Přejděte na **Project Settings** (⚙️ ikona vedle Project Overview)
4. V sekci **Your apps** klikněte na ikonu webu (`</>`) nebo přidejte novou webovou aplikaci
5. Zkopírujte hodnoty z Firebase SDK konfigurace:
   - `apiKey` → `NUXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `NUXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `NUXT_PUBLIC_FIREBASE_APP_ID`

### Nastavení Authentication

1. V Firebase Console přejděte na **Authentication** → **Sign-in method**
2. Povolte **Email/Password** provider
3. Pro Google OAuth povolte **Google** provider a nastavte OAuth consent screen

### Nastavení Firestore

1. V Firebase Console přejděte na **Firestore Database**
2. Vytvořte databázi (pokud ještě neexistuje)
3. Vyberte režim: **Production mode** nebo **Test mode** (pro vývoj)
4. Vyberte lokaci (např. `eur3` pro Evropu)

### Nasazení Firestore pravidel

Pravidla pro Firestore jsou definována v souboru `firestore.rules`. Pro nasazení pravidel použijte:

```bash
firebase deploy --only firestore:rules
```

### Nasazení Firestore indexů

Indexy jsou definovány v souboru `firestore.indexes.json`. Pro nasazení indexů použijte:

```bash
firebase deploy --only firestore:indexes
```

Nebo použijte npm script:

```bash
npm run firebase:indexes
```

### Struktura dat v Firestore

#### Kolekce: `users`
- `uid` - ID uživatele (stejné jako Firebase Auth UID)
- `email` - email uživatele
- `displayName` - zobrazované jméno
- `photoURL` - URL profilového obrázku
- `color` - barva uživatele pro UI
- `createdAt` - timestamp vytvoření
- `lastSeen` - timestamp poslední aktivity

#### Kolekce: `projects`
- `name` - název projektu
- `description` - popis projektu
- `color` - barva projektu
- `createdBy` - UID uživatele, který projekt vytvořil
- `status` - stav projektu (`active`, `archived`)
- `taskCount` - počet úkolů v projektu
- `teamMembers` - pole členů týmu
  - `userId` - UID člena
  - `email` - email člena
  - `displayName` - jméno člena
  - `addedAt` - timestamp přidání
  - `addedBy` - UID uživatele, který člena přidal
- `createdAt` - timestamp vytvoření
- `updatedAt` - timestamp poslední aktualizace

#### Kolekce: `tasks`
- `title` - název úkolu
- `description` - popis úkolu
- `status` - stav úkolu (`todo`, `in-progress`, `done`)
- `projectId` - ID projektu
- `createdBy` - UID uživatele, který úkol vytvořil
- `assignedTo` - UID přiřazeného uživatele (volitelné)
- `priority` - priorita (`low`, `medium`, `high`)
- `dueDate` - datum dokončení (volitelné)
- `createdAt` - timestamp vytvoření
- `updatedAt` - timestamp poslední aktualizace

### Bezpečnostní pravidla

Pravidla jsou definována v `firestore.rules`:

- **Tasks**: Uživatelé mohou číst všechny úkoly, vytvářet nové, upravovat/mazat pouze své vlastní
- **Users**: Uživatelé mohou číst všechny uživatele, upravovat pouze svůj vlastní profil
- **Boards**: Uživatelé mohou číst všechny boardy, vytvářet nové, upravovat/mazat pouze ty, kde jsou členy
- **Projects**: Uživatelé mohou číst všechny projekty, vytvářet nové, upravovat/mazat pouze své vlastní

---

## Email služby (připraveno, ale zatím neimplementováno)

Pro odesílání emailů (např. pozvánky do týmu) je připravena integrace s různými email službami. V současné době je implementace v demo režimu.

### Podporované služby

Projekt je připraven pro integraci s těmito službami:

- **SendGrid** - https://sendgrid.com/
- **Mailgun** - https://www.mailgun.com/
- **AWS SES** - https://aws.amazon.com/ses/
- **Resend** - https://resend.com/

### Implementace

Email služba se implementuje v souboru `server/api/invite.post.ts`. Aktuálně je kód v demo režimu a pouze loguje email místo odeslání.

### Jak implementovat email službu

1. Zaregistrujte se u vybrané email služby
2. Získejte API klíč
3. Přidejte API klíč do `.env`:
   ```env
   EMAIL_API_KEY=your-api-key
   EMAIL_FROM=noreply@yourdomain.com
   ```
4. Nainstalujte příslušný npm balíček:
   ```bash
   # Pro SendGrid
   npm install @sendgrid/mail
   
   # Pro Mailgun
   npm install mailgun.js
   
   # Pro AWS SES
   npm install @aws-sdk/client-ses
   
   # Pro Resend
   npm install resend
   ```
5. Odkomentujte a upravte kód v `server/api/invite.post.ts` (řádky 79-95)

### Příklad implementace s Resend

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.EMAIL_API_KEY);

try {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
    to: email,
    subject: emailSubject,
    html: emailBody.replace(/\n/g, '<br>')
  });
  console.log('[Invite API] Email sent successfully to:', email);
} catch (emailError: any) {
  console.error('[Invite API] Email sending failed:', emailError);
  setResponseStatus(event, 500);
  return {
    success: false,
    error: 'Chyba při odesílání emailu: ' + emailError.message
  };
}
```

---

## WebSocket server

Projekt obsahuje vlastní WebSocket server pro real-time komunikaci. Server běží na portu 3002 (vývoj) nebo podle konfigurace.

### Konfigurace

WebSocket server se konfiguruje pomocí environment proměnných:

```env
NUXT_PUBLIC_WS_URL=ws://localhost:3002
NUXT_PUBLIC_WS_ENABLED=true
```

### Spuštění

Pro vývoj můžete spustit WebSocket server samostatně:

```bash
npm run dev:ws
```

Nebo spustit vše najednou (Nuxt + WebSocket):

```bash
npm run dev:all
```

### Použití

WebSocket server je implementován v `server/websocket.ts` a klient v `plugins/ws.client.ts`. V současné době je připraven pro real-time aktualizace, ale může být rozšířen podle potřeby.

---

## Další konfigurace

### Aplikace URL

Pro generování odkazů (např. pozvánky) se používá:

```env
NUXT_PUBLIC_APP_URL=https://yourdomain.com
NUXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Pokud není nastaveno, použije se výchozí hodnota `http://localhost:3001`.

### API Base URL

```env
NUXT_PUBLIC_API_BASE=/api
```

### Název aplikace

```env
NUXT_PUBLIC_APP_NAME=Scrum Board
```

---

## Bezpečnostní poznámky

⚠️ **DŮLEŽITÉ:**

1. **Nikdy necommitněte `.env` soubor** - je v `.gitignore`
2. **Firebase API klíče jsou veřejné** - to je v pořádku, ale mějte správně nastavená Firestore pravidla
3. **Email API klíče jsou soukromé** - nikdy je nezveřejňujte
4. **Používejte environment proměnné** pro všechny citlivé údaje
5. **V produkci použijte HTTPS** pro všechny externí komunikace

---

## Troubleshooting

### Firebase nefunguje

1. Zkontrolujte, zda jsou všechny Firebase proměnné nastaveny v `.env`
2. Ověřte, že Firebase projekt existuje a je aktivní
3. Zkontrolujte Firestore pravidla - možná blokují operace
4. Ověřte, že Authentication je správně nastaveno v Firebase Console

### Chyba s oprávněními v Firestore

1. Zkontrolujte `firestore.rules` - možná chybí pravidlo pro danou kolekci
2. Ověřte, že uživatel je přihlášen (`request.auth != null`)
3. Zkontrolujte, zda uživatel má správná oprávnění podle pravidel
4. Nasajte pravidla: `firebase deploy --only firestore:rules`

### Email se neodesílá

1. V současné době je email v demo režimu - implementujte skutečnou email službu
2. Zkontrolujte, zda je API klíč správně nastaven
3. Ověřte, zda má email služba správně nastavený odesílatel (from address)

