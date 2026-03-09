# Analyza konkurence – Scrum Board vs. Trello, Jira

Porovnani vase aplikace Scrum Board s Trello a Jira Software. Cil: zjistit, jake funkce maji konkurenti a co vam v aplikaci chybi.

---

## 1. Trello – prehled funkci

### Zakladni model
- **Boardy (listy)** – sloupce typu Kanban (To Do, In Progress, Done nebo vlastni).
- **Karty** – ekvivalent vasich ukolu; maji nazev, popis, prirazeny cleny, due date, prirazeni.

### Co Trello ma a vy ne (nebo jen castecne)

| Funkce | Trello | Scrum Board |
|--------|--------|-------------|
| **Stitky / labely** | Vice barevnych labelu na kartu (ne jen priorita) | Jen priorita (low/medium/high) |
| **Checklisty (subukoly)** | Checklisty primo na karte, odsouvani, due date u polozek | Chybi |
| **Prilohy** | Soubory, odkazy, obrazky na kartu | Chybi |
| **Obal karty (cover)** | Obrazek nebo barva jako „hlavicka“ karty | Chybi |
| **Prirazeni clenu** | Prirazeni na uzivatele (vyber z tymu) | Jen textove pole „Resitel“ |
| **Due date upozorneni** | Remindery pred / v den terminu | Chybi |
| **Butler (automatizace)** | Pravidla: pri presunu / labelu automaticky akce (presun, prirazeni, due date) | Chybi |
| **Power-Ups** | Integrace (Slack, Google Drive, Kalendar, …) | Chybi |
| **Sablony boardu / karet** | Pripravene boardy a karty pro opakovane pouziti | Chybi (vlastni stavy ano) |
| **Kalendarovy pohled** | Karty s due date v kalendari | Chybi |
| **Propojeni karet** | Odkaz „tato karta souvisi s …“ | Chybi |
| **Vice boardu v ramci workspace** | Jedna „firma“ / workspace, v ni vice boardu | Ekvivalent: vice projektu, kazdy = jeden board |

### Shrnuti – co vam oproti Trello chybi
- Vice labelu (stitku) na ukoly misto jen priority.
- Checklisty / subukoly na ukolu.
- Prilohy (soubory, odkazy).
- Prirazeni na clena tymu (vyber z uzivatelu projektu), ne jen text.
- Due date upozorneni (remindery).
- Automatizace (pravidla typu „kdyz presun na Done, nastav …“).
- Integrace (Slack, kalendar, uloziste).
- Kalendarovy pohled.
- Sablony projektu / ukolu.

---

## 2. Jira Software – prehled funkci

### Zakladni model
- **Projekty** – obsahuji issue (Story, Bug, Task, Epic atd.), backlog a board (Scrum nebo Kanban).
- **Backlog** – prioritizace, razeni, planovani sprintu.
- **Board** – sloupce podle workflow (napr. To Do, In Progress, Code Review, Done).
- **Sprinty** – casove useky (napr. 2 tydny), do nich se tahaji polozky z backlogu.

### Co Jira ma a vy ne (nebo jen castecne)

| Funkce | Jira | Scrum Board |
|--------|------|-------------|
| **Typy polozek** | Story, Bug, Task, Epic, Sub-task | Jen jeden typ ukolu |
| **Backlog** | Samostatny backlog, razeni, tahani do sprintu | Vsechny ukoly na boardu, zadny backlog |
| **Sprinty** | Planovani sprintu, start/end, scope | Chybi |
| **Epic / nadrazena polozka** | Epic obsahuje Stories; hierarchie | Chybi |
| **Subtasky** | Hierarchicke sub-tasky pod Story/Task | Chybi (ekvivalent: checklisty) |
| **Reporty** | Burndown, velocity, sprint report, cumulative flow | Chybi |
| **Roadmap / timeline** | Prehled epik a releasu v case | Chybi |
| **Pokrocile vyhledavani (JQL)** | Dotazovaci jazyk na issue | Chybi (jen filtrovani v ramci projektu) |
| **Vlastni pole** | Komponenty, fix version, labels, custom fields | Jen pevna pole (priorita, termín, body) |
| **Workflow a pravidla** | Prechody stavu, podminky, automaticke akce | Zadna pravidla, jen presun mezi sloupci |
| **Integrace** | GitHub, GitLab, Slack, Confluence, CI/CD | Chybi |
| **Casova evidence** | Logovani casu na issue (hodiny) | Mate timer na projekt, ne na ukol |
| **Dashboards** | Widgety (assignee, stav, grafy) | Chybi |
| **Oopravneni na urovni projektu/issue** | Role, permissions, transition rules | Mate role (owner/admin/member), bez detailni pravidel |

