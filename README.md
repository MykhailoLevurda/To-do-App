# Scrum Board

Webová aplikace pro agilní řízení projektů inspirovaná nástroji jako Jira nebo Trello. Umožňuje týmům plánovat práci pomocí sprintů, sledovat úkoly na Scrum boardu a vyhodnocovat postup v reportech.

**Živá ukázka:** [levtodo.online](https://levtodo.online)

---

## Funkce

### Projekty a týmy
- Vytváření projektů s vlastním názvem a popisem
- Pozvání členů týmu e-mailem (odkaz platný 7 dní, podepsaný HMAC-SHA256)
- Tři úrovně oprávnění: **Owner**, **Admin**, **Member**
- Správa členů — přidávání, odebírání, změna rolí

### Scrum Board
- Kanban board s přetahováním (drag & drop) karet mezi sloupci
- Vlastní stavy sloupců (To Do, In Progress, Done, …)
- Filtrování úkolů podle řešitele, priority, štítku a sprintu
- Schvalování dokončených úkolů

### Úkoly
- Název, popis (Markdown), priorita, termín, story points
- Přiřazení řešitele ze členů týmu
- Štítky (labels) pro kategorizaci
- Checklist (dílčí úkoly)
- Přílohy — nahrávání souborů přímo do Firebase Storage
- Komentáře s real-time aktualizací
- Historie změn (audit log) — kdo, co a kdy změnil

### Sprinty
- Vytváření, editace a mazání sprintů s datem začátku a konce
- Přiřazení úkolů do sprintu
- Zobrazení aktivního sprintu

### Backlog
- Seřazený seznam úkolů mimo aktivní sprint
- Ruční řazení drag & drop
- Přesun úkolů do prvního sloupce boardu

### Reporty
- Celkový postup projektu (donut graf)
- Rozložení úkolů podle priority (sloupcový graf)
- Postup podle projektů
- Vše vykresleno čistým SVG bez externích knihoven

### Notifikace
- Real-time notifikace o čekajících pozvánkách do projektů
- Zvonečkový indikátor s počtem notifikací
- Přijetí / odmítnutí pozvánky přímo z notifikační lišty

### Aktivita
- Přehled nedávných změn v projektu

---

## Technologie

| Vrstva | Technologie |
|--------|-------------|
| Frontend framework | [Nuxt 3](https://nuxt.com) + [Vue 3](https://vuejs.org) (Composition API) |
| UI komponenty | [Nuxt UI](https://ui.nuxt.com) (Tailwind CSS) |
| Ikony | [Heroicons](https://heroicons.com) |
| State management | [Pinia](https://pinia.vuejs.org) + `pinia-plugin-persistedstate` |
| Databáze | [Firebase Firestore](https://firebase.google.com/docs/firestore) |
| Autentizace | [Firebase Authentication](https://firebase.google.com/docs/auth) |
| Úložiště souborů | [Firebase Storage](https://firebase.google.com/docs/storage) |
| Server API | Nuxt server routes (Nitro) + Firebase Admin SDK |
| E-mail | [Resend](https://resend.com) |
| Nasazení | [Vercel](https://vercel.com) |

---

## Rychlý start

### Požadavky

- Node.js 18+
- Firebase projekt (Firestore, Authentication, Storage)
- (volitelně) Resend účet pro odesílání e-mailů

### Instalace

```bash
git clone <repo-url>
cd scrum-board
npm install
```

### Konfigurace

Vytvořte soubor `.env` v kořenu projektu:

```env
# Firebase (klientská strana)
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server – pro přijímání pozvánek)
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json

# URL aplikace – pro odkazy v pozvánkách
NUXT_PUBLIC_APP_URL=http://localhost:3001

# E-mail (volitelné)
RESEND_API_KEY=
RESEND_FROM_EMAIL=Scrum Board <noreply@vasedomena.cz>

# Bezpečnost – tajný klíč pro HMAC podpis pozvánkových tokenů
INVITE_SECRET=your-long-random-secret-here
```

### Spuštění (vývoj)

```bash
npm run dev
```

Aplikace běží na [http://localhost:3000](http://localhost:3000).

---

## Firestore pravidla

Pravidla jsou v souboru `firestore.rules`. Nasazení:

```bash
firebase deploy --only firestore:rules
```

Stručný přehled oprávnění:

- **Projekty** — číst mohou členové a pozvaní (e-mail v `pendingInviteEmails`); mazat jen Owner
- **Úkoly** — číst a vytvářet mohou členové projektu; upravovat a mazat autor úkolu nebo Owner/Admin
- **Sprinty** — čtení a zápis pro členy projektu
- **Komentáře a historie** — přihlášený uživatel může číst; komentář může upravovat/mazat pouze jeho autor

---

## Nasazení na Vercel

Podrobný návod viz [DEPLOY.md](DEPLOY.md).

Stručně:

```bash
npm i -g vercel
vercel --prod
```

V Vercel Dashboard nastavte všechny proměnné z `.env` (místo `FIREBASE_SERVICE_ACCOUNT_PATH` použijte `FIREBASE_SERVICE_ACCOUNT` s celým JSON obsahem service accountu).

---

## Role v projektu

| Role | Popis |
|------|-------|
| **Owner** | Zakladatel projektu. Může smazat projekt, spravovat členy a role. |
| **Admin** | Správce. Může zvát/odebírat členy, upravovat všechny úkoly a sprinty. |
| **Member** | Člen. Může vytvářet a upravovat vlastní úkoly, komentovat. |

Podrobnosti viz [ROLES.md](ROLES.md).

---

## Struktura projektu

```
├── components/          # Vue komponenty (Board, TaskDetailPanel, SprintsView, …)
├── composables/         # Logika (useFirestoreTasks, useSprints, useTeamMembers, …)
├── pages/               # Stránky (index, projects/[id], reporty, users, activity, …)
├── server/api/          # Server API routes (invite, invite/accept, upload)
├── stores/              # Pinia stores (todos, projects)
├── plugins/             # Nuxt pluginy (firebase.client.ts)
├── firestore.rules      # Firestore bezpečnostní pravidla
└── nuxt.config.ts       # Konfigurace Nuxt
```
