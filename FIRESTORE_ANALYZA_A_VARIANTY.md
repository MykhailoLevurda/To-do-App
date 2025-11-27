# Analýza: Firestore vs Freelo API - Varianty řešení

## Aktuální stav

### Co se používá z Firestore:
1. **Autentizace** (`useAuth.ts`) - Firebase Authentication
2. **Projekty** (`useFirestoreProjects.ts`) - ukládání projektů
3. **Úkoly** (`useFirestoreTasks.ts`) - ukládání úkolů
4. **Team Members** (`useTeamMembers.ts`) - členové týmů
5. **Users** - uživatelské profily
6. **Invite systém** - pozvánky do projektů

### Co se používá z Freelo API:
1. **Autentizace** (`useFreeloAuth.ts`) - Freelo email + API klíč
2. **Projekty** (`useFreeloProjects.ts`) - načítání projektů z Freelo
3. **Úkoly** (`useFreeloTasks.ts`) - načítání úkolů z Freelo

---

## Varianty řešení

### Varianta 1: Úplné odstranění Firestore (Doporučeno)

**Popis:** Odstranit všechny Firebase/Firestore závislosti a používat pouze Freelo API.

**Výhody:**
- ✅ Jednoduchá architektura - jeden zdroj dat
- ✅ Žádné duplicity dat
- ✅ Nižší náklady (žádné Firebase náklady)
- ✅ Méně kódu k udržování
- ✅ Jednodušší deployment (méně konfigurace)

**Nevýhody:**
- ❌ Ztráta funkcí, které Freelo API neposkytuje:
  - Vytváření/úprava projektů a úkolů (read-only)
  - Pozvánky do projektů (musí se dělat v Freelo)
  - Komentáře k úkolům
  - Real-time synchronizace (musí se ručně obnovovat)
- ❌ Závislost na Freelo API dostupnosti
- ❌ Žádné offline cache

**Co odstranit:**
- `composables/useAuth.ts` (nahradit `useFreeloAuth.ts`)
- `composables/useFirestoreProjects.ts` (nahradit `useFreeloProjects.ts`)
- `composables/useFirestoreTasks.ts` (nahradit `useFreeloTasks.ts`)
- `composables/useTeamMembers.ts` (načítat z Freelo API)
- `plugins/firebase.client.ts` (odstranit)
- `firestore.rules`, `firestore.indexes.json` (odstranit)
- Firebase konfigurace z `nuxt.config.ts`
- Firebase dependencies z `package.json`

**Co upravit:**
- `pages/invite/[token].vue` - pozvánky přes Freelo API nebo odstranit
- `server/api/invite.post.ts` - pozvánky přes Freelo API nebo odstranit
- Všechny komponenty používající Firestore composables

**Náročnost:** Střední (2-3 dny práce)

---

### Varianta 2: Hybridní řešení - Freelo API + Firestore pro lokální data

**Popis:** Freelo API pro projekty/úkoly, Firestore pro lokální data a cache.

**Výhody:**
- ✅ Freelo API jako hlavní zdroj dat
- ✅ Firestore pro lokální data (preferences, cache, offline support)
- ✅ Možnost cachování Freelo dat do Firestore
- ✅ Uživatelské preference a nastavení
- ✅ Offline režim (cache z Firestore)

**Nevýhody:**
- ❌ Stále potřeba Firebase konfigurace
- ❌ Složitější architektura
- ❌ Firebase náklady (ale nižší, protože méně dat)
- ❌ Více kódu k udržování

**Co používat z Firestore:**
- User preferences (téma, layout, filtry)
- Cache Freelo dat (pro offline režim)
- Lokální poznámky/komentáře (které nejsou v Freelo)
- Session data
- Uživatelské nastavení aplikace

**Co používat z Freelo API:**
- Projekty (hlavní zdroj)
- Úkoly (hlavní zdroj)
- Team members (z Freelo projektů)

**Struktura Firestore:**
```
users/{userId}
  - preferences: { theme, layout, ... }
  - cache: {
      projects: [...],
      tasks: [...],
      lastSync: timestamp
    }
  - notes: { projectId: "note text" }
```

