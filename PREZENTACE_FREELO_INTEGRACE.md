# Prezentace: Integrace s Freelo API

## Přehled

Aplikace Scrum Board je integrována s Freelo API, což umožňuje zobrazovat projekty a úkoly přímo z Freelo účtu uživatele.

---

## 1. Architektura řešení

### Problém: CORS (Cross-Origin Resource Sharing)
- Freelo API (`api2.freelo.io`) blokuje přímé volání z prohlížeče kvůli CORS politice
- Prohlížeč nemůže přímo volat externí API z JavaScriptu

### Řešení: Server-side proxy
```
Prohlížeč → Nuxt Server API (/api/freelo/...) → Freelo API (api2.freelo.io)
         ← (bez CORS problému)                ← (na serveru není CORS)
```

**Výhody:**
- ✅ Žádné CORS problémy
- ✅ Credentials zůstávají na serveru (bezpečnější)
- ✅ Možnost cachování a optimalizace

---

## 2. Autentizace

### Jak to funguje:

1. **Uživatel zadá přihlašovací údaje:**
   - Freelo email (např. `user@example.com`)
   - Freelo API klíč (získaný z nastavení Freelo účtu)

2. **Ověření credentials:**
   - Aplikace volá `/api/freelo/projects` přes server-side proxy
   - Pokud jsou credentials platné, Freelo API vrátí projekty
   - Pokud nejsou platné, vrátí se chyba 401

3. **Uložení credentials:**
   - Credentials se ukládají do `sessionStorage` (zmizí po zavření prohlížeče)
   - Pro vývoj lze použít `.env` soubor pro automatické přihlášení

4. **Získání User ID:**
   - Z prvního projektu se získá `owner.id` (ID přihlášeného uživatele)
   - Toto ID se používá pro filtrování úkolů

**Soubory:**
- `composables/useFreeloAuth.ts` - logika přihlášení
- `composables/useFreeloApi.ts` - správa credentials a API volání
- `components/AuthModal.vue` - UI pro přihlášení

---

## 3. Načítání projektů

### Proces:

1. **Po úspěšném přihlášení:**
   - Dashboard automaticky volá `freeloProjects.syncProjects()`

2. **API volání:**
   ```
   GET /api/freelo/projects?order_by=name&order=asc
   ```

3. **Server-side proxy:**
   - Přijme požadavek s credentials v headers
   - Zavolá skutečné Freelo API: `GET https://api2.freelo.io/v1/projects`
   - Vrátí data zpět prohlížeči

4. **Zpracování dat:**
   - Projekty se převedou z Freelo formátu na formát aplikace
   - Každý projekt dostane prefix `freelo-` pro rozlišení od Firestore projektů
   - Projekty se uloží do Pinia store

5. **Fallback:**
   - Pokud `/projects` vrací prázdné pole, zkusí se `/all-projects`
   - `/all-projects` vrací všechny projekty (vlastní i pozvané)

**Soubory:**
- `composables/useFreeloProjects.ts` - logika načítání projektů
- `components/Dashboard.vue` - zobrazení projektů
- `server/api/freelo/[...path].ts` - server-side proxy

**Struktura dat:**
```typescript
Freelo Project → {
  id: "freelo-123",
  name: "Název projektu",
  status: "active" | "archived",
  taskCount: 5,
  createdAt: Date,
  updatedAt: Date,
  freeloId: 123, // původní Freelo ID
  freeloData: {...} // celá Freelo data
}
```

---

## 4. Načítání úkolů

### Proces:

1. **Uživatel otevře projekt:**
   - Klikne na projekt v Dashboardu
   - Otevře se stránka `/projects/[id]` se ScrumBoard komponentou

2. **Načtení úkolů:**
   - ScrumBoard zjistí Freelo project ID z `props.projectId` (formát: `freelo-123`)
   - Získá ID přihlášeného uživatele z `auth.user.value.id`
   - Volá `freeloTasks.syncTasksForProject(projectId, workerId)`

