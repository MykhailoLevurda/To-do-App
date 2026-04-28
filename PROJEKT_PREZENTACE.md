# Scrum Board — Dokumentace projektu pro bakalářskou práci

## 1. Stručný popis projektu

**Scrum Board** je webová aplikace pro správu projektů a úkolů ve stylu kanbanové tabule s podporou Scrum metodiky. Slouží týmům ke sledování úkolů, plánování sprintů, přidělování rolí a spolupráci v reálném čase. Jde o full-stack aplikaci postavená na moderním JavaScriptovém stacku a nasazená jako serverless aplikace do cloudu.

Aplikace je přístupná na adrese **levtodo.online**.

---

## 2. Cíl a motivace

Cílem práce bylo vytvořit funkční alternativu ke komerčním nástrojům jako Trello nebo Jira — odlehčenou, ale plně funkční platformu vhodnou pro malé a střední vývojové týmy. Projekt demonstruje schopnost implementovat:

- real-time kolaboraci více uživatelů
- bezpečnostní model s rolemi a oprávněními
- moderní frontend architekturou (Vue 3 Composition API, TypeScript, Pinia)
- serverless deployment a backend integraci (Firebase, Vercel)

---

## 3. Technologický stack

### Frontend
| Technologie | Verze | Účel |
|---|---|---|
| **Nuxt 3** | 3.12.2 | Full-stack Vue framework (SSR + Nitro server) |
| **Vue 3** | (součást Nuxt) | UI framework, Composition API |
| **TypeScript** | 5.4.5 | Typová bezpečnost |
| **Pinia** | 0.5.1 | State management |
| **Nuxt UI** | 2.15.2 | Komponentová knihovna (Tailwind CSS) |
| **Tailwind CSS** | (součást Nuxt UI) | Utility-first CSS |
| **Heroicons** | 2.2.0 | SVG ikony |
| **Axios** | 1.7.2 | HTTP klient |

### Backend a databáze
| Technologie | Verze | Účel |
|---|---|---|
| **Firebase Auth** | 10.8.0 | Autentizace (email/heslo + Google OAuth) |
| **Firestore** | 10.8.0 | NoSQL databáze, real-time listenery |
| **Firebase Admin SDK** | 13.7.0 | Serverová autentizace (přijímání pozvánek) |
| **Resend** | 6.9.3 | E-mailová služba (pozvánky do projektu) |
| **ws** | 8.16.0 | WebSocket knihovna (připraveno, neimplementováno) |

### Nasazení
| Technologie | Účel |
|---|---|
| **Vercel** | Serverless hosting (CI/CD z GitHubu) |
| **Firebase (eur3)** | Databáze, hostování pravidel Firestore |
| **Resend / send.levtodo.online** | Ověřená e-mailová doména |

---

## 4. Architektura aplikace

```
┌────────────────────────────────────────────────────────┐
│                   Klient (prohlížeč)                   │
│  Vue 3 + Nuxt 3 + TypeScript + Pinia                  │
│  Komponenty → Composables → Pinia Store               │
└────────────────┬───────────────────────────────────────┘
                 │ HTTP / WebSocket
      ┌──────────▼──────────────┐
      │  Nuxt Nitro Server API  │
      │  /api/invite            │
      │  /api/invite/accept     │
      │  /api/upload            │
      └──────────┬──────────────┘
                 │
      ┌──────────▼──────────────┐
      │       Firebase          │
      │  Firestore (databáze)  │
      │  Firebase Auth          │
      │  Firebase Admin SDK     │
      └─────────────────────────┘
```

### Klíčová architektonická rozhodnutí

1. **Firebase jako hlavní backend** — eliminuje nutnost vlastního databázového serveru; Firestore zajišťuje real-time synchronizaci.
2. **Nuxt Server API pro citlivé operace** — přijímání pozvánek (Firebase Admin), odesílání e-mailů (Resend), nahrávání souborů na disk.
3. **Role-based access control** — vlastník, admin, člen; vynuceno jak v Firestore pravidlech, tak v UI.
4. **Real-time listenery + lokální cache** — `onSnapshot` pro živou synchronizaci; localStorage jako záloha při výpadku.
5. **Serverless deployment (Vercel)** — automatické nasazení z main větve, Nitro server jako serverless funkce.
6. **TypeScript strict mode** — veškeré typy definovány centrálně v `types/index.d.ts`.

