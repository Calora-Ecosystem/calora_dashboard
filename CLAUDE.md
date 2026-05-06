# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server on port 7777
pnpm build      # Production build (outputs to dist/)
pnpm preview    # Preview production build
```

Docker builds are used for deployment:

- `main` branch → production deploy (`MODE=production`, API: `https://calora.uz/api`)
- `staging` branch → staging deploy (`MODE=staging`, API: `https://staging.calora.uz/api`)

The API base URL is selected automatically in `src/integrations/axios.ts` based on `import.meta.env.MODE`.

## Architecture

**Stack:** Vue 3 (Composition API / `<script setup>`) + Vite + Tailwind CSS v4 + Element Plus + Pinia

**App entry:** `src/main.js` — mounts the Vue app, registers ElementPlus (Uzbek locale), Pinia with persisted state, vue-router, vue3-lottie, vMaska directive, and the global `<svg-icon>` component.

### Routing (`src/views/router.ts`)

Two layout branches:

- **MainLayout** (auth-guarded) — all dashboard pages under `/`
- **AuthLayout** (redirects away if authenticated) — `/auth/sign-in`

Route hierarchy for courses: `/courses` → `/courses/:courseId` → `/courses/:courseId/workouts/:workoutId/exercises` and `/courses/:courseId/lessons`

### State Management (`src/stores/`)

All API calls go through `useApiCallStore` which wraps every call in a `HandlerChain` middleware pipeline (in order):

1. **Access token injection** — sets `Authorization: Bearer` header from persisted token
2. **Token refresh** — on 401 `token_expired`, calls `authStore.refreshToken()` and retries
3. **Loading state** — toggles `appStore.isLoading` around every request
4. **Error logging** — logs Axios errors and system errors to console

Usage pattern: every store calls `const { execute } = useApiCallStore()` then wraps API calls with `execute(async () => { ... })`.

**Token persistence:** `useTokenStore` (Pinia store ID `"tkns"`) persists access/refresh tokens via `pinia-plugin-persistedstate`. Authentication status is derived from JWT expiry via `jwtDecode`.

### Key Stores

| Store            | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `tokenStore`     | JWT storage (persisted)                    |
| `authStore`      | Login, OTP, refresh, logout                |
| `appStore`       | Global `isLoading` flag                    |
| `apiCallStore`   | Middleware chain for all API calls         |
| `courseStore`    | Courses, workouts, exercises, lessons CRUD |
| `dashboardStore` | Dashboard summary and sales data           |

### Components (`src/components/`)

- **`shared/SvgIcon.vue`** — registered globally as `<svg-icon icon="path/to/file.svg">`. SVGs must live under `src/assets/`. Loads them via `import.meta.glob`.
- **`shared/FileUpload.vue`** — wraps Element Plus `ElUpload`, uploads to the API file endpoint, supports images/video/Lottie JSON. Uses `makeFileUrl()` from `axios.ts` to resolve relative file paths to absolute URLs.
- **`shared/DataTable.vue`** — reusable table component used across list views.

### API Integration (`src/integrations/axios.ts`)

Exports:

- `axios` — configured Axios instance with `baseURL`
- `API_BASE_URL` — the base URL string
- `makeFileUrl(relative)` — resolves a relative file path to an absolute URL via `{baseURL}/file/`

### Constants (`src/constants/ApiContstants.ts`)

Domain enums used across forms and API calls: `METRICS`, `COURSE_TYPES`, `ASSET_TYPES`, `GENDERS`, `ENTITY_TYPES`, `ACTIVITIES`, `COMPUTATION_TYPE`.

### Utilities (`src/utils/FormatHelper.ts`)

- `formatMoney(value, notation?)` — formats as UZS currency
- `formatDate(value)` — formats date in Uzbek locale

## Backend API dan foydalanish

- Asosiy Staging API manzili: https://staging.calora.uz/api/
- Asosiy Staging SWAGGER manzili: https://staging.calora.uz/api/swagger/index.html
- Auth qilib token olish uchun
  1. OTP
     API: https://staging.calora.uz/api/swagger/index.html#/Auth/post_auth_send_otp_email__email_
     Email: 0605AbMu@gmail.com
  2. Sign In with Email
     API: https://staging.calora.uz/api/swagger/index.html#/Auth/post_auth_sign_in_email
     Email: 0605AbMu@gmail.com
     Verification code: `verification code of Otp result`
     Code: 777777 - bu staging API uchun o'zgarmas
- Authorized API lar uchun token olib keyin ishlatish lozim.
- Token olgandan keyin vaqti tugagunch ko'p marta ishlatish uchun docs/api_token.md faylga tokenlarni saqlab qo'ysang bo'ladi
- Agar docs/api_token.md da ishlatsa bo'ladigan token bo'lsa Qayta Auth qilmay o'shani ishlat