3. **API volání s filtrem:**
   ```
   GET /api/freelo/all-tasks?projects_ids[]=123&worker_id=456
   ```
   - `projects_ids[]=123` - filtruje úkoly podle projektu
   - `worker_id=456` - filtruje pouze úkoly přiřazené přihlášenému uživateli

4. **Převod dat:**
   - Freelo úkoly se převedou na formát `TaskItem`
   - Mapování stavů:
     - `active` → `todo`
     - `in-progress` → `in-progress`
     - `finished` → `done`
   - Mapování priority:
     - `h` → `high`
     - `m` → `medium`
     - `l` → `low`

5. **Zobrazení:**
   - Úkoly se zobrazí v Scrum Boardu ve třech sloupcích:
     - To Do
     - In Progress
     - Done

**Soubory:**
- `composables/useFreeloTasks.ts` - logika načítání úkolů
- `components/ScrumBoard.vue` - zobrazení úkolů
- `stores/todos.ts` - Pinia store pro úkoly

**Struktura dat:**
```typescript
Freelo Task → TaskItem {
  id: "freelo-789",
  title: "Název úkolu",
  status: "todo" | "in-progress" | "done",
  priority: "low" | "medium" | "high",
  assignee: "Jméno uživatele",
  projectId: "freelo-123",
  dueDate: Date | undefined,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. Server-side proxy

### Jak funguje:

**Endpoint:** `server/api/freelo/[...path].ts`

1. **Přijme požadavek:**
   - URL: `/api/freelo/projects` → path = `projects`
   - URL: `/api/freelo/all-tasks?projects_ids[]=123` → path = `all-tasks`

2. **Získá credentials:**
   - Z headers: `X-Freelo-Email` a `X-Freelo-Api-Key`
   - Nebo z Authorization headeru (Basic Auth)

3. **Zavolá Freelo API:**
   - Sestaví URL: `https://api2.freelo.io/v1/{path}`
   - Přidá query parametry
   - Použije Basic Authentication
   - Přidá User-Agent header (povinný podle dokumentace)

4. **Vrátí odpověď:**
   - Předá status kód
   - Předá data (JSON)
   - V případě chyby vrátí error message

**Výhody:**
- ✅ Řeší CORS problém
- ✅ Credentials zůstávají na serveru
- ✅ Možnost přidat cachování
- ✅ Možnost přidat rate limiting

---

## 6. Data flow diagram

```
┌─────────────┐
│  Prohlížeč  │
│  (Client)   │
└──────┬──────┘
       │
       │ 1. Přihlášení (email + API key)
       ▼
┌─────────────────┐
│  AuthModal.vue  │
└──────┬──────────┘
       │
       │ 2. testCredentials()
       ▼
┌─────────────────┐
│ useFreeloApi.ts │
└──────┬──────────┘
       │
       │ 3. POST /api/freelo/projects
       ▼
┌──────────────────────┐
│ Server Proxy         │
│ /api/freelo/[...path]│
└──────┬───────────────┘
       │
       │ 4. GET https://api2.freelo.io/v1/projects
       │    (Basic Auth: email:apiKey)
       ▼
┌─────────────────┐
│  Freelo API     │
│  api2.freelo.io │
└──────┬──────────┘
       │
       │ 5. Vrátí projekty
       ▼
┌─────────────────┐
│ Server Proxy    │
└──────┬──────────┘
       │
       │ 6. Vrátí projekty
       ▼
┌─────────────────┐
│ useFreeloAuth.ts│
│ (uloží user ID) │
└──────┬──────────┘
       │
       │ 7. syncProjects()
       ▼
┌─────────────────┐
│ Dashboard.vue    │
│ (zobrazí projekty)│
└──────────────────┘

Když uživatel otevře projekt:

┌─────────────────┐
│ ScrumBoard.vue  │
└──────┬──────────┘
       │
       │ 1. syncTasksForProject(projectId, workerId)
       ▼
┌─────────────────┐
│ useFreeloTasks  │
└──────┬──────────┘
       │
       │ 2. GET /api/freelo/all-tasks?projects_ids[]=123&worker_id=456
       ▼
┌──────────────────────┐
│ Server Proxy         │
└──────┬───────────────┘
       │
       │ 3. GET https://api2.freelo.io/v1/all-tasks?...
       ▼
┌─────────────────┐
│  Freelo API     │
└──────┬──────────┘
       │
       │ 4. Vrátí úkoly
       ▼
┌─────────────────┐
│ ScrumBoard.vue  │
│ (zobrazí úkoly) │
└─────────────────┘
```

