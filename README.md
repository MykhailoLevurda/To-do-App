# Scrum Board

Webová aplikace pro agilní řízení projektů inspirovaná nástroji Jira a Trello. Umožňuje týmům plánovat práci pomocí sprintů, sledovat úkoly na Scrum boardu a vyhodnocovat postup v reportech.

**Živá ukázka:** [levtodo.online](https://levtodo.online)

---

## Obsah

1. [Popis aplikace](#1-popis-aplikace)
2. [Funkce](#2-funkce)
3. [Technologický stack](#3-technologický-stack)
4. [Architektura](#4-architektura)
5. [Datový model](#5-datový-model)
6. [Bezpečnostní model](#6-bezpečnostní-model)
7. [API endpointy](#7-api-endpointy)
8. [Autentizace a správa uživatelů](#8-autentizace-a-správa-uživatelů)
9. [Systém pozvánek](#9-systém-pozvánek)
10. [Real-time synchronizace](#10-real-time-synchronizace)
11. [Architektonická rozhodnutí](#11-architektonická-rozhodnutí)
12. [Struktura projektu](#12-struktura-projektu)
13. [Rychlý start](#13-rychlý-start)
14. [Nasazení](#14-nasazení)
15. [Role v projektu](#15-role-v-projektu)
16. [Srovnání s konkurencí](#16-srovnání-s-konkurencí)
17. [Omezení a možná rozšíření](#17-omezení-a-možná-rozšíření)

---

## 1. Popis aplikace

Scrum Board je full-stack webová aplikace realizovaná jako bakalářská práce. Cílem bylo vytvořit funkční alternativu ke komerčním nástrojům pro agilní řízení projektů, která demonstruje praktické využití moderních webových technologií — konkrétně frameworku Nuxt 3, databáze Firebase Firestore a serverless nasazení na platformě Vercel.

Aplikace podporuje kompletní životní cyklus Scrum metodiky: vytváření projektů, plánování sprintů, správu backlogu, kanbanovou tabuli pro sledování průběhu práce a reporty s grafy velocity a burndown.

---

## 2. Funkce

### Projekty a týmy
- Vytváření projektů z šablon (Kanban, Software/Scrum, Prázdný)
- Pozvání členů týmu e-mailem (odkaz platný 7 dní, podepsaný HMAC-SHA256)
- Tři úrovně oprávnění: **Owner**, **Admin**, **Member**
- Správa členů — přidávání, odebírání, změna rolí
- Archivace a obnova projektů
- Vlastní stavové sloupce tabule (název, barva, pořadí)

### Scrum Board
- Kanban board s přetahováním (drag & drop) karet mezi sloupci
- Filtrování úkolů podle řešitele, priority, štítku a sprintu
- Schvalování dokončených úkolů (Owner/Admin)
- Inline vyhledávání v úkolech

### Úkoly
- Název, popis, priorita (nízká / střední / vysoká), termín splnění, story points
- Přiřazení řešitele ze členů týmu
- Štítky (Bug, Feature, Urgent, Dokumentace, Review)
- Checklist dílčích úkolů s označením hotovo/nehotovo
- Přílohy — nahrávání souborů přímo do Firebase Storage
- Komentáře s možností editace a smazání
- Historie změn (audit log) — kdo, co a kdy změnil

### Sprinty
- Vytváření, editace a mazání sprintů (název, datum zahájení/ukončení, cíl)
- Spuštění sprintu — v projektu může být aktivní pouze jeden sprint najednou
- Uzavření sprintu s volbou přesunu nedokončených úkolů (do backlogu nebo dalšího sprintu)
- Přiřazení úkolů do sprintu

### Backlog
- Seřazený seznam úkolů mimo sprint
- Ruční řazení pomocí drag & drop
- Přesun úkolů do prvního sloupce boardu

### Kalendář
- Zobrazení úkolů podle termínu splnění v měsíčním kalendáři
- Přechod na detail úkolu kliknutím

### Reporty
- Celkový postup projektu (donut graf — hotovo vs. zbývá)
- Rozložení úkolů podle priority (sloupcový graf)
- Postup podle projektů (progress bary)
- **Velocity chart** — sloupcový graf dokončených story points za každý uzavřený sprint včetně průměrné velocity
- **Burndown chart** — ideální průběh sprintu vs. aktuální zbývající story points
- Vše vykresleno čistým SVG bez externích grafových knihoven

### Měření času
- Timer v záhlaví aplikace (spustit/zastavit pro každý projekt)
- Automatické uložení naměřeného času do Firestore
- Přehled aktivity uživatelů na stránce `/activity`

### Online status
- Aktualizace pole `lastSeen` v Firestore každé 3 minuty a při návratu na záložku
- Uživatel je označen jako online pokud byl aktivní v posledních 5 minutách

### Notifikace
- Toast notifikace pro uživatelské akce (úspěch / chyba)
- Upozornění na úkoly s termínem dnes nebo zítra (zvonek v záhlaví)

---

## 3. Technologický stack

### Frontend

| Technologie | Verze | Účel |
|---|---|---|
| [Nuxt 3](https://nuxt.com) | 3.12.2 | Full-stack Vue framework (SSR + Nitro server) |
| [Vue 3](https://vuejs.org) | součást Nuxt | UI framework, Composition API |
| [TypeScript](https://www.typescriptlang.org) | 5.4.5 | Typová bezpečnost, strict mode |
| [Pinia](https://pinia.vuejs.org) | 0.5.1 | Globální state management |
| [Nuxt UI](https://ui.nuxt.com) | 2.15.2 | Komponentová knihovna nad Tailwind CSS |
| [Tailwind CSS](https://tailwindcss.com) | součást Nuxt UI | Utility-first CSS framework |
| [Heroicons](https://heroicons.com) | 2.2.0 | SVG ikonová sada |
| [Axios](https://axios-http.com) | 1.7.2 | HTTP klient pro serverové volání |
| [Marked](https://marked.js.org) | 17.0.0 | Parser Markdown pro popis úkolů |

### Backend a databáze

| Technologie | Verze | Účel |
|---|---|---|
| [Firebase Auth](https://firebase.google.com/docs/auth) | 10.8.0 | Autentizace — email/heslo, Google OAuth |
| [Firestore](https://firebase.google.com/docs/firestore) | 10.8.0 | NoSQL databáze, real-time listenery |
| [Firebase Storage](https://firebase.google.com/docs/storage) | 10.8.0 | Úložiště příloh úkolů |
| [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) | 13.7.0 | Serverová autentizace pro přijímání pozvánek |
| [Resend](https://resend.com) | 6.9.3 | Transakční e-maily (pozvánky do projektů) |
| Nuxt Nitro server | součást Nuxt | Serverové API routes (invite, upload) |

### Nasazení

| Technologie | Účel |
|---|---|
| [Vercel](https://vercel.com) | Serverless hosting, automatické CI/CD z GitHubu |
| Firebase (region eur3) | Databáze a autentizace, evropský multi-region |
| `send.levtodo.online` | Ověřená doména pro Resend |

---

## 4. Architektura

### Přehled vrstev

```
┌─────────────────────────────────────────────────────────────┐
│                    Prohlížeč (klient)                       │
│                                                             │
│  Vue 3 komponenty                                           │
│       ↕                                                     │
│  Composables (useAuth, useFirestoreTasks, useSprints, …)    │
│       ↕                                                     │
│  Pinia stores (projectsStore, scrumBoardStore)              │
│       ↕                                                     │
│  Firebase SDK ──────────────────────→ Firestore (real-time) │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP ($fetch)
          ┌────────────▼────────────┐
          │   Nuxt Nitro Server     │
          │   /api/invite           │
          │   /api/invite/accept    │
          │   /api/upload           │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  Firebase Admin SDK     │  (přijímání pozvánek)
          │  Resend API             │  (odesílání e-mailů)
          │  Firebase Storage       │  (ukládání příloh)
          └─────────────────────────┘
```

### Klíčové komponenty

| Soubor | Popis |
|---|---|
| `layouts/default.vue` | Hlavní layout — sidebar s projekty, header s timerem, zvonek |
| `pages/index.vue` | Dashboard — přehled projektů, vytvoření nového |
| `pages/projects/[id].vue` | Detail projektu — tabule, backlog, kalendář, sprinty |
| `pages/reporty.vue` | Reporty — grafy, velocity, burndown |
| `pages/activity.vue` | Aktivita — čas strávený v projektech |
| `pages/users.vue` | Uživatelé — správa členů, odesílání pozvánek |
| `components/ScrumBoard.vue` | Kanban tabule s drag & drop |
| `components/TaskDetailPanel.vue` | Boční panel s detailem úkolu |
| `components/SprintsView.vue` | Správa sprintů |
| `components/BacklogView.vue` | Backlog s řazením |
| `components/CalendarView.vue` | Kalendář podle termínů |

### Composables (logika oddělená od UI)

| Soubor | Popis |
|---|---|
| `composables/useAuth.ts` | Přihlášení, registrace, správa profilu, aktualizace lastSeen |
| `composables/useFirestoreProjects.ts` | CRUD projektů, real-time listenery, cache |
| `composables/useFirestoreTasks.ts` | CRUD úkolů, komentáře, historie |
| `composables/useSprints.ts` | CRUD sprintů, real-time listener |
| `composables/useTeamMembers.ts` | Správa členů, přijetí pozvánek |
| `composables/useProjectRole.ts` | Výpočet role přihlášeného uživatele v projektu |
| `composables/useProjectTime.ts` | Měření a ukládání času stráveného v projektu |
| `composables/useTaskLabels.ts` | Předdefinované štítky úkolů |
| `composables/useNotifications.ts` | Toast notifikace |
| `composables/useTaskAttachmentUpload.ts` | Nahrávání příloh do Firebase Storage |

---

## 5. Datový model

Databáze je NoSQL (Firestore). Data jsou organizována do pěti hlavních kolekcí.

### Kolekce `projects`

```typescript
{
  name: string                          // Název projektu
  description?: string                  // Popis
  color: string                         // Barva (hex)
  status: 'active' | 'archived'         // Stav projektu
  createdBy: string                     // UID vlastníka
  teamMembers: TeamMember[]             // Členové týmu (bez vlastníka)
  memberRoles: Record<string, 'admin' | 'member'>  // Pro Firestore pravidla
  memberIds: string[]                   // Pro dotaz array-contains
  pendingInviteEmails: string[]         // E-maily čekajících pozvánek
  statuses: ProjectStatus[]             // Vlastní sloupce tabule
  taskCount: number                     // Denormalizovaný počet úkolů
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Vnořený objekt TeamMember
{
  userId: string        // UID nebo 'pending_*' pro nepotvrzenou pozvánku
  email: string
  displayName?: string
  role: 'admin' | 'member'
  addedAt: Timestamp
  addedBy: string       // UID toho, kdo přidal
}

// Vnořený objekt ProjectStatus (vlastní sloupec tabule)
{
  id: string            // Identifikátor stavu (např. 'in-progress')
  title: string         // Zobrazovaný název
  color?: string        // Barva sloupce
  order: number         // Pořadí sloupce
}
```

### Kolekce `tasks`

```typescript
{
  title: string
  description?: string
  status: string            // ID stavu — odpovídá ProjectStatus.id
  priority: 'low' | 'medium' | 'high'
  projectId: string         // Reference na projekt
  sprintId?: string         // Reference na sprint (volitelné)
  assigneeId?: string       // UID řešitele (volitelné)
  assignee?: string         // Jméno řešitele (denormalizováno)
  storyPoints?: number
  dueDate?: Timestamp
  backlogOrder?: number     // Pořadí v backlogu
  labelIds?: string[]       // ID štítků (bug, feature, urgent, …)
  checklist?: { id: string; title: string; done: boolean }[]
  attachmentLinks?: { id: string; name: string; url: string }[]
  approved?: boolean        // Schválení dokončeného úkolu
  createdBy: string         // UID autora
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Podkolekce `tasks/{taskId}/comments`**

```typescript
{
  text: string
  userId: string      // Autor
  author: string      // Jméno (denormalizováno)
  createdAt: Timestamp
}
```

**Podkolekce `tasks/{taskId}/history`** (audit log)

```typescript
{
  action: 'created' | 'updated' | 'approved'
  field?: string      // Upravené pole
  newValue?: string   // Nová hodnota
  userId: string
  userName: string    // Denormalizováno
  timestamp: Timestamp
}
```

### Kolekce `sprints`

```typescript
{
  projectId: string
  name: string
  goal?: string
  status: 'planned' | 'active' | 'closed'
  startDate: Timestamp
  endDate: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Kolekce `users`

ID dokumentu = Firebase Auth UID uživatele.

```typescript
{
  uid: string
  email: string
  displayName: string
  photoURL?: string
  color: string       // Barva avataru (náhodně přiřazena při registraci)
  lastSeen: Timestamp // Aktualizováno každé 3 minuty a při návratu na záložku
  createdAt: Timestamp
}
```

### Kolekce `userProjectTime`

ID dokumentu: složený klíč `{userId}_{projectId}` — zajišťuje unikátnost záznamu.

```typescript
{
  userId: string
  projectId: string
  totalSeconds: number  // Celkový naměřený čas v sekundách
  updatedAt: Timestamp
}
```

### Vztahy mezi kolekcemi

```
users  ←──────────── projects (createdBy, memberIds)
  ↑                       │
  │                       │ 1:N
  │                    tasks (projectId)
  │                       │
  └── tasks (assigneeId)  │ 1:N
                       comments, history (podkolekce)
                          │
projects ←────────── sprints (projectId)
tasks    ←────────── tasks.sprintId
users    ←────────── userProjectTime (userId, projectId)
```

---

## 6. Bezpečnostní model

Bezpečnost je vynucena na dvou úrovních:

1. **Firestore pravidla** (`firestore.rules`) — databázová vrstva, ověřuje každý požadavek na čtení/zápis
2. **UI vrstva** (`useProjectRole.ts`) — skrývá ovládací prvky podle role uživatele

### Firestore pravidla — přehled

| Kolekce | Číst | Vytvořit | Upravit | Smazat |
|---|---|---|---|---|
| `projects` | Členové + pozvaní | Přihlášený | Člen (Owner/Admin pro části) | Pouze Owner |
| `tasks` | Členové projektu | Členové projektu | Owner/Admin nebo autor úkolu | Owner/Admin nebo autor |
| `tasks/comments` | Přihlášený | Přihlášený | Pouze autor | Pouze autor |
| `tasks/history` | Přihlášený | Přihlášený | Zakázáno | Zakázáno |
| `sprints` | Členové projektu | Členové projektu | Členové projektu | Členové projektu |
| `users` | Přihlášený | Přihlášený | Pouze vlastní dokument | Zakázáno |
| `userProjectTime` | Vlastní nebo Owner/Admin | Vlastní | Pouze vlastní | Pouze vlastní |

### Role a oprávnění v UI

| Akce | Member | Admin | Owner |
|---|---|---|---|
| Číst úkoly a sprinty | ✅ | ✅ | ✅ |
| Vytvářet a upravovat úkoly | ✅ | ✅ | ✅ |
| Mazat vlastní úkoly | ✅ | ✅ | ✅ |
| Mazat cizí úkoly | ❌ | ✅ | ✅ |
| Zvát členy | ❌ | ✅ | ✅ |
| Odebírat členy | ❌ | ✅ | ✅ |
| Měnit role | ❌ | ✅ | ✅ |
| Upravovat projekt | ❌ | ✅ | ✅ |
| Smazat projekt | ❌ | ❌ | ✅ |
| Archivovat projekt | ❌ | ❌ | ✅ |

---

## 7. API endpointy

Aplikace používá Nuxt Nitro server pro operace, které vyžadují serverové prostředí (e-mail, Firebase Admin SDK, ukládání souborů).

### `POST /api/invite`

Odešle pozvánku do projektu e-mailem prostřednictvím Resend.

**Tělo požadavku:**
```json
{
  "email": "uzivatel@example.com",
  "projectId": "abc123",
  "projectName": "Můj projekt",
  "invitedBy": "uid-pozivajiciho",
  "invitedByName": "Jan Novák",
  "role": "member"
}
```

**Odpověď (200):**
```json
{
  "success": true,
  "message": "Pozvánka byla odeslána",
  "email": "uzivatel@example.com"
}
```

Token je generován jako `base64url(JSON_payload).HMAC_SHA256_podpis`. Payload obsahuje e-mail, projectId, roli, timestamp vytvoření a datum expirace (7 dní). Podpis zabraňuje manipulaci s tokenem.

---

### `POST /api/invite/accept`

Přijme pozvánku a přidá uživatele do projektu. Používá Firebase Admin SDK, aby mohl obejít Firestore pravidla (klient nemůže sám sebe přidat do cizího projektu).

**Hlavičky:** `Authorization: Bearer {Firebase ID token}`

**Tělo požadavku:**
```json
{ "inviteToken": "eyJ...token..." }
```

**Postup:**
1. Ověří Firebase ID token (totožnost volajícího)
2. Ověří HMAC podpis a expiraci pozvánkového tokenu
3. Nahradí `pending_*` placeholder v `teamMembers` skutečným UID
4. Aktualizuje `memberRoles`, `memberIds`, odstraní e-mail z `pendingInviteEmails`

---

### `POST /api/upload`

Nahraje přílohu úkolu do Firebase Storage.

**Hlavičky:** `Authorization: Bearer {Firebase ID token}`  
**Tělo:** `multipart/form-data` s polem `file` (max 5 MB)

**Odpověď:**
```json
{
  "success": true,
  "url": "https://firebasestorage.googleapis.com/...",
  "name": "dokument.pdf"
}
```

---

## 8. Autentizace a správa uživatelů

Autentizace je zajištěna přes Firebase Authentication.

### Podporované metody přihlášení
- E-mail + heslo (registrace i přihlášení)
- Google OAuth (přihlášení přes Google účet)

### Životní cyklus uživatele

```
Registrace
  → Firebase Auth vytvoří účet
  → ensureUserDocument() vytvoří dokument v Firestore (users/{uid})
  → Uložení: email, displayName, color (náhodná), createdAt, lastSeen

Přihlášení
  → Firebase Auth ověří přihlašovací údaje
  → ensureUserDocument() aktualizuje lastSeen
  → Spustí se real-time listener projektů (useFirestoreProjects)

Aktivní session
  → lastSeen se aktualizuje každé 3 minuty
  → lastSeen se aktualizuje při návratu na záložku (visibilitychange)

Odhlášení
  → Vyčistí se Pinia stores (projekty, úkoly)
  → Vyčistí se localStorage cache
  → Firebase signOut()
```

### Composable `useAuth`

Exportuje: `user`, `isAuthenticated`, `loading`, `signUp`, `signIn`, `signInWithGoogle`, `signOut`, `updateDisplayName`, `changePassword`.

Stav uživatele je uložen v `useState` (Nuxt SSR-kompatibilní sdílený stav), nikoli v Pinia — Firebase User objekt není serializovatelný.

---

## 9. Systém pozvánek

### Kompletní tok pozvánky

```
1. Owner/Admin vyplní e-mail v UI (users.vue nebo TeamMembersRow.vue)
       ↓
2. Klient volá POST /api/invite
       ↓
3. Server vygeneruje HMAC-SHA256 token s payloadem:
   { email, projectId, role, timestamp, expiresAt (7 dní) }
       ↓
4. Resend odešle e-mail s odkazem /invite/{token}
       ↓
5. addTeamMember() přidá člena jako pending_* do Firestore
       ↓
6. Pozvaný klikne na odkaz → stránka /invite/[token].vue
       ↓
7. Token je ověřen (HMAC podpis + expirace)
       ↓
8. Uživatel se přihlásí nebo zaregistruje
       ↓
9. Klient volá POST /api/invite/accept s Firebase ID tokenem
       ↓
10. Firebase Admin SDK nahradí pending_* skutečným UID v projektu
```

### Bezpečnost tokenů

- Podpis: HMAC-SHA256 s tajným klíčem `INVITE_SECRET`
- Porovnání v konstantním čase (ochrana před timing útoky)
- Expirace: 7 dní od vygenerování
- URL-safe Base64 kódování payloadu

---

## 10. Real-time synchronizace

Aplikace využívá Firestore `onSnapshot` listenery pro real-time aktualizace bez nutnosti manuálního obnovování stránky.

### Listenery

| Data | Kde | Trigger |
|---|---|---|
| Projekty uživatele | `useFirestoreProjects.startListening()` | Přihlášení, layout mount |
| Úkoly projektu | `useFirestoreTasks.startListening(projectId?)` | Otevření projektu nebo reportů |
| Sprinty projektu | `useSprints.startListening()` | Otevření záložky Sprinty nebo Reporty |
| Komentáře úkolu | `firestoreTasks.listenComments(taskId)` | Otevření detail panelu úkolu |
| Historie úkolu | `firestoreTasks.listenHistory(taskId)` | Otevření detail panelu úkolu |

### Lokální cache (localStorage)

Pro rychlejší zobrazení při dalším načtení stránky jsou projekty ukládány do `localStorage` pod klíčem `projects-cache`. Cache obsahuje UID uživatele — při přihlášení jiného uživatele je automaticky ignorována.

### Tok dat

```
Firestore (onSnapshot)
    ↓
useFirestoreProjects / useFirestoreTasks
    ↓
Pinia store (projectsStore, scrumBoardStore)
    ↓
Vue komponenty (reaktivní computed properties)
```

---

## 11. Architektonická rozhodnutí

### Firebase místo vlastního backendu

**Rozhodnutí:** Firestore jako primární databáze s real-time listenery namísto vlastního REST API.

**Důvod:** Eliminuje nutnost správy vlastního databázového serveru. Firestore poskytuje real-time synchronizaci, offline podporu a horizontální škálování bez konfigurace. Pro bakalářský projekt výrazně snižuje provozní složitost.

**Kompromis:** Omezená možnost složitých dotazů (Firestore nepodporuje JOIN). Řešeno denormalizací dat (např. `assignee` jméno uloženo přímo v úkolu).

---

### Nuxt Server API pro citlivé operace

**Rozhodnutí:** Tři serverové endpointy (`/api/invite`, `/api/invite/accept`, `/api/upload`) místo přímého volání z klienta.

**Důvod:**
- `/api/invite`: Resend API klíč nesmí být přístupný v klientském kódu
- `/api/invite/accept`: Firebase Admin SDK (service account) nemůže běžet v prohlížeči; navíc Firestore pravidla nedovolí uživateli přidat sám sebe do cizího projektu
- `/api/upload`: Ověření tokenu a kontrola velikosti souboru na serveru

---

### Dva Firestore dotazy pro projekty

**Rozhodnutí:** Projekty se načítají dvěma paralelními dotazy (`createdBy == uid` a `memberIds array-contains uid`) a výsledky se slučují.

**Důvod:** Firestore neumožňuje dotaz `OR` mezi různými poli. Vlastník projektu je uložen v `createdBy` a není v `teamMembers` — proto je potřeba separátní dotaz.

---

### Bez automatické Pinia persistence

**Rozhodnutí:** Pinia persistence je pro `scrumBoardStore` a `projectsStore` vypnuta (`persist: false`).

**Důvod:** Firebase User objekty a Firestore Timestamp objekty nejsou serializovatelné. Místo toho je implementována vlastní cache v localStorage pouze pro projekty (bez Firestore objektů).

---

### HMAC podpis pozvánkových tokenů

**Rozhodnutí:** Pozvánkový token je podepsán HMAC-SHA256, nikoli pouze Base64 kódován.

**Důvod:** Bez podpisu by kdokoli mohl vytvořit vlastní token (např. se změněnou rolí `admin`) a přidat se do libovolného projektu jako administrátor. HMAC s tajným klíčem zabraňuje manipulaci s payloadem.

---

### TypeScript strict mode

**Rozhodnutí:** `typescript: { strict: true }` v `nuxt.config.ts`.

**Důvod:** Vynucuje explicitní typování, eliminuje potenciální runtime chyby způsobené `undefined` nebo nesprávnými typy. Centrální definice typů jsou v `types/index.d.ts`.

---

## 12. Struktura projektu

```
scrum-board/
├── components/
│   ├── ScrumBoard.vue          # Kanban tabule s drag & drop
│   ├── TaskCard.vue            # Karta úkolu na tabuli
│   ├── TaskDetailPanel.vue     # Boční panel — detail, komentáře, historie
│   ├── BacklogView.vue         # Backlog s řazením
│   ├── SprintsView.vue         # Správa sprintů
│   ├── CalendarView.vue        # Kalendář podle termínů
│   ├── Dashboard.vue           # Přehled projektů
│   ├── ProjectCard.vue         # Karta projektu
│   ├── TeamMembersRow.vue      # Správa členů týmu
│   ├── AuthModal.vue           # Přihlášení / registrace
│   ├── NotificationBell.vue    # Zvonek — úkoly s blížícím se termínem
│   └── UserProfileModal.vue    # Nastavení profilu uživatele
│
├── composables/
│   ├── useAuth.ts
│   ├── useFirestoreProjects.ts
│   ├── useFirestoreTasks.ts
│   ├── useSprints.ts
│   ├── useTeamMembers.ts
│   ├── useProjectRole.ts
│   ├── useProjectTime.ts
│   ├── useTaskLabels.ts
│   ├── useNotifications.ts
│   └── useTaskAttachmentUpload.ts
│
├── pages/
│   ├── index.vue               # Dashboard
│   ├── projects/[id].vue       # Detail projektu (tabule, backlog, …)
│   ├── invite/[token].vue      # Přijetí pozvánky
│   ├── activity.vue            # Aktivita a měření času
│   ├── reporty.vue             # Reporty a grafy
│   └── users.vue               # Správa uživatelů
│
├── server/
│   ├── api/
│   │   ├── invite.post.ts      # Odeslání pozvánky (Resend)
│   │   ├── invite/
│   │   │   └── accept.post.ts  # Přijetí pozvánky (Firebase Admin)
│   │   └── upload.post.ts      # Nahrání přílohy (Firebase Storage)
│   └── utils/
│       └── firebase-admin.ts   # Inicializace Firebase Admin SDK
│
├── stores/
│   ├── projects.ts             # Pinia store pro projekty
│   └── todos.ts                # Pinia store pro úkoly (ScrumBoardStore)
│
├── plugins/
│   ├── firebase.client.ts      # Inicializace Firebase Auth + Firestore
│   └── persistedState.client.ts
│
├── layouts/
│   └── default.vue             # Sidebar, header, timer, notifikace
│
├── types/
│   └── index.d.ts              # Globální TypeScript typy
│
├── firestore.rules             # Firestore bezpečnostní pravidla
├── firestore.indexes.json      # Složené indexy pro Firestore dotazy
├── storage.rules               # Firebase Storage pravidla
├── firebase.json               # Firebase CLI konfigurace
├── vercel.json                 # Vercel build konfigurace
├── nuxt.config.ts              # Konfigurace Nuxt 3
└── package.json
```

---

## 13. Rychlý start

### Požadavky

- Node.js 18+
- Firebase projekt s povoleným Firestore, Authentication a Storage
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

# Firebase Admin SDK (server — pro přijímání pozvánek)
# Lokálně: cesta k souboru JSON
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json
# Na Vercelu: celý JSON jako string
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# URL aplikace (pro odkazy v pozvánkových e-mailech)
NUXT_PUBLIC_APP_URL=http://localhost:3000

# E-mail — Resend (volitelné; bez klíče se použije demo režim)
RESEND_API_KEY=
RESEND_FROM_EMAIL=Scrum Board <noreply@vasedomena.cz>

# Tajný klíč pro HMAC podpis pozvánkových tokenů
INVITE_SECRET=nahodny-dlouhy-retezec-minimalne-32-znaku
```

### Spuštění (vývoj)

```bash
npm run dev
```

Aplikace běží na [http://localhost:3000](http://localhost:3000).

### Nasazení Firestore pravidel

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 14. Nasazení

Podrobný návod viz [DEPLOY.md](DEPLOY.md).

### Vercel

```bash
npm i -g vercel
vercel --prod
```

V Vercel Dashboard (Settings → Environment Variables) nastavte všechny proměnné z `.env`. Místo `FIREBASE_SERVICE_ACCOUNT_PATH` použijte `FIREBASE_SERVICE_ACCOUNT` s celým obsahem JSON souboru service accountu jako string.

### Automatické CI/CD

Každý push na větev `master` automaticky spustí nový deployment na Vercelu (pokud je repozitář propojený přes GitHub integrace).

---

## 15. Role v projektu

| Role | Jak vznikne | Oprávnění |
|---|---|---|
| **Owner** | Zakladatel projektu (`createdBy`) | Vše — smazání projektu, správa členů, schvalování úkolů |
| **Admin** | Přiřazena Owner nebo jiným Adminem | Zvát/odebírat členy, měnit role, upravovat všechny úkoly a sprinty |
| **Member** | Výchozí role při přijetí pozvánky | Číst vše, vytvářet a upravovat vlastní úkoly, komentovat |

Podrobnosti viz [ROLES.md](ROLES.md).

---

## 16. Srovnání s konkurencí

| Funkce | Scrum Board | Trello | Jira |
|---|---|---|---|
| Kanban tabule | ✅ | ✅ | ✅ |
| Vlastní sloupce | ✅ | ✅ | ✅ |
| Šablony projektů | ✅ | ✅ | ✅ |
| Sprinty | ✅ | ❌ | ✅ |
| Backlog s řazením | ✅ | ❌ | ✅ |
| Dílčí úkoly (checklist) | ✅ | ✅ | ✅ |
| Přiřazení řešitele | ✅ | ✅ | ✅ |
| Štítky úkolů | ✅ | ✅ | ✅ |
| Termíny splnění | ✅ | ✅ | ✅ |
| Story points | ✅ | ❌ | ✅ |
| Přílohy souborů | ✅ | ✅ | ✅ |
| Komentáře | ✅ | ✅ | ✅ |
| Historie změn (audit log) | ✅ | ❌ | ✅ |
| Kalendářový pohled | ✅ | ❌ | ✅ (placená verze) |
| Pozvánky e-mailem | ✅ | ✅ | ✅ |
| Role (owner/admin/member) | ✅ | ✅ | ✅ |
| Měření času | ✅ | ❌ | ✅ |
| Online status uživatelů | ✅ | ❌ | ❌ |
| Velocity chart | ✅ | ❌ | ✅ |
| Burndown chart | ✅ | ❌ | ✅ |
| Real-time synchronizace | ✅ | ✅ | ✅ |
| Burndown/velocity | ✅ | ❌ | ✅ |
| Typy úkolů (Epic/Story/Bug) | ❌ | ❌ | ✅ |
| Automatizační pravidla | ❌ | ✅ (Butler) | ✅ |
| Integrace (Slack, GitHub…) | ❌ | ✅ | ✅ |
| Offline podpora | ❌ | ✅ | ✅ |

---

## 17. Omezení a možná rozšíření

### Stávající omezení

- **Typy úkolů:** Aplikace nerozlišuje Epiky, Příběhy, Bugy a Úkoly — vše je generický úkol
- **Automatizace:** Chybí automatizační pravidla (např. přesun úkolu po splnění podmínky)
- **Integrace:** Žádné napojení na GitHub, GitLab, Slack nebo jiné nástroje
- **Burndown — historická data:** Burndown zobrazuje pouze aktuální stav vs. ideál; denní historii (kdy byl každý úkol dokončen) nesledujeme
- **Offline:** Aplikace vyžaduje připojení k internetu; Firestore offline persistence není aktivována
- **Jedno databázové umístění:** Firestore v regionu `eur3` — pro globální nasazení by bylo potřeba multi-region strategie

### Možná budoucí rozšíření

- Typy úkolů (Epik → Příběh → Úkol) s hierarchií
- Detailní burndown s historií (sledovat timestamp změny stavu každého úkolu)
- Automatizační pravidla (trigger → akce)
- WebSocket pro kolaborativní editaci v reálném čase (kdo právě edituje úkol)
- Integrace s GitHub (propojení commitů a větví s úkoly)
- Mobilní aplikace (Capacitor)
- Export reportů do PDF / CSV
- Notifikace e-mailem při blížícím se termínu úkolu