---

## 5. Struktura projektu

```
scrum-board/
├── pages/                    # Stránky (Nuxt automatické routování)
│   ├── index.vue             # Dashboard (přehled projektů)
│   ├── projects/[id].vue     # Detail projektu (tabule, backlog, …)
│   ├── invite/[token].vue    # Přijmutí pozvánky
│   ├── activity.vue          # Aktivita týmu a měření času
│   ├── reporty.vue           # Analytika a přehledy
│   └── users.vue             # Správa uživatelů
│
├── components/               # Znovupoužitelné Vue komponenty
│   ├── ScrumBoard.vue        # Hlavní kanbanová tabule
│   ├── TaskCard.vue          # Karta úkolu na tabuli
│   ├── TaskDetailPanel.vue   # Boční panel s detailem úkolu
│   ├── BacklogView.vue       # Pohled backlog
│   ├── SprintsView.vue       # Plánování sprintů
│   ├── CalendarView.vue      # Kalendářový pohled
│   ├── Dashboard.vue         # Přehled projektů
│   ├── AuthModal.vue         # Přihlášení / registrace
│   ├── ProjectCard.vue       # Karta projektu
│   ├── TeamMembersRow.vue    # Správa členů týmu
│   ├── NotificationBell.vue  # Upozornění na splatné úkoly
│   └── UserProfileModal.vue  # Nastavení uživatele
│
├── composables/              # Vue composition functions (logika)
│   ├── useAuth.ts            # Autentizace
│   ├── useFirestoreProjects.ts  # CRUD projektů + real-time sync
│   ├── useFirestoreTasks.ts  # CRUD úkolů + real-time sync
│   ├── useSprints.ts         # Správa sprintů
│   ├── useTeamMembers.ts     # Tým a pozvánky
│   ├── useProjectTime.ts     # Měření času
│   ├── useProjectRole.ts     # Role a oprávnění
│   ├── useTaskLabels.ts      # Štítky úkolů
│   ├── useNotifications.ts   # Toast notifikace
│   └── useTaskAttachmentUpload.ts  # Nahrávání souborů
│
├── stores/                   # Pinia store (globální stav)
│   ├── projects.ts           # Stav projektů
│   └── todos.ts              # Stav úkolů (ScrumBoardStore)
│
├── server/                   # Nuxt server API (backend)
│   ├── api/invite.post.ts    # Odeslání pozvánky (Resend)
│   ├── api/invite/accept.post.ts  # Přijmutí pozvánky (Firebase Admin)
│   └── api/upload.post.ts    # Nahrání přílohy na disk
│
├── types/index.d.ts          # TypeScript typy (Project, Sprint, …)
├── layouts/default.vue       # Hlavní layout (sidebar, header)
├── nuxt.config.ts            # Konfigurace Nuxt
├── firestore.rules           # Bezpečnostní pravidla Firestore
└── vercel.json               # Konfigurace nasazení
```

---

## 6. Datový model (Firestore)

### Kolekce `projects`
```typescript
{
  name: string
  description: string
  color: string
  createdBy: string            // UID vlastníka
  teamMembers: string[]        // UID členů (ne vlastníka)
  memberRoles: Record<string, 'admin' | 'member'>
  memberIds: string[]          // createdBy + teamMembers (pro Firestore query)
  statuses: { name, color, order }[]  // vlastní sloupce tabule
  pendingInviteEmails: string[]
  status: 'active' | 'archived'
  taskCount: number
  createdAt, updatedAt: Timestamp
}
```

### Kolekce `tasks`
```typescript
{
  title: string
  description: string
  status: string               // odpovídá project.statuses[].name
  priority: 'low' | 'medium' | 'high'
  assigneeId: string | null
  dueDate: string | null
  storyPoints: number
  projectId: string
  sprintId: string | null
  backlogOrder: number
  checklist: { text, done }[]  // dílčí úkoly
  attachmentLinks: string[]    // URL souborů na serveru
  labelIds: string[]
  createdBy: string
  createdAt, updatedAt: Timestamp
}
```

