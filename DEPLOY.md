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