**Náročnost:** Vysoká (4-5 dní práce)

---

### Varianta 3: Firestore jako fallback/backup

**Popis:** Freelo API jako primární zdroj, Firestore jako backup pro offline režim.

**Výhody:**
- ✅ Freelo API jako hlavní zdroj
- ✅ Firestore jako backup při výpadku Freelo API
- ✅ Offline režim
- ✅ Synchronizace mezi Freelo a Firestore

**Nevýhody:**
- ❌ Nejsložitější architektura
- ❌ Potřeba synchronizace mezi systémy
- ❌ Riziko konfliktů dat
- ❌ Vysoké Firebase náklady
- ❌ Více kódu k udržování

**Jak to funguje:**
1. Načíst data z Freelo API
2. Uložit do Firestore jako cache/backup
3. Při výpadku Freelo API použít Firestore
4. Při obnovení synchronizovat změny

**Náročnost:** Velmi vysoká (1-2 týdny práce)

---

### Varianta 4: Postupné migrace (Doporučeno pro produkci)

**Popis:** Postupně migrovat z Firestore na Freelo API, zachovat Firestore pro funkce, které Freelo neposkytuje.

**Výhody:**
- ✅ Bezpečná migrace bez výpadků
- ✅ Možnost testování
- ✅ Zachování funkcí, které Freelo neposkytuje
- ✅ Možnost rollbacku

**Nevýhody:**
- ❌ Dočasně oba systémy současně
- ❌ Více práce na migraci

**Fáze migrace:**

**Fáze 1: Duální režim (1-2 týdny)**
- Freelo API pro nové uživatele
- Firestore pro stávající uživatele
- Feature flag pro přepínání

**Fáze 2: Migrace dat (1 týden)**
- Export dat z Firestore
- Import do Freelo (pokud je možné)
- Nebo ponechat v Firestore jako archiv

**Fáze 3: Odstranění Firestore (1 týden)**
- Odstranit Firestore composables
- Odstranit Firebase konfiguraci
- Vyčistit kód

**Náročnost:** Vysoká, ale rozložená v čase

---

## Doporučení podle use case

### Pro nový projekt (startup):
**→ Varianta 1: Úplné odstranění Firestore**
- Jednoduchost
- Nižší náklady
- Rychlejší vývoj

### Pro existující projekt s uživateli:
**→ Varianta 4: Postupné migrace**
- Bezpečnost
- Žádné výpadky
- Možnost testování

### Pro projekt s offline režimem:
**→ Varianta 2: Hybridní řešení**
- Cache v Firestore
- Offline support
- User preferences

### Pro kritickou aplikaci:
**→ Varianta 3: Firestore jako fallback**
- Redundance
- Vysoká dostupnost
- Offline režim

---

## Detailní analýza: Co Freelo API neposkytuje

### 1. Vytváření/úprava projektů
- ❌ Freelo API: Read-only pro projekty
- ✅ Firestore: Plná CRUD operace
- **Řešení:** Použít Freelo web aplikaci pro správu projektů

### 2. Vytváření/úprava úkolů
- ❌ Freelo API: Read-only pro úkoly (nebo omezené)
- ✅ Firestore: Plná CRUD operace
- **Řešení:** Použít Freelo web aplikaci pro správu úkolů

### 3. Pozvánky do projektů
- ❌ Freelo API: Nevíme, jestli to podporuje
- ✅ Firestore: Vlastní implementace
- **Řešení:** Použít Freelo web aplikaci pro pozvánky, nebo implementovat přes Freelo API (pokud je dostupné)

### 4. Komentáře k úkolům
- ❌ Freelo API: Možná read-only
- ✅ Firestore: Vlastní implementace
- **Řešení:** Použít Freelo komentáře, nebo implementovat vlastní systém

### 5. Real-time synchronizace
- ❌ Freelo API: Polling (periodické načítání)
- ✅ Firestore: Real-time listeners
- **Řešení:** Implementovat polling nebo WebSocket pro real-time updates

### 6. Offline režim
- ❌ Freelo API: Vyžaduje internet
- ✅ Firestore: Offline cache
- **Řešení:** Implementovat lokální cache (localStorage/IndexedDB)