### Kolekce `sprints`
```typescript
{
  projectId: string
  name: string
  startDate: string
  endDate: string
  status: 'planned' | 'active' | 'closed'
  goal: string
  createdAt, updatedAt: Timestamp
}
```

### Kolekce `userProjectTime`
```typescript
// ID dokumentu: "{userId}_{projectId}"
{
  userId: string
  projectId: string
  totalSeconds: number
  updatedAt: Timestamp
}
```

---

## 7. Bezpečnostní model

### Firestore pravidla
- **Úkoly:** čtení/zápis pouze pro členy projektu; mazání jen vlastník/admin nebo autor úkolu
- **Projekty:** čtení pro všechny členy; mazání pouze vlastník
- **Sprints:** stejná pravidla jako úkoly
- **Čas uživatele:** čte vlastní nebo vlastník/admin projektu; píše jen sám uživatel
- **Uživatelé:** čtení/zápis pouze vlastního dokumentu

### Role v projektu
| Role | Oprávnění |
|---|---|
| **Vlastník (Owner)** | Vše — smazání projektu, správa členů, úprava tabule |
| **Admin** | Pozvání/odebrání členů, správa úkolů a sprintů |
| **Člen (Member)** | Čtení, vytváření a úprava úkolů; bez správy členů |

### Systém pozvánek
1. Vlastník/Admin zadá e-mail → `POST /api/invite` odešle e-mail přes Resend
2. E-mail obsahuje odkaz s Base64URL tokenem (platnost 7 dní, obsahuje projectId, roli, e-mail)
3. Pozvaný uživatel klikne na odkaz, přihlásí se a přijme pozvánku → `POST /api/invite/accept`
4. Firebase Admin SDK přidá uživatele do projektu (obchází Firestore pravidla)

---

## 8. Implementované funkce

### Autentizace
- Registrace a přihlášení e-mailem + heslem
- Přihlášení přes Google OAuth
- Změna zobrazovaného jména a hesla
- Automatické vytvoření profilu v Firestore

### Správa projektů
- Vytvoření projektu ze šablony (Kanban, Software/Scrum, Prázdný)
- Úprava názvu, popisu, barvy projektu
- Archivace / obnova projektu
- Smazání projektu (pouze vlastník)
- Vlastní stavové sloupce tabule

### Správa úkolů
- Vytvoření, úprava, smazání úkolu
- Priority: nízká / střední / vysoká
- Přiřazení člena týmu (assignee)
- Termín splnění (due date) a story points
- Drag & drop mezi sloupci tabule
- Dílčí úkoly (checklist)
- Přílohy (nahrání souboru na server)
- Backlog s řazením

### Pohledy na projekt
| Záložka | Popis |
|---|---|
| **Tabule (Board)** | Kanbanové sloupce, drag & drop úkolů |
| **Backlog** | Všechny neplánované úkoly seřazené podle priority |
| **Kalendář** | Úkoly zobrazené na kalendáři podle termínu |
| **Sprinty** | Plánování a řízení sprintů |

### Sprinty
- Vytvoření sprintu (název, datum zahájení/ukončení, cíl)
- Přiřazení úkolů do sprintu
- Spuštění sprintu (jen jeden aktivní najednou)
- Uzavření sprintu

### Tým a spolupráce
- Pozvání členů e-mailem
- Odebrání členů
- Změna role (admin ↔ člen)
- Zobrazení pendingových pozvánek

### Měření času
- Timer v headeru (spustit/zastavit pro každý projekt)
- Automatické uložení naměřeného času do Firestore
- Přehled aktivity na stránce `/activity`

### Notifikace
- Toast notifikace pro akce (úspěch/chyba)
- Upozornění na úkoly se splatností dnes/zítra (zvonek v headeru)

---

## 9. API endpointy (Nuxt Nitro server)

| Metoda | Endpoint | Popis |
|---|---|---|
| `POST` | `/api/invite` | Odeslání e-mailové pozvánky (Resend) |
| `POST` | `/api/invite/accept` | Přijmutí pozvánky (Firebase Admin SDK) |
| `POST` | `/api/upload` | Nahrání přílohy úkolu na disk |
| `GET` | `/api/todos` | Načtení úkolů (legacy) |

---

## 10. Routování (stránky aplikace)