---

## 7. Klíčové komponenty

### Composables (logika):

1. **`useFreeloApi.ts`**
   - Správa credentials (get/set/clear)
   - Generický `freeloFetch()` pro volání API
   - `testCredentials()` pro ověření

2. **`useFreeloAuth.ts`**
   - `signIn()` - přihlášení
   - `signOut()` - odhlášení
   - `checkAuth()` - kontrola přihlášení
   - Automatické získání User ID z projektů

3. **`useFreeloProjects.ts`**
   - `fetchProjects()` - načtení vlastních projektů
   - `fetchAllProjects()` - načtení všech projektů
   - `syncProjects()` - synchronizace do store

4. **`useFreeloTasks.ts`**
   - `fetchTasksByProject()` - načtení úkolů pro projekt
   - `convertFreeloTaskToAppTask()` - převod formátu
   - `syncTasksForProject()` - synchronizace do store

### Komponenty (UI):

1. **`AuthModal.vue`**
   - Formulář pro email a API klíč
   - Validace
   - Zobrazení chyb

2. **`Dashboard.vue`**
   - Zobrazení seznamu projektů
   - Načítání projektů při mount
   - Reakce na změny autentizace

3. **`ScrumBoard.vue`**
   - Zobrazení úkolů ve sloupcích
   - Načítání úkolů při otevření projektu
   - Filtrování podle projektu

### Server:

1. **`server/api/freelo/[...path].ts`**
   - Proxy endpoint pro všechny Freelo API volání
   - Zpracování credentials
   - Předávání požadavků na Freelo API

---

## 8. Bezpečnost

### Opatření:

1. **Credentials:**
   - Ukládají se v `sessionStorage` (zmizí po zavření prohlížeče)
   - Pro vývoj lze použít `.env` (nikdy necommitovat!)
   - Předávají se přes server-side proxy (ne přímo z prohlížeče)

2. **API klíče:**
   - Freelo API klíče jsou citlivé údaje
   - Nikdy se nezobrazují v UI
   - Předávají se pouze přes HTTPS

3. **CORS:**
   - Server-side proxy řeší CORS problém
   - Prohlížeč nevolá Freelo API přímo

---

## 9. Omezení a poznámky

### Co funguje:
- ✅ Přihlášení pomocí Freelo emailu a API klíče
- ✅ Načítání projektů z Freelo
- ✅ Načítání úkolů z Freelo (filtrováno podle přiřazeného uživatele)
- ✅ Zobrazení úkolů ve Scrum Boardu

### Co nefunguje (read-only režim):
- ❌ Vytváření projektů
- ❌ Úprava projektů
- ❌ Mazání projektů
- ❌ Vytváření úkolů
- ❌ Úprava úkolů
- ❌ Změna stavu úkolů (drag & drop)
- ❌ Mazání úkolů

**Důvod:** Freelo API v této verzi neumožňuje všechny operace přes API, nebo by to vyžadovalo další implementaci.

**Řešení:** Pro plnou správu projektů a úkolů použijte Freelo aplikaci přímo.

---

## 10. Jak to prezentovat

### Demo flow:

