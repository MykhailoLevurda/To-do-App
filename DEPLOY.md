# Nasazení na Vercel (5 minut)

## 1. Účet a CLI

1. Založte účet na [vercel.com](https://vercel.com) (zdarma, přihlášení přes GitHub/Google)
2. Nainstalujte Vercel CLI:
   ```bash
   npm i -g vercel
   ```
3. Přihlaste se:
   ```bash
   vercel login
   ```

## 2. Nasazení

V kořenu projektu spusťte:

```bash
vercel
```

- První spuštění: odpovězte na otázky (projekt, framework – Nuxt se detekuje sám)
- Nasazení proběhne za ~2 minuty

## 3. Proměnné prostředí v Vercel

V [vercel.com/dashboard](https://vercel.com) → váš projekt → **Settings** → **Environment Variables** přidejte:

| Proměnná | Hodnota |
|----------|---------|
| `NUXT_PUBLIC_APP_URL` | `https://levtodo.online` |
| `RESEND_API_KEY` | (vaše z .env) |
| `RESEND_FROM_EMAIL` | `Scrum Board <invite@levtodo.online>` |
| `NUXT_PUBLIC_FIREBASE_API_KEY` | (z .env) |
| `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | (z .env) |
| `NUXT_PUBLIC_FIREBASE_PROJECT_ID` | (z .env) |
| `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | (z .env) |
| `NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | (z .env) |
| `NUXT_PUBLIC_FIREBASE_APP_ID` | (z .env) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account (pro přijímání pozvánek) |

Po přidání proměnných spusťte **Redeploy**.

## 4. Propojení domény levtodo.online

1. V Vercel: **Settings** → **Domains** → **Add**
2. Zadejte `levtodo.online`
3. V Forpsi v DNS nastavte:
   - **A záznam** pro `levtodo.online` → `76.76.21.21` (Vercel IP)
   - nebo **CNAME** `www` → `cname.vercel-dns.com` (pokud chcete www)

Přesné DNS instrukce uvidíte přímo v Vercel při přidání domény.

## 5. Ověření

Po propagaci DNS (často do 5 minut) otevřete `https://levtodo.online` – měla by běžet vaše aplikace a odkazy v pozvánkách budou fungovat.

---

## 6. Nasazení změn na levtodo.online (produkce)

Změny máte v Gitu na GitHubu – produkce se aktualizuje až po novém deployi na Vercelu.

### Možnost A: Přes Vercel Dashboard (doporučeno)

1. Otevřete [vercel.com/dashboard](https://vercel.com/dashboard) a vyberte projekt připojený k repozitáři **To-do-App** (GitHub).
2. Záložka **Deployments** → u posledního deploymentu klikněte na **⋯** → **Redeploy**.
3. Potvrdíte **Redeploy** – Vercel znovu stáhne kód z GitHubu a nasadí ho. Za 1–2 minuty je nová verze na levtodo.online.

*Pokud pushujete na `master` a máte u projektu zapnutý „Auto-deploy“, každý push sám spustí deploy. Pak stačí `git push origin master`.*

### Možnost B: Přes Vercel CLI

V kořenu projektu (po `vercel link`, pokud jste projekt ještě nepropojili):

```bash
vercel --prod
```

- `--prod` nasadí na produkční doménu (levtodo.online).
- První spuštění: `vercel link` a zvolte existující projekt, nebo nechte vytvořit nový.

### Důležité pro API (pozvánky, upload)

Na Vercelu musí být nastavená proměnná **`FIREBASE_SERVICE_ACCOUNT`** (celý JSON service account jako řetězec), aby fungovaly:
- přijímání pozvánek (`/api/invite/accept`),
- ověření tokenu u nahrávání příloh (`/api/upload`).

Soubor `firebase-service-account.json` na Vercelu nepoužívejte – použijte jen env proměnnou.

---

## 7. Řešení 404 NOT_FOUND na levtodo.online

Když místo webu vidíte stránku Vercelu **404: NOT_FOUND** ([dokumentace](https://vercel.com/docs/errors/NOT_FOUND)), zkontrolujte:

### A) Nastavení buildu ve Vercelu

1. **Vercel Dashboard** → váš projekt → **Settings** → **General**.
2. **Framework Preset** musí být **Nuxt** (ne „Other“ ani „Vite“). Pokud je špatně, změňte na Nuxt a uložte.
3. **Build & Development Settings**:
   - **Build Command:** `nuxt build` (nebo prázdné – Vercel použije výchozí pro Nuxt).
   - **Output Directory:** nechte **prázdné**. Nuxt 3 s Nitro vytváří výstup v `.output` – Vercel to bere automaticky. Pokud máte nastavené např. `dist` nebo `public`, smažte to.
   - **Root Directory:** prázdné, pokud je aplikace v kořenu repozitáře.

### B) Konfigurace v repozitáři

- V kořenu projektu je soubor **`vercel.json`** s `"buildCommand": "nuxt build"`. Nepřepisujte v něm `outputDirectory`.
- V **`nuxt.config.ts`** je `nitro.preset: process.env.VERCEL ? 'vercel' : 'node-server'` – to je v pořádku pro Vercel.

### C) Po úpravách

1. **Redeploy:** Deployments → u posledního deploye **⋯** → **Redeploy** (nebo push do `main`/`master`, pokud máte auto-deploy).
2. Počkejte 1–2 minuty a zkuste znovu `https://levtodo.online` (příp. tvrdé obnovení stránky Ctrl+F5).

Pokud 404 přetrvává, ve Vercelu v záložce **Deployments** otevřete poslední deployment → **Building** / **Logs** a zkontrolujte, zda build doběhl bez chyby a zda se v logu objevuje výstup Nuxt/Nitro (např. `.output`).
