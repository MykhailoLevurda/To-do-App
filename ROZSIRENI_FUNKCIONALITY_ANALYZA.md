# Analýza: Rozšíření funkcionality - Drag & Drop a CRUD operace

## Požadované funkce

1. **Drag & Drop úkolů** - přetahování mezi stavy (to-do, in-progress, done)
2. **Vytváření projektů** - z vlastního dashboardu do Freela
3. **Přidávání úkolů** - vytváření úkolů do Freela

---

## 1. Drag & Drop úkolů (změna stavu)

### Analýza Freelo API

**Dostupné endpointy:**
- `POST /task/{task_id}/finish` - dokončení úkolu (active → finished)
- `PUT /task/{task_id}` - update úkolu (ale nevidím přímou změnu stavu)
- `POST /task/{task_id}/move/{tasklist_id}` - přesunutí do jiného tasklistu

**Problém:**
Freelo API **neposkytuje přímou změnu stavu** úkolu (active → in-progress → finished). 

**Možná řešení:**

#### Varianta A: Použití Labels (Doporučeno)
Freelo používá **labels** pro označení stavu úkolu:
- Label "In progress" → stav in-progress
- Label "Done" → stav done
- Bez labelu → stav to-do (active)

**Jak to funguje:**
1. Úkol má `state: { id: 1, state: "active" }` - základní stav
2. Úkol může mít `labels: [{ name: "In progress", ... }]` - label pro stav
3. Pro dokončení: `POST /task/{task_id}/finish` → změní state na "finished"

**Implementace:**
```typescript
// Změna stavu na "in-progress" - přidat label
POST /task/{task_id}/labels
{
  "name": "In progress",
  "color": "#f2830b"
}

// Změna stavu na "done" - dokončit úkol
POST /task/{task_id}/finish

// Změna stavu zpět na "to-do" - odstranit label a případně "unfinish"
DELETE /task/{task_id}/labels/{label_uuid}
```

**Problém:** Freelo API možná neumožňuje "unfinish" úkol (vrátit z finished na active).

#### Varianta B: Mapování přes Tasklisty
Každý stav = jiný tasklist v projektu:
- Tasklist "To Do" → úkoly ve stavu to-do
- Tasklist "In Progress" → úkoly ve stavu in-progress  
- Tasklist "Done" → úkoly ve stavu done

**Implementace:**
```typescript
// Přesunout úkol do jiného tasklistu
POST /task/{task_id}/move/{target_tasklist_id}
```

**Výhody:**
- ✅ Přímá podpora v API
- ✅ Čisté řešení

**Nevýhody:**
- ❌ Vyžaduje vytvoření 3 tasklistů v každém projektu
- ❌ Musí se spravovat tasklisty

#### Varianta C: Hybridní řešení
Kombinace labels a finish/unfinish:
- **To Do → In Progress:** Přidat label "In progress"
- **In Progress → Done:** `POST /task/{task_id}/finish`
- **Done → In Progress:** Odstranit finish (pokud API podporuje)
- **In Progress → To Do:** Odstranit label

**Implementace:**
```typescript
// To Do → In Progress
async function setTaskInProgress(taskId: number) {
  // Zjistit UUID labelu "In progress" (nebo vytvořit)
  const labelUuid = await getOrCreateLabel(taskId, "In progress");
  await freeloFetch(`/task/${taskId}/labels`, {
    method: 'POST',
    body: { uuid: labelUuid }
  });
}

// In Progress → Done
async function finishTask(taskId: number) {
  await freeloFetch(`/task/${taskId}/finish`, { method: 'POST' });
}

// Done → In Progress (pokud API podporuje)
async function unfinishTask(taskId: number) {
  // Možná DELETE /task/{task_id}/finish nebo podobné
  // Nebo přes update úkolu
}
```

**Doporučení:** Varianta C (hybridní) - nejflexibilnější

---

## 2. Vytváření projektů

### Analýza Freelo API

**Dostupný endpoint:**
```
POST /projects
```

**Request:**
```json
{
  "name": "Název projektu",
  "currency_iso": "CZK",  // Povinné: CZK | EUR | USD
  "project_owner_id": 125  // Volitelné: ID vlastníka
}
```

**Response:**
```json
{
  "id": 25,
  "name": "Název projektu"
}
```

### Implementace

**Co je potřeba:**
1. Formulář pro vytvoření projektu (už existuje v Dashboard)
2. Získat `project_owner_id` (ID přihlášeného uživatele)
3. Volitelná měna (defaultně CZK)
4. Volání API přes server-side proxy