### Shrnuti – co vam oproti Jira chybi
- Backlog a planovani sprintu (sprinty).
- Typy polozek (Story, Bug, Task, Epic) a hierarchie (Epic → Story → Sub-task).
- Reporty (burndown, velocity, cumulative flow).
- Roadmap / timeline.
- Pokrocile vyhledavani (JQL nebo silny filtr).
- Vlastni pole a komponenty.
- Workflow pravidla (prechody stavu, automatizace).
- Integrace (Git, Slack, dokumentace).
- Casova evidence na urovni ukolu (ne jen timer na projekt).
- Konfigurovatelne dashboards.

---

## 3. Co mate vy a je silna stranka

- **Kanban board** – vlastni sloupce (statusy) podle projektu.
- **Ukoly** – nazev, popis, priorita, termín, resitel, story points.
- **Komentare** u ukolu.
- **Tym a role** – owner, admin, member; pozvanky e-mailem.
- **Timer a aktivita** – cas u projektu, stranka aktivity.
- **Real-time** – WebSocket pro zmeny stavu.
- **Pohodlne UX** – jednoduchy, bez zbytecne slozitosti.

---

## 4. Prioritni seznam – co doplnit (od jednoduchych po slozitejsi)

### Nizka narocnost
1. **Prirazeni na clena tymu** – misto textu „Resitel“ vyber z `teamMembers` projektu (userId + displayName).
2. **Due date upozorneni** – notifikace v den terminu nebo den pred (napr. pres existujici NotificationBell).
3. **Vice labelu (stitku)** – napr. barevne labely na ukol („bug“, „feature“, „urgent“) vedle priority.
4. **Kalendarovy pohled** – ukoly s due date v mesicnim kalendari.

### Stredni narocnost
5. **Checklisty (subukoly)** – na karte ukol, seznam polozek s moznosti odskrtnout.
6. **Prilohy** – nahrat soubor nebo odkaz na ukol (Firebase Storage + odkaz v dokumentu ukolu).
7. **Backlog pohled** – v ramci projektu „backlog“ sloupec nebo samostatna zalozka s razenim bez sprintu.
8. **Sablony projektu** – pri vytvoreni projektu vybrat sablonu (predprazdene statusy, prip. ukoly).

### Vysoka narocnost
9. **Sprinty** – backlog, planovani sprintu (datum start/end), tahani ukolu do sprintu, zakladni sprint report.
10. **Reporty** – burndown, velocity (na zaklade story points a dokoncenych ukolu).
11. **Automatizace** – pravidla typu „kdyz presun na Done, odeslat notifikaci / zmenit prirazeni“.
12. **Integrace** – napr. Slack (oznameni pri zmene), prip. propojeni s repozitarem (commits na ukol).

---

## 5. Zaver

| Konkurent | Nejsilnejsi oproti vam |
|-----------|-------------------------|
| **Trello** | Labely, checklisty, prilohy, automatizace (Butler), Power-Ups, kalendar. |
| **Jira** | Backlog, sprinty, typy issue, reporty, JQL, integrace, roadmap. |

Vase aplikace dobre pokryva zakladni Kanban (projekty, sloupce, ukoly, tym, komentare, timer). Pro rust a blizsi konkurenci Trello/Jira dava smysl postupne pridat: **prirazeni na clena tymu**, **stitky/labely**, **checklisty**, **prilohy**, **upozorneni na termín**, **backlog a sprinty** a nakonec **reporty a integrace**.