| URL | Stránka | Popis |
|---|---|---|
| `/` | `index.vue` | Dashboard — seznam projektů nebo přihlašovací formulář |
| `/projects/:id` | `projects/[id].vue` | Detail projektu (tabule, backlog, kalendář, sprinty) |
| `/invite/:token` | `invite/[token].vue` | Stránka pro přijetí pozvánky |
| `/activity` | `activity.vue` | Aktivita a měření času |
| `/reporty` | `reporty.vue` | Přehledy a analytika |
| `/users` | `users.vue` | Přehled uživatelů |

---

## 11. Nasazení (Deployment)

### Vercel (produkce)
- Automatické nasazení z GitHub repozitáře (CI/CD)
- Build příkaz: `nuxt build`
- Nitro server běží jako serverless funkce
- Produkční doména: **levtodo.online**

### Prostředí (Environment variables)
```
NUXT_PUBLIC_FIREBASE_API_KEY
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NUXT_PUBLIC_FIREBASE_PROJECT_ID
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NUXT_PUBLIC_FIREBASE_APP_ID
RESEND_API_KEY
RESEND_FROM_EMAIL
FIREBASE_SERVICE_ACCOUNT      # JSON s Firebase Admin přihlašovacími údaji
NUXT_PUBLIC_APP_URL           # https://levtodo.online
```

### Firebase (databáze)
- Region: `eur3` (Evropa, multi-region)
- Automatické zálohy povoleny

---

## 12. Srovnání s konkurencí

| Funkce | Scrum Board | Trello | Jira |
|---|---|---|---|
| Kanban tabule | ✅ | ✅ | ✅ |
| Vlastní sloupce | ✅ | ✅ | ✅ |
| Sprinty | ✅ | ❌ | ✅ |
| Backlog | ✅ | ❌ | ✅ |
| Dílčí úkoly (checklist) | ✅ | ✅ | ✅ |
| Přiřazení člena | ✅ | ✅ | ✅ |
| Měření času | ✅ | ❌ | ✅ |
| Role (vlastník/admin/člen) | ✅ | ✅ | ✅ |
| Pozvánky e-mailem | ✅ | ✅ | ✅ |
| Přílohy souborů | ✅ | ✅ | ✅ |
| Kalendářový pohled | ✅ | ❌ | ❌ (placená verze) |
| Šablony projektů | ✅ | ✅ | ✅ |
| Burndown chart | ❌ | ❌ | ✅ |
| Automatizace (pravidla) | ❌ | ✅ (Butler) | ✅ |
| Integrace (Slack, Drive) | ❌ | ✅ | ✅ |
| Typy úkolů (Epic/Story/Bug) | ❌ | ❌ | ✅ |
| Real-time synchronizace | ✅ | ✅ | ✅ |

---

## 13. Omezení a možná rozšíření

### Stávající omezení
- Chybí burndown/velocity grafy
- Žádná automatizační pravidla
- Nahrávání souborů na disk serveru (ne perzistentní při restartu Vercel)
- Ruční měření času (timer), žádné automatické logování
- Databáze v jedné oblasti (eur3)

### Možná budoucí rozšíření
- Typy úkolů (Epik, Příběh, Bug, Úkol)
- Burndown a velocity grafy v sekci Reporty
- WebSocket pro kolaborativní úpravy v reálném čase
- Integrace s GitHub / GitLab (propojení commitů a větví s úkoly)
- Mobilní aplikace (Capacitor nebo React Native)
- Persistentní úložiště příloh (Firebase Storage nebo S3)
- Automatizační pravidla (přesun úkolu po splnění podmínky)

---

## 14. Shrnutí

Scrum Board je plně funkční webová aplikace pro správu projektů vyvinutá jako bakalářská práce. Implementuje klíčové funkce Scrum metodiky (tabule, backlog, sprinty) s moderním technologickým stackem:

- **Frontend:** Nuxt 3, Vue 3, TypeScript, Pinia, Tailwind CSS
- **Backend/DB:** Firebase Firestore (real-time NoSQL), Firebase Auth, Nuxt Nitro Server API
- **Nasazení:** Vercel (serverless, CI/CD)
- **Klíčové vlastnosti:** real-time synchronizace, role-based access control, e-mailové pozvánky, měření času, responzivní design

Aplikace je nasazena v produkci a přístupná na **levtodo.online**.