**Kód:**
```typescript
// composables/useFreeloProjects.ts
const createProject = async (name: string, currencyIso: string = 'CZK') => {
  const auth = useFreeloAuth();
  const userId = auth.user.value?.id;
  
  if (!userId) {
    throw new Error('User ID not found');
  }
  
  const response = await freeloFetch('/projects', {
    method: 'POST',
    body: {
      name,
      currency_iso: currencyIso,
      project_owner_id: userId
    }
  });
  
  return response;
};
```

**Problémy:**
- ⚠️ Potřeba `project_owner_id` - musíme mít ID uživatele (už máme z přihlášení)
- ⚠️ Povinná `currency_iso` - musíme vybrat měnu (defaultně CZK)

**Co upravit:**
- `components/Dashboard.vue` - odkomentovat/upravit `saveProject()`
- Přidat výběr měny do formuláře (volitelné, defaultně CZK)

---

## 3. Přidávání úkolů

### Analýza Freelo API

**Dostupný endpoint:**
```
POST /project/{project_id}/tasklist/{tasklist_id}/tasks
```

**Request:**
```json
{
  "name": "Název úkolu",
  "due_date": "2016-08-10T08:00:00+0200",  // Volitelné
  "due_date_end": "2016-09-10T08:00:00+0200",  // Volitelné
  "worker": 5836,  // Volitelné: ID přiřazeného uživatele
  "priority_enum": "h",  // Volitelné: h (high) | m (medium) | l (low)
  "comment": {  // Volitelné: popis úkolu
    "content": "Popis úkolu..."
  },
  "labels": [  // Volitelné: labely
    {
      "name": "In progress",
      "color": "#f2830b"
    }
  ]
}
```

**Response:**
```json
{
  "id": 4955,
  "name": "Název úkolu",
  "date_add": "2016-08-10T08:19:46+0200",
  ...
}
```

### Problém: Tasklist ID

**Hlavní problém:** Pro vytvoření úkolu je **povinné** `tasklist_id`, ale:
- Projekty z `/projects` mají `tasklists: [{ id, name }]`
- Musíme vybrat tasklist, do kterého úkol přidáme

**Možná řešení:**

#### Varianta A: Automatický výběr tasklistu
- Vzít první tasklist z projektu
- Nebo vytvořit defaultní tasklist "Backlog" / "To Do"

#### Varianta B: Uživatelský výběr
- Při vytváření úkolu zobrazit výběr tasklistu
- Nebo vytvořit tasklist automaticky, pokud neexistuje

#### Varianta C: Vytvoření tasklistu automaticky
- Pokud projekt nemá tasklist, vytvořit defaultní
- Endpoint: `POST /project/{project_id}/tasklists`

**Doporučení:** Varianta A + C (automatický výběr + vytvoření pokud chybí)

### Implementace

**Kód:**
```typescript
// composables/useFreeloTasks.ts
const createTask = async (
  projectId: number,
  tasklistId: number | null,
  taskData: {
    name: string;
    description?: string;
    dueDate?: Date;
    priority?: 'low' | 'medium' | 'high';
    workerId?: number;
  }
) => {
  // Pokud není tasklist, zkusit najít nebo vytvořit
  let targetTasklistId = tasklistId;
  
  if (!targetTasklistId) {
    // Získat projekty a najít první tasklist
    const projects = await freeloProjects.fetchProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (project?.tasklists && project.tasklists.length > 0) {
      targetTasklistId = project.tasklists[0].id;
    } else {
      // Vytvořit defaultní tasklist
      targetTasklistId = await createDefaultTasklist(projectId);
    }
  }
  
  // Převod priority
  const priorityMap = {
    'high': 'h',
    'medium': 'm',
    'low': 'l'
  };
  
  const requestBody: any = {
    name: taskData.name,
    priority_enum: priorityMap[taskData.priority || 'medium'],
  };
  
  if (taskData.dueDate) {
    requestBody.due_date = taskData.dueDate.toISOString();
  }
  
  if (taskData.workerId) {
    requestBody.worker = taskData.workerId;
  }
  
  if (taskData.description) {
    requestBody.comment = {
      content: taskData.description
    };
  }
  
  const response = await freeloFetch(
    `/project/${projectId}/tasklist/${targetTasklistId}/tasks`,
    {
      method: 'POST',
      body: requestBody
    }
  );
  
  return response;
};

// Vytvoření defaultního tasklistu
const createDefaultTasklist = async (projectId: number) => {
  const response = await freeloFetch(`/project/${projectId}/tasklists`, {
    method: 'POST',
    body: {
      name: 'Backlog' // nebo 'To Do'
    }
  });
  
  return response.id;
};
```

---