### 7. Uživatelské preference
- ❌ Freelo API: Ne
- ✅ Firestore: Vlastní implementace
- **Řešení:** Použít localStorage nebo Firestore jen pro preferences

---

## Konkrétní doporučení pro váš projekt

### Aktuální situace:
- ✅ Používáte Freelo API pro projekty a úkoly
- ✅ Freelo API funguje dobře
- ✅ Read-only režim je přijatelný
- ⚠️ Stále máte Firestore kód, který se nepoužívá

### Doporučení: **Varianta 1 - Úplné odstranění Firestore**

**Důvody:**
1. **Jednoduchost** - méně kódu, jednodušší architektura
2. **Náklady** - žádné Firebase náklady
3. **Údržba** - méně závislostí, méně problémů
4. **Funkcionalita** - Freelo API pokrývá vaše potřeby (read-only je OK)

**Co udělat:**

1. **Odstranit nepoužívaný kód:**
   ```bash
   # Soubory k odstranění:
   - composables/useAuth.ts
   - composables/useFirestoreProjects.ts
   - composables/useFirestoreTasks.ts
   - composables/useTeamMembers.ts (nebo upravit pro Freelo)
   - plugins/firebase.client.ts
   - firestore.rules
   - firestore.indexes.json
   ```

2. **Upravit komponenty:**
   - Odstranit všechny reference na Firestore composables
   - Zajistit, že vše používá Freelo composables

3. **Upravit konfiguraci:**
   - Odstranit Firebase config z `nuxt.config.ts`
   - Odstranit Firebase dependencies z `package.json` (volitelné, pokud se nepoužívá)

4. **Pozvánky:**
   - Buď odstranit pozvánkový systém
   - Nebo implementovat přes Freelo API (pokud je možné)
   - Nebo použít Freelo web aplikaci

5. **User preferences:**
   - Použít `localStorage` místo Firestore
   - Nebo jednoduchý backend endpoint

**Časová náročnost:** 1-2 dny práce

---

## Alternativní řešení pro chybějící funkce

### 1. Offline cache
**Místo Firestore:**
- `localStorage` pro malá data
- `IndexedDB` pro větší data
- Service Worker pro offline support

### 2. User preferences
**Místo Firestore:**
- `localStorage` pro jednoduchá nastavení
- Backend API endpoint pro složitější data

### 3. Pozvánky
**Místo Firestore:**
- Freelo web aplikace
- Nebo vlastní backend endpoint s email službou

### 4. Komentáře
**Místo Firestore:**
- Freelo komentáře (pokud API podporuje)
- Nebo vlastní backend endpoint

### 5. Real-time updates
**Místo Firestore listeners:**
- Polling (periodické načítání každých X sekund)
- WebSocket server (už máte `server/websocket.ts`)
- Server-Sent Events (SSE)

---

## Shrnutí variant

| Varianta | Náročnost | Náklady | Složitost | Doporučení |
|----------|-----------|---------|-----------|------------|
| 1. Odstranit Firestore | Nízká | Žádné | Nízká | ⭐⭐⭐⭐⭐ |
| 2. Hybridní | Vysoká | Nízké | Střední | ⭐⭐⭐ |
| 3. Fallback | Velmi vysoká | Vysoké | Vysoká | ⭐⭐ |
| 4. Postupná migrace | Vysoká | Střední | Střední | ⭐⭐⭐⭐ |

---

## Závěr

**Pro váš projekt doporučuji Variantu 1** - úplné odstranění Firestore, protože:
- ✅ Freelo API pokrývá vaše potřeby
- ✅ Read-only režim je přijatelný
- ✅ Jednodušší architektura
- ✅ Nižší náklady
- ✅ Méně kódu k udržování

**Alternativy pro chybějící funkce:**
- Offline cache → localStorage/IndexedDB
- User preferences → localStorage
- Pozvánky → Freelo web nebo vlastní backend
- Real-time → Polling nebo WebSocket

**Akční plán:**
1. Identifikovat všechny Firestore reference
2. Odstranit nepoužívaný kód
3. Upravit komponenty
4. Otestovat
5. Odstranit Firebase konfiguraci


