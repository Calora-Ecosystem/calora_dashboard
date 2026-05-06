# Claude Ruleset — Calora Dashboard

Bu fayl Claude Code uchun ushbu proyektda ishlashda amal qilish kerak bo'lgan qoidalar to'plami.

---

## 1. Texnik Stack

| Texnologiya    | Versiya / Izoh                              |
| -------------- | ------------------------------------------- |
| Vue 3          | Composition API + `<script setup>` sintaksi |
| Vite           | Build tool, port `7777` da dev server       |
| Tailwind CSS   | v4                                          |
| Element Plus   | UI komponentlar (Uzbek locale)              |
| Pinia          | State management + `pinia-plugin-persistedstate` |

**Qoida:** Yangi komponent yozganda doim `<script setup>` va Composition API ishlatiladi. Options API ishlatilmaydi.

---

## 2. Buyruqlar

```bash
pnpm dev        # Port 7777 da dev server ishga tushirish
pnpm build      # Production build → dist/
pnpm preview    # Production build ni preview qilish
```

---

## 3. Branch → Deploy Qoidalari

| Branch    | MODE        | API Base URL                     |
| --------- | ----------- | -------------------------------- |
| `main`    | production  | `https://calora.uz/api`          |
| `staging` | staging     | `https://staging.calora.uz/api`  |

**Qoida:** API URL ni hech qachon hardcode qilma. `src/integrations/axios.ts` dagi `axios` instance ni import qilib ishlatiladi. URL `import.meta.env.MODE` ga qarab avtomatik tanlanadi.

---

## 4. API Chaqirish Pattern

**Har doim `useApiCallStore` orqali API chaqiriladi.**

```ts
// To'g'ri pattern
const { execute } = useApiCallStore()

async function loadData() {
  await execute(async () => {
    const res = await axios.get('/endpoint')
    // natijani store ga yoz
  })
}
```

**Noto'g'ri:** `axios` ni to'g'ridan-to'g'ri component ichida, `execute` siz chaqirmaslik kerak.

### Middleware Pipeline (tartib bilan ishlaydi):
1. Access token `Authorization: Bearer` header ga qo'shiladi
2. 401 `token_expired` bo'lsa — refresh qilib qayta urinadi
3. `appStore.isLoading` toggle qilinadi
4. Xatoliklar console ga log qilinadi

---

## 5. Store Qoidalari

| Store            | Maqsad                                        |
| ---------------- | --------------------------------------------- |
| `tokenStore`     | JWT saqlash (persisted, ID: `"tkns"`)         |
| `authStore`      | Login, OTP, refresh, logout                   |
| `appStore`       | Global `isLoading` flag                       |
| `apiCallStore`   | Barcha API chaqiruvlari uchun middleware chain |
| `courseStore`    | Courses, workouts, exercises, lessons CRUD    |
| `dashboardStore` | Dashboard summary va sales data               |
| `billingStore`   | Kuponlar CRUD va kupon foydalanishlari        |

**Qoidalar:**
- Yangi store `src/stores/` papkasiga qo'shiladi
- Token holati `useTokenStore` dan olinadi, boshqa yerda saqlanmaydi
- Auth holati JWT expiry orqali `jwtDecode` bilan aniqlanadi

---

## 6. Komponent Qoidalari

### Shared Komponentlar
- `<svg-icon icon="path/to/file.svg">` — global registr qilingan. SVG fayllari `src/assets/` da bo'lishi shart
- `<FileUpload>` — fayl yuklash uchun, `makeFileUrl()` bilan URL resolve qilinadi
- `<DataTable>` — barcha list view larda ishlatiladi, takroriy table yozilmaydi

**Qoida:** List ko'rsatish kerak bo'lsa — `DataTable` ishlatiladi, custom `<table>` yozilmaydi.

---

## 7. Routing Qoidalari

```
/                          → MainLayout (auth-guarded)
/auth/sign-in              → AuthLayout (authenticated bo'lsa redirect)
/courses
/courses/:courseId
/courses/:courseId/workouts/:workoutId/exercises
/courses/:courseId/lessons
/billing/coupons
/billing/coupons/create
/billing/coupons/:couponId/usages
```

Router fayli: `src/views/router.ts`

---

## 8. Constants va Utilities

**Constantlar** (`src/constants/ApiContstants.ts`):
`METRICS`, `COURSE_TYPES`, `ASSET_TYPES`, `GENDERS`, `ENTITY_TYPES`, `ACTIVITIES`, `COMPUTATION_TYPE`

**Qoida:** Domain enum lari uchun to'g'ridan-to'g'ri string literal yozilmaydi — `ApiContstants.ts` dan import qilinadi.

**Utilities** (`src/utils/FormatHelper.ts`):
- `formatMoney(value, notation?)` — UZS formatda pul
- `formatDate(value)` — Uzbek locale da sana

---

## 9. Fayl URL Resolve Qoidasi

```ts
import { makeFileUrl } from '@/integrations/axios'

const fullUrl = makeFileUrl(relativeFilePath)
// → {baseURL}/file/{relativeFilePath}
```

**Qoida:** API dan kelgan relative fayl yo'lini to'g'ridan-to'g'ri `<img src>` ga bermay, `makeFileUrl()` dan o'tkaziladi.

---

## 10. Staging API va Token

- Swagger: https://staging.calora.uz/api/swagger/index.html
- Avval `docs/api_token.md` faylni tekshir — ishlatsa bo'ladigan token bo'lsa qayta auth qilinmaydi
- Yangi token olish kerak bo'lsa:
  1. OTP yuborish: `POST /auth/send_otp_email/{email}` (email: `0605AbMu@gmail.com`)
  2. Sign In: `POST /auth/sign_in_email` — `code: 777777` (staging uchun o'zgarmas)
- Olingan tokenlarni `docs/api_token.md` ga saqlanadi

---

## 11. Testlash Qoidalari

- Har qanday vazifa bajarilgandan keyin **UI da** testlab ko'riladi — test kodi yozilmaydi
- Testlash uchun **Playwright MCP** orqali brauzerga ulaniladi
- Avval `http://localhost:7777` ga so'rov berib server ishga tushganligini tekshir
- Agar server o'chiq bo'lsa — `pnpm run dev` bilan ishga tushiriladi
- Auth uchun: Email `0605AbMu@gmail.com`, OTP kodi `777777` (staging da o'zgarmaydi)
- Faqat **dev muhitda** (localhost:7777) ishlab tekshiriladi
- Agar Playwright MCP sozlanmagan bo'lsa — uni loyihaga sozlab qo'shiladi, o'tkazib yuborilmaydi
- **"UI test qil" deyilganda hech qachon `curl` ishlatilmaydi** — faqat brauzer orqali tekshiriladi

## 12. Umumiy Kod Yozish Qoidalari

- Kommentariy faqat "nima uchun" aniq bo'lmagan holatlarda yoziladi — "nima qiladi" yozilmaydi
- `Error handling` faqat tashqi API va foydalanuvchi inputi uchun qo'shiladi
- Ortiqcha abstraktsiya kiritilmaydi — 3 ta o'xshash qator yozilishi yaxshi, noto'g'ri abstraktsiyadan
- Har bir PR yoki commit da faqat so'ralgan narsa o'zgartiriladi
- Destructive git amallar (`--force`, `reset --hard`) foydalanuvchi ruxsatisiz bajarilmaydi
