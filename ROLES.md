# Role v týmu projektu

V projektu (týmu) existují tři role. **Owner** je vždy `createdBy` projektu a není uložen v `teamMembers`; **Admin** a **Member** jsou v poli `teamMembers` s polem `role`.

## 1️⃣ Owner (Vlastník týmu)

- **Kdo:** uživatel, který projekt vytvořil (`project.createdBy`)
- **Použití:** zakladatel týmu / firma / klient

**Může:**
- mazat projekt (tým)
- měnit billing / tarif (až bude implementováno)
- přidávat a odebírat členy
- měnit role (admin / member)
- nastavovat oprávnění
- přenést vlastnictví na jiného uživatele (až bude implementováno)

**Nemůže být odebrán**, dokud nepřevede vlastnictví.

---

## 2️⃣ Admin (Správce týmu)

- **Kdo:** člen v `teamMembers` s `role: 'admin'`
- Spravuje tým, ale není vlastník.

**Může:**
- zvát členy
- odebírat členy (kromě Ownera)
- měnit role (kromě Ownera)
- vytvářet a mazat projekty / seznamy (statusy)
- upravovat všechny úkoly

**Nemůže:**
- mazat projekt (tým)
- měnit billing
- měnit nebo odebrat Ownera

---

## 3️⃣ Member (Člen)

- **Kdo:** člen v `teamMembers` s `role: 'member'` (nebo bez `role` – výchozí)

**Může:**
- vytvářet úkoly
- upravovat své úkoly
- komentovat
- měnit stav úkolu
- vidět ostatní členy týmu

**Nemůže:**
- zvát další členy
- mazat projekty
- měnit role
- odebírat členy

---

## Technické poznámky

- **Typy:** `TeamMemberRole = 'owner' | 'admin' | 'member'`; v `TeamMember` je `role?: 'admin' | 'member'`.
- **Composable:** `useProjectRole(project)` vrací `currentUserRole`, `isOwner`, `isAdmin`, `canInviteMembers`, `canDeleteProject`, atd.
- **Firestore:** projekt má navíc `memberRoles` a `memberIds` (pole userId) – obojí drž v sync s `teamMembers`. `memberIds` slouží k dotazu „projekty, kde jsem člen“ (`array-contains`).
- **Dotazy:** aplikace načítá projekty dvěma dotazy – `createdBy == userId` (vlastněné) a `memberIds array-contains userId` (kde jsem člen); výsledky se sloučí.
- **Pravidla:** viz `firestore.rules` – mazat projekt může jen Owner; upravovat projekt a úkoly mohou Owner a Admin. Čtení projektu: `createdBy == uid` nebo `memberRoles[uid] != null` (pole `memberIds` se v pravidlech nepoužívá).
- **Existující projekty:** pokud už v DB existují projekty s `teamMembers` ale bez `memberIds`, členové je v seznamu neuvidí, dokud se neprovede zápis členů (např. přidání/odebrání někoho) – tím se `memberIds` i `memberRoles` doplní.
