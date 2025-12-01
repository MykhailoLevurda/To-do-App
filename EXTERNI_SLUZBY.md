# Externí služby a princip fungování aplikace

Tento dokument popisuje všechny externí služby používané v projektu, jak je nastavit a používat, a také princip fungování aplikace.

---

## Externí služby

### 1. Freelo API

Freelo API je **hlavní externí služba** pro správu projektů a úkolů. Aplikace používá Freelo API pro:
- Načítání projektů a úkolů z Freelo účtu
- Vytváření nových projektů a úkolů
- Aktualizaci stavů úkolů (todo, in-progress, done)
- Přidávání komentářů k úkolům
- Správu labelů úkolů

#### Autentizace

Freelo API používá **HTTP Basic Authentication** pomocí emailu a API klíče.

**Způsoby přihlášení:**

1. **Interaktivní přihlášení** (doporučeno pro produkci)
   - Uživatel zadá email a API klíč při přihlášení
   - Credentials se ukládají do Firestore pro trvalé přihlášení
   - Po zavření a znovu otevření aplikace je uživatel automaticky přihlášen

2. **Automatické přihlášení z .env** (pro vývoj, volitelné)
   - Můžete nastavit credentials v `.env` souboru pro automatické přihlášení
   - Užitečné pro vývoj, aby se nemuselo pokaždé přihlašovat

Pro automatické přihlášení přidejte do `.env`:
```env
NUXT_PUBLIC_FREELO_EMAIL=vas@email.com
NUXT_PUBLIC_FREELO_API_KEY=vash-api-klic
```

#### Jak získat Freelo API klíč