## Shrnutí implementace

### 1. Drag & Drop úkolů

**Stav úkolu v Freelo:**
- `state.state = "active"` → základní stav (to-do)
- `labels = [{ name: "In progress" }]` → in-progress
- `state.state = "finished"` → done (po `POST /finish`)

**Mapování:**
- **To Do** = `state: "active"` + žádný label "In progress"
- **In Progress** = `state: "active"` + label "In progress"
- **Done** = `state: "finished"`

**Implementace:**
```typescript
// To Do → In Progress
async function setTaskInProgress(taskId: number) {
  // 1. Zjistit, jestli už má label "In progress"
  const task = await freeloFetch(`/task/${taskId}`);
  const hasInProgressLabel = task.labels?.some(l => l.name === "In progress");
  
  if (!hasInProgressLabel) {
    // 2. Vytvořit nebo získat label "In progress"
    const labelUuid = await getOrCreateLabel(projectId, "In progress", "#f2830b");
    
    // 3. Přidat label k úkolu
    await freeloFetch(`/task/${taskId}/labels`, {
      method: 'POST',
      body: { uuid: labelUuid }
    });
  }
}

// In Progress → Done
async function finishTask(taskId: number) {
  await freeloFetch(`/task/${taskId}/finish`, { method: 'POST' });
}

// Done → In Progress (pokud API podporuje)
async function unfinishTask(taskId: number) {
  // Možná přes update úkolu nebo jiný endpoint
  // Potřebujeme zjistit, jestli Freelo API podporuje "unfinish"
}
```

**Problém:** Freelo API možná neumožňuje "unfinish" úkol. Možná řešení:
- Použít pouze jednosměrný flow: To Do → In Progress → Done
- Nebo použít tasklisty místo stavů

### 2. Vytváření projektů

**Implementace:**
```typescript
// composables/useFreeloProjects.ts
const createProject = async (name: string, currencyIso: string = 'CZK') => {
  const auth = useFreeloAuth();
  const userId = auth.user.value?.id;
  
  if (!userId) {
    throw new Error('User ID not found. Please log in again.');
  }
  
  const response = await freeloFetch('/projects', {
    method: 'POST',
    body: {
      name,
      currency_iso: currencyIso,
      project_owner_id: userId
    }
  });
  
  // Po vytvoření projektu načíst projekty znovu
  await syncProjects();
  
  return response;
};
```

**Co upravit:**
- `components/Dashboard.vue` - `saveProject()` funkce
- Přidat výběr měny (volitelné, defaultně CZK)

### 3. Přidávání úkolů

**Implementace:**
```typescript
// composables/useFreeloTasks.ts
const createTask = async (
  projectId: number,
  taskData: {
    name: string;
    description?: string;
    dueDate?: Date;
    priority?: 'low' | 'medium' | 'high';
    workerId?: number;
  }
) => {
  // 1. Získat nebo vytvořit tasklist
  const tasklistId = await getOrCreateTasklist(projectId);
  
  // 2. Převod dat na Freelo formát
  const requestBody = {
    name: taskData.name,
    priority_enum: convertPriority(taskData.priority),
    worker: taskData.workerId,
    due_date: taskData.dueDate?.toISOString(),
    comment: taskData.description ? { content: taskData.description } : undefined
  };
  
  // 3. Vytvořit úkol
  const response = await freeloFetch(
    `/project/${projectId}/tasklist/${tasklistId}/tasks`,
    {
      method: 'POST',
      body: requestBody
    }
  );
  
  return response;
};

// Pomocná funkce pro získání/vytvoření tasklistu
const getOrCreateTasklist = async (projectId: number): Promise<number> => {
  // Získat projekty
  const projects = await freeloProjects.fetchProjects();
  const project = projects.find(p => p.id === projectId);
  
  // Pokud má tasklist, použít první
  if (project?.tasklists && project.tasklists.length > 0) {
    return project.tasklists[0].id;
  }
  
  // Jinak vytvořit defaultní tasklist
  const newTasklist = await freeloFetch(`/project/${projectId}/tasklists`, {
    method: 'POST',
    body: { name: 'Backlog' }
  });
  
  return newTasklist.id;
};
```

**Co upravit:**
- `components/ScrumBoard.vue` - `addTask()` funkce
- Přidat logiku pro získání tasklist ID

---

## Technické detaily

### Mapování stavů

**Aplikace → Freelo:**
- `todo` → `state: "active"` + žádný label "In progress"
- `in-progress` → `state: "active"` + label "In progress"
- `done` → `state: "finished"`

