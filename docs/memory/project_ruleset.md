---
name: Calora Dashboard Project Ruleset
description: Foydalanuvchi barcha so'rovlarda docs/claude_ruleset.md qoidalariga amal qilishni so'radi — Vue 3, API pattern, store, komponent, routing, testlash qoidalari
type: project
---

Foydalanuvchi barcha so'rovlarda `docs/claude_ruleset.md` asosida ishlashni tasdiqladi.

**Asosiy qoidalar xulasasi:**
- Stack: Vue 3 (`<script setup>`) + Vite + Tailwind v4 + Element Plus + Pinia
- API chaqirish: har doim `useApiCallStore.execute()` orqali
- API URL hardcode qilinmaydi — `src/integrations/axios.ts` dan import
- Fayl URL: `makeFileUrl()` orqali resolve qilinadi
- List view larda `<DataTable>` ishlatiladi, custom table yozilmaydi
- Domain enum lari `ApiContstants.ts` dan import qilinadi
- Staging token avval `docs/api_token.md` dan tekshiriladi
- Destructive git amallar foydalanuvchi ruxsatisiz bajarilmaydi

**Storlar (to'liq ro'yxat):**
- `tokenStore` — JWT saqlash (persisted)
- `authStore` — Login, OTP, refresh, logout
- `appStore` — Global isLoading
- `apiCallStore` — Middleware chain
- `courseStore` — Courses/workouts/exercises/lessons CRUD
- `dashboardStore` — Dashboard summary va sales
- `billingStore` — Kuponlar CRUD va foydalanishlar

**Billing route lari:**
- `/billing/coupons` — kuponlar ro'yxati + tekshirish
- `/billing/coupons/create` — yangi kupon
- `/billing/coupons/:couponId/usages` — kupon foydalanishlari

**Testlash qoidalari (CLAUDE.md dan yangilandi):**
- Har vazifadan keyin UI da testlab ko'riladi — test kodi yozilmaydi
- Chrome MCP orqali brauzerga ulaniladi
- Server: avval localhost:7777 tekshiriladi, yo'q bo'lsa `pnpm run dev`
- Auth: Email `0605AbMu@gmail.com`, OTP `777777` (staging da o'zgarmaydi)
- Faqat dev muhitda (localhost:7777) ishlanadi
- Chrome MCP sozlanmagan bo'lsa — uni loyihaga sozlab qo'shish kerak
- **"UI test qil" deyilganda `curl` ISHLATILMAYDI** — faqat brauzer orqali

**Why:** Foydalanuvchi loyihada izchil arxitektura, kod sifati va UI testlashni xohlaydi.

**How to apply:** Har qanday yangi kod yozganda va bajarilgandan keyin `docs/claude_ruleset.md` dagi barcha qoidalarga rioya qilinadi, Chrome MCP orqali UI tekshiriladi.