1. Přejděte na [Freelo aplikaci](https://app.freelo.io/)
2. Přihlaste se do svého účtu
3. Přejděte na **Profil** → **Nastavení** (https://app.freelo.io/profil/nastaveni)
4. Najděte sekci **API klíč**
5. Zkopírujte svůj API klíč

#### API Endpointy

Aplikace používá tyto Freelo API endpointy:
- **Base URL:** `https://api2.freelo.io/v1/`
- `GET /projects` - načtení vlastních aktivních projektů
- `POST /projects` - vytvoření nového projektu
- `GET /all-projects` - načtení všech projektů (s paginací)
- `GET /all-tasks` - načtení všech úkolů s filtrováním
- `POST /project/{project_id}/tasklist/{tasklist_id}/tasks` - vytvoření nového úkolu
- `POST /task/{task_id}/finish` - dokončení úkolu
- `POST /task/{task_id}/activate` - aktivace úkolu
- `POST /task/{task_id}/labels` - přidání labelu k úkolu
- `DELETE /task/{task_id}/labels/{label_uuid}` - odstranění labelu z úkolu
- `POST /task/{task_id}/comments` - přidání komentáře k úkolu

**Poznámka:** 
- Aplikace používá `api2.freelo.io` místo `api.freelo.io` kvůli CORS
- Aplikace používá **server-side proxy** (`/api/freelo/[...path]`) pro volání Freelo API, což řeší CORS problém
- Všechny požadavky na Freelo API procházejí přes Nuxt server, kde není CORS omezení

#### Rate Limiting

Freelo API má limit **25 požadavků za minutu**. Pokud limit překročíte, obdržíte chybu 429 a musíte počkat 60 sekund.

#### Dokumentace

Kompletní dokumentace Freelo API je k dispozici v souboru `freelo-apib.md` v projektu.

---

### 2. Firebase

Firebase se používá pro:
- **Ukládání Freelo credentials** (email + API klíč) do Firestore
- **Ukládání lokálních úkolů** (úkoly vytvořené přímo v aplikaci, ne z Freelo)

#### Konfigurace

Firebase se konfiguruje pomocí environment proměnných v souboru `.env`:

```env
NUXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NUXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

#### Struktura dat v Firestore

**Kolekce: `users`**
- Ukládá Freelo credentials (email + API klíč) pro trvalé přihlášení
- Struktura: `{ email: string, apiKey: string }`

**Kolekce: `tasks`**
- Ukládá lokální úkoly (úkoly vytvořené přímo v aplikaci)
- Freelo úkoly se **neukládají** do Firestore, pouze se načítají z Freelo API

---

### 3. WebSocket server (volitelné)

Projekt obsahuje vlastní WebSocket server pro real-time komunikaci. Server běží na portu 3002 (vývoj) nebo podle konfigurace.

#### Konfigurace

```env
NUXT_PUBLIC_WS_URL=ws://localhost:3002
NUXT_PUBLIC_WS_ENABLED=true
```

#### Spuštění

Pro vývoj můžete spustit WebSocket server samostatně:
```bash
npm run dev:ws
```

Nebo spustit vše najednou (Nuxt + WebSocket):
```bash
npm run dev:all
```

**Poznámka:** WebSocket server je volitelný a v současné době není aktivně používán pro synchronizaci s Freelo.

---

## Princip fungování aplikace

### Architektura

Aplikace je postavena na **Nuxt 3** frameworku s následující architekturou:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vue 3)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Dashboard   │  │ Scrum Board  │  │  Task Card   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │         Pinia Stores (State Management)          │ │
│  │  - useProjectsStore  - useScrumBoardStore        │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │         Composables (Business Logic)             │ │
│  │  - useFreeloProjects  - useFreeloTasks          │ │
│  │  - useFreeloAuth      - useFreeloApi            │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Nuxt Server (API Proxy)                   │
│  ┌──────────────────────────────────────────────────┐ │
│  │  /api/freelo/[...path]  (CORS Proxy)            │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Freelo API                             │
│         https://api2.freelo.io/v1/                      │
└─────────────────────────────────────────────────────────┘
```

### Tok dat

#### 1. Načítání projektů

```
Uživatel otevře Dashboard
    ↓
useFreeloProjects.syncProjects()
    ↓
fetchProjects() → Freelo API GET /projects
    ↓
Server proxy /api/freelo/projects
    ↓
Freelo API vrací projekty
    ↓
Projekty se uloží do useProjectsStore
    ↓
Dashboard zobrazí projekty
```

#### 2. Načítání úkolů

```
Uživatel otevře Scrum Board pro projekt
    ↓
ScrumBoard.onMounted()
    ↓
loadTasksFromFreelo()
    ↓
useFreeloTasks.syncTasksForProject()
    ↓
fetchTasksByProject() → Freelo API GET /all-tasks
    ↓
Server proxy /api/freelo/all-tasks
    ↓
Freelo API vrací úkoly
    ↓
Úkoly se převedou na formát aplikace (convertFreeloTaskToAppTask)
    ↓
Úkoly se uloží do useScrumBoardStore
    ↓
Scrum Board zobrazí úkoly v kanban sloupcích
```

#### 3. Změna stavu úkolu (Drag & Drop)

```
Uživatel přetáhne úkol do jiného sloupce
    ↓
handleDrop() → updateTaskStatus()
    ↓
Okamžitá UI aktualizace (scrumBoard.updateTaskStatus)
    ↓
syncTaskStatusWithFreelo()
    ↓
Podle cílového stavu:
  - 'done' → freeloTasks.finishTask() → POST /task/{id}/finish
  - 'in-progress' → freeloTasks.addInProgressLabel() → POST /task/{id}/labels
  - 'todo' → freeloTasks.removeInProgressLabel() → DELETE /task/{id}/labels/{uuid}
    ↓
Server proxy předá požadavek do Freelo API
    ↓
Freelo API aktualizuje úkol
    ↓
Změna se projeví ve Freelo aplikaci
```

#### 4. Vytváření projektu

```
Uživatel klikne "Nový Projekt" a vyplní formulář
    ↓
saveProject() → freeloProjects.createProject()
    ↓
Získání user ID (z auth nebo z API)
    ↓
POST /projects → Freelo API
    ↓
Server proxy /api/freelo/projects
    ↓
Freelo API vytvoří projekt
    ↓
syncProjects() → načtení aktualizovaného seznamu projektů
    ↓
Projekt se zobrazí v Dashboardu
```

#### 5. Vytváření úkolu

```
Uživatel klikne "Add Task" a vyplní formulář
    ↓
addTask() → freeloTasks.createTask()
    ↓
Získání tasklist ID z projektu
    ↓
POST /project/{id}/tasklist/{tasklist_id}/tasks → Freelo API
    ↓
Server proxy předá požadavek
    ↓
Freelo API vytvoří úkol
    ↓
refreshTasks() → načtení aktualizovaných úkolů
    ↓
Úkol se zobrazí v Scrum Boardu
```

### Synchronizace dat

Aplikace používá **jednosměrnou synchronizaci** z Freelo API:

1. **Načítání dat:** Data se načítají z Freelo API při otevření projektu
2. **Aktualizace dat:** Změny se odesílají do Freelo API okamžitě (drag & drop, vytváření úkolů)
3. **Ruční obnovení:** Uživatel může kliknout na tlačítko "Obnovit" pro načtení nejnovějších dat z Freelo

**Poznámka:** Aplikace **nepoužívá automatické polling** (načítání každých X sekund). Data se načítají pouze:
- Při otevření projektu
- Po kliknutí na tlačítko "Obnovit"
- Po vytvoření/aktualizaci úkolu

### Mapování stavů

Aplikace mapuje stavy úkolů mezi Scrum Boardem a Freelo:

| Scrum Board | Freelo |
|-------------|--------|
| `todo` | Úkol je aktivní (`state_id=1`) a nemá label "In progress" |
| `in-progress` | Úkol je aktivní (`state_id=1`) a má label "In progress" |
| `done` | Úkol je dokončený (`state_id=2`) |

**Logika mapování:**
- **todo → in-progress:** Přidá se label "In progress" k úkolu
- **in-progress → done:** Úkol se dokončí (`POST /task/{id}/finish`)
- **done → in-progress:** Úkol se aktivuje (`POST /task/{id}/activate`) a přidá se label "In progress"
- **in-progress → todo:** Odstraní se label "In progress" z úkolu

### Schvalování úkolů

- **Dokončené úkoly z Freelo** jsou automaticky považovány za schválené
- **Lokální úkoly** (vytvořené v aplikaci) mohou být schváleny přes tlačítko "Schválit" v modalu
- Schválené úkoly se zobrazují se šedým efektem (`opacity-60 grayscale`)

### Duplikáty úkolů

Aplikace implementuje ochranu proti duplikátům úkolů:
- Duplikáty se odstraňují při načítání z Freelo API
- Používá se `Map<id, task>` pro zajištění unikátnosti
- Duplikáty se logují do konzole pro debugging

---

## Bezpečnostní poznámky

⚠️ **DŮLEŽITÉ:**

1. **Nikdy necommitněte `.env` soubor** - je v `.gitignore`
2. **Freelo API klíče jsou citlivé** - ukládají se do Firestore s bezpečnostními pravidly
3. **Firebase API klíče jsou veřejné** - to je v pořádku, ale mějte správně nastavená Firestore pravidla
4. **Používejte environment proměnné** pro všechny citlivé údaje
5. **V produkci použijte HTTPS** pro všechny externí komunikace

---

## Troubleshooting

### Freelo API nefunguje

1. Zkontrolujte, zda jsou Freelo credentials správně nastaveny
2. Ověřte, že API klíč je platný (zkuste se přihlásit do Freelo aplikace)
3. Zkontrolujte konzoli pro chyby (CORS, 401, 429)
4. Ověřte, že server proxy funguje (`/api/freelo/[...path]`)

### Úkoly se nezobrazují

1. Zkontrolujte, zda je projekt správně načten z Freelo
2. Ověřte, zda má projekt úkoly ve Freelo aplikaci
3. Zkontrolujte konzoli pro chyby při načítání úkolů
4. Zkuste kliknout na tlačítko "Obnovit" pro ruční načtení

### Změna stavu úkolu nefunguje

1. Zkontrolujte, zda je úkol z Freelo (ID začíná `freelo-`)
2. Ověřte, zda má úkol správný stav ve Freelo
3. Zkontrolujte konzoli pro chyby při synchronizaci
4. Zkuste znovu načíst úkoly (tlačítko "Obnovit")

### Vytváření projektu selže

1. Zkontrolujte, zda je uživatel přihlášen
2. Ověřte, zda má uživatel user ID (zkuste se odhlásit a přihlásit znovu)
3. Zkontrolujte konzoli pro chyby (User ID not found, API error)
4. Zkuste vytvořit projekt přímo ve Freelo aplikaci

---

## Další zdroje

- [Freelo API dokumentace](./freelo-apib.md) - Kompletní dokumentace Freelo API
- [Nuxt 3 dokumentace](https://nuxt.com/) - Dokumentace Nuxt frameworku
- [Vue 3 dokumentace](https://vuejs.org/) - Dokumentace Vue frameworku
- [Pinia dokumentace](https://pinia.vuejs.org/) - Dokumentace Pinia state managementu