**Freelo → Aplikace:**
- `state: "active"` + label "In progress" → `in-progress`
- `state: "active"` + žádný label → `todo`
- `state: "finished"` → `done`

### Mapování priority

**Aplikace → Freelo:**
- `high` → `h`
- `medium` → `m`
- `low` → `l`

**Freelo → Aplikace:**
- `h` → `high`
- `m` → `medium`
- `l` → `low`

### Potřebné ID

1. **User ID** (`project_owner_id`, `worker`)
   - Získáváme z prvního projektu při přihlášení
   - Ukládáme v `auth.user.value.id`

2. **Project ID**
   - Z `props.projectId` (formát: `freelo-123`)
   - Extrahujeme: `parseInt(projectId.replace('freelo-', ''))`

3. **Tasklist ID**
   - Z projektu: `project.tasklists[0].id`
   - Nebo vytvořit nový tasklist

4. **Task ID**
   - Z úkolu: `task.freeloId` nebo `parseInt(task.id.replace('freelo-', ''))`

---

## Omezení a problémy

### 1. Změna stavu úkolu zpět (Done → In Progress)

**Problém:** Freelo API možná neumožňuje "unfinish" úkol.

**Možná řešení:**
- Použít pouze jednosměrný flow
- Nebo použít tasklisty místo stavů
- Nebo zjistit, jestli existuje endpoint pro "unfinish"

### 2. Tasklist management

**Problém:** Každý úkol musí být v tasklistu.

**Řešení:**
- Automaticky vytvořit defaultní tasklist při vytváření projektu
- Nebo při prvním vytvoření úkolu
- Nebo použít existující tasklist

### 3. Real-time synchronizace

**Problém:** Po změně stavu se úkol neaktualizuje automaticky.

**Řešení:**
- Po změně stavu načíst úkoly znovu
- Nebo implementovat polling (periodické načítání)
- Nebo WebSocket pro real-time updates

### 4. Error handling

**Co řešit:**
- Co když uživatel nemá oprávnění vytvořit projekt?
- Co když tasklist neexistuje?
- Co když úkol už neexistuje (byl smazán v Freelo)?
- Co když API vrátí chybu?

---

## Implementační plán

### Fáze 1: Vytváření projektů (Nejjednodušší)
1. Upravit `useFreeloProjects.ts` - přidat `createProject()`
2. Upravit `Dashboard.vue` - odkomentovat `saveProject()`
3. Přidat výběr měny (volitelné)
4. Otestovat

**Čas:** 2-3 hodiny

### Fáze 2: Vytváření úkolů (Střední)
1. Upravit `useFreeloTasks.ts` - přidat `createTask()`
2. Přidat `getOrCreateTasklist()` funkci
3. Upravit `ScrumBoard.vue` - `addTask()` funkce
4. Otestovat

**Čas:** 4-5 hodin

### Fáze 3: Drag & Drop (Nejsložitější)
1. Zjistit, jak Freelo API podporuje změnu stavu
2. Implementovat mapování stavů (labels + finish)
3. Upravit `ScrumBoard.vue` - drag & drop handlers
4. Implementovat "unfinish" (pokud je možné)
5. Otestovat všechny přechody

**Čas:** 1-2 dny

---

## Alternativní řešení

### Pokud Freelo API nepodporuje změnu stavu:

**Varianta 1: Použít tasklisty**
- Každý stav = jiný tasklist
- Drag & drop = přesun mezi tasklisty
- `POST /task/{task_id}/move/{tasklist_id}`

**Varianta 2: Hybridní řešení**
- Vytváření/úprava úkolů přes Freelo API
- Změna stavu pouze lokálně (v aplikaci)
- Synchronizace při načítání z Freelo

**Varianta 3: Použít pouze jednosměrný flow**
- To Do → In Progress → Done
- Bez možnosti vrátit zpět

---

## Závěr

**Co je možné:**
- ✅ Vytváření projektů (jednoduché)
- ✅ Vytváření úkolů (střední, potřebuje tasklist)
- ⚠️ Změna stavu úkolů (složité, závisí na API podpoře)

**Doporučení:**
1. Začít s vytvářením projektů (nejjednodušší)
2. Pak vytváření úkolů
3. Nakonec drag & drop (nejdřív otestovat, jestli API podporuje změnu stavu)

**Nejistoty:**
- ❓ Podporuje Freelo API "unfinish" úkol?
- ❓ Jak přesně funguje změna stavu přes labels?
- ❓ Je možné vytvořit tasklist přes API?

**Další kroky:**
1. Otestovat Freelo API endpointy v Postman/curl
2. Zjistit, jestli existují další endpointy pro změnu stavu
3. Implementovat postupně podle fáze


