---
name: Calora Dashboard Project Ruleset
description: Foydalanuvchi barcha so'rovlarda docs/claude_ruleset.md qoidalariga amal qilishni so'radi — Vue 3, API pattern, store, komponent, routing va kod yozish qoidalari
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

**Why:** Foydalanuvchi loyihada izchil arxitektura va kod sifatini saqlashni xohlaydi.

**How to apply:** Har qanday yangi kod, komponent yoki store yozganda `docs/claude_ruleset.md` dagi barcha qoidalarga rioya qilinadi.