1. **Úvod:**
   - "Aplikace Scrum Board je integrována s Freelo API"
   - "Umožňuje zobrazovat projekty a úkoly přímo z Freelo účtu"

2. **Přihlášení:**
   - Ukázat AuthModal
   - Vysvětlit, že se používá Freelo email + API klíč
   - Ukázat, kde se API klíč získává (nastavení Freelo)

3. **Načítání projektů:**
   - Ukázat Dashboard s projekty
   - Vysvětlit, že projekty se načítají z Freelo API
   - Ukázat v DevTools Network tab, jak se volá `/api/freelo/projects`

4. **Zobrazení úkolů:**
   - Otevřít projekt
   - Ukázat Scrum Board s úkoly
   - Vysvětlit, že se zobrazují pouze úkoly přiřazené přihlášenému uživateli
   - Ukázat filtrování podle `worker_id`

5. **Technické detaily:**
   - Vysvětlit server-side proxy (řešení CORS)
   - Ukázat strukturu dat
   - Vysvětlit mapování stavů a priorit

6. **Omezení:**
   - Vysvětlit, že je to read-only režim
   - Pro úpravy je potřeba použít Freelo aplikaci

---

## 11. Technické detaily pro prezentaci

### API Endpointy používané:

1. **Autentizace:**
   - `GET /api/freelo/projects` - testování credentials

2. **Projekty:**
   - `GET /api/freelo/projects` - vlastní aktivní projekty
   - `GET /api/freelo/all-projects` - všechny projekty (fallback)

3. **Úkoly:**
   - `GET /api/freelo/all-tasks?projects_ids[]=123&worker_id=456` - úkoly pro projekt a uživatele

### Rate Limiting:
- Freelo API má limit 25 požadavků za minutu
- Pokud limit překročíte, obdržíte chybu 429

### Error Handling:
- 401 - Neplatné credentials → odhlášení
- 429 - Rate limit → zobrazení chyby
- 5xx - Server error → zobrazení chyby

---

## 12. Shrnutí

**Co jsme implementovali:**
1. ✅ Server-side proxy pro řešení CORS
2. ✅ Autentizace pomocí Freelo emailu a API klíče
3. ✅ Načítání projektů z Freelo
4. ✅ Načítání úkolů z Freelo (filtrováno podle uživatele)
5. ✅ Zobrazení dat v aplikaci

**Technologie:**
- Nuxt 3 (Vue 3)
- Pinia (state management)
- TypeScript
- Server-side API routes (H3)

**Architektura:**
- Composables pro logiku
- Server-side proxy pro API volání
- Pinia stores pro state management
- Vue komponenty pro UI

---

## 13. Otázky a odpovědi

**Q: Proč server-side proxy?**
A: Freelo API blokuje CORS požadavky z prohlížeče. Server-side proxy řeší tento problém, protože na serveru není CORS omezení.

**Q: Jsou credentials bezpečné?**
A: Ano, ukládají se v sessionStorage (zmizí po zavření prohlížeče) a předávají se přes server-side proxy, ne přímo z prohlížeče.

**Q: Proč read-only režim?**
A: Freelo API neumožňuje všechny operace přes API, nebo by to vyžadovalo další implementaci. Pro plnou správu použijte Freelo aplikaci.

**Q: Jak získat API klíč?**
A: V Freelo aplikaci: Profil → Nastavení → API klíč

**Q: Funguje to i v produkci?**
A: Ano, server-side proxy funguje stejně v development i production. Pouze se změní URL z `api2.freelo.io` na `api.freelo.io` (pokud je potřeba).

---

## 14. Závěr

Integrace s Freelo API umožňuje:
- ✅ Zobrazení projektů a úkolů z Freelo účtu
- ✅ Filtrování úkolů podle přiřazeného uživatele
- ✅ Synchronizace dat v reálném čase
- ✅ Bezpečné předávání credentials

Aplikace je připravena k použití a může být rozšířena o další funkce podle potřeby.


