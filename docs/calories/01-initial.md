# Plan: Food Bo'limi API Sahifalari

## Context
`/calories` route mavjud lekin faqat stub (`<template>Index</template>`). Swagger.json dagi Food bo'limidagi 17 ta endpoint asosida admin dashboard uchun oziq-ovqat bazasini boshqarish sahifalari yaratish kerak. Admin uchun: foods CRUD + categories boshqaruvi.

---

## Food API Endpointlari (admin uchun muhimlari)

| Method | Path | Maqsad |
|--------|------|--------|
| GET | /food | Barcha foodlarni ro'yxat (pagination, filter) |
| POST | /food/general | Tizim uchun food yaratish |
| GET | /food/{foodId} | Bitta food |
| PUT | /food/{foodId} | Food yangilash |
| DELETE | /food/{foodId} | Food o'chirish |
| GET | /food/categories | Kategoriyalar ro'yxati |
| POST | /food/categories | Kategoriya yaratish |
| DELETE | /food/categories/{id} | Kategoriya o'chirish |

---

## Asosiy Schemalar

**GetAllFoodDto:** id, name(Mlf), categoryId, categoryName(Mlf), coverUrl, metrics[], isUserFood, isFavourite

**FoodDto:** id, name(Mlf), categoryId, categoryName(Mlf), description, coverUrl, metrics[], isUserFood, userId

**CreateFoodDto / UpdateFoodDto:** categoryId, name(Mlf), coverUrl, description(max 500), metrics[]

**FoodMetricDto:** metric (Protein|Fat|Carb|Kcal|Water|Step|Weight), value(double)

**FoodCategory:** id, name(Mlf), coverUrl

**CreateFoodCategoryDto:** name(Mlf), coverUrl

---

## Yaratilishi kerak bo'lgan fayllar

### 1. TypeScript types — `src/@types/common.ts`
Qo'shimchalar:
```ts
type EnumMenu = "Breakfast" | "Lunch" | "Dinner" | "Snack"

type FoodMetricDto = { metric: TMetrics; value: number }

type FoodCategory = {
  id: number
  name: Mlf
  coverUrl: string | null
}

type GetAllFoodDto = {
  id: number
  name: Mlf
  categoryId: number
  categoryName: Mlf
  coverUrl: string | null
  metrics: FoodMetricDto[]
  isUserFood: boolean
  isFavourite: boolean
}

type FoodDto = GetAllFoodDto & { description: string | null; userId: number | null }

type CreateFoodDto = {
  categoryId: number
  name: Mlf
  coverUrl?: string
  description?: string
  metrics: FoodMetricDto[]
}
```

### 2. Pinia store — `src/stores/foodStore.ts`
Pattern: `useApiCallStore().execute()` wrapper, `axios` from `integrations/axios.ts`

Methods:
- `loadFoods(params: { skip?:number, take?:number, isUserFood?:boolean })` → GET /food
- `getFoodById(foodId: number)` → GET /food/{foodId}
- `createFood(data: CreateFoodDto)` → POST /food/general
- `updateFood(foodId: number, data: UpdateFoodDto)` → PUT /food/{foodId}
- `deleteFood(foodId: number)` → DELETE /food/{foodId}
- `loadCategories()` → GET /food/categories
- `createCategory(data: CreateFoodCategoryDto)` → POST /food/categories
- `deleteCategory(categoryId: number)` → DELETE /food/categories/{categoryId}

State: `foods: GetAllFoodDto[]`, `categories: FoodCategory[]`, `currentFood: FoodDto | null`

### 3. Food ro'yxat sahifasi — `src/views/calories/Index.vue` (stub o'rniga)
- Yuqori qismida tab: **Foods** | **Categories**
- **Foods tab:**
  - `<DataTable :loader="(skip,take) => foodStore.loadFoods({skip,take})">`
  - Ustunlar: Rasm, Nomi (uz), Kategoriya, Kcal, Protein, Fat, Carb, IsUserFood badge
  - Header: "Yangi Food" tugmasi → `/calories/create`
  - Har qatorda: Tahrirlash (→ `/calories/:id/edit`) + O'chirish
- **Categories tab:**
  - Kichik jadval: Kategoriya rasmi, Nomi (uz), O'chirish tugmasi
  - Inline form: yangi kategoriya yaratish (nomi uz/ru/eng + rasm upload)

### 4. Food yaratish/tahrirlash sahifasi — `src/views/calories/FoodEdit.vue`
Form maydonlari:
- **Rasm:** `<FileUpload>` → coverUrl
- **Nomi:** 4 ta input (uz, ru, eng, cyrl) — `Mlf` model
- **Tavsif:** textarea (max 500)
- **Kategoriya:** `<ElSelect>` categories dan
- **Metrics jadvali:** har bir metric (Protein, Fat, Carb, Kcal, Water) uchun number input
  - `["Protein", "Fat", "Carb", "Kcal", "Water"]` loop qilinadi

Create rejimi: `POST /food/general`, Edit rejimi: `PUT /food/{foodId}`

### 5. Router — `src/views/router.ts`
```ts
{
  path: "/calories",
  name: "calories",
  component: () => import("../calories/Index.vue"),
},
{
  path: "/calories/create",
  name: "food_create",
  component: () => import("../calories/FoodEdit.vue"),
},
{
  path: "/calories/:foodId/edit",
  name: "food_edit",
  component: () => import("../calories/FoodEdit.vue"),
},
```

---

## Muhim fayllar (o'zgartiriladi)

- `src/@types/common.ts` — yangi tiplar qo'shish
- `src/views/router.ts` — `/calories/create` va `/:foodId/edit` routelar
- `src/views/calories/Index.vue` — to'liq qayta yozish

## Yangi fayllar

- `src/stores/foodStore.ts`
- `src/views/calories/FoodEdit.vue`

---

## Qayta ishlatiladigan komponentlar

- `src/components/shared/DataTable.vue` — food list uchun
- `src/components/shared/FileUpload.vue` — food va category rasmlari uchun
- `src/components/ui/Card.vue` — sahifa konteyneri
- `src/stores/apiCallStore.ts` — `execute()` pattern
- `src/integrations/axios.ts` — `axios`, `makeFileUrl()`

---

## Tekshirish (Verification)

1. `pnpm dev` — dev server ishga tushirish (port 7777)
2. `/calories` sahifasiga kirib foods jadvalini ko'rish
3. "Yangi Food" tugmasini bosib forma to'ldirish va saqlash
4. Mavjud foodga edit qilib yangilash
5. Food o'chirish
6. Categories tabida kategoriya yaratish va o'chirish
7. Network tabda API so'rovlarini tekshirish (staging.calora.uz/api/food)
