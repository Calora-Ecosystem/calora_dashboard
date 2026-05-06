---
name: Calora Dashboard — Loyiha Strukturasi
description: src/ papkasi ichidagi barcha fayllar, store funksiyalari, route lar, komponentlar va konstantalar to'liq ro'yxati
type: project
---

## Dependencies (package.json)

| Paket                        | Maqsad                              |
| ---------------------------- | ----------------------------------- |
| vue ^3.5                     | Asosiy framework                    |
| vue-router ^4.6              | Routing                             |
| pinia ^3.0                   | State management                    |
| pinia-plugin-persistedstate  | Token ni localStorage da saqlash    |
| element-plus ^2.13           | UI komponentlar (Uzbek locale)      |
| @element-plus/icons-vue      | Element Plus ikonalar               |
| axios ^1.13                  | HTTP client                         |
| tailwindcss ^4.1             | CSS framework                       |
| @tailwindcss/vite            | Tailwind Vite plugin                |
| chart.js + vue-chartjs       | Grafik/chart                        |
| jwt-decode ^4.0              | JWT token decode                    |
| maska ^3.2                   | Input mask (vMaska directive)       |
| vue3-lottie ^3.3             | Lottie animatsiyalar                |
| idb-keyval ^6.2              | IndexedDB cache (Lottie uchun)      |
| vite-svg-loader ^5.1         | SVG ni Vue komponent sifatida import |

---

## src/ Papka Strukturasi

```
src/
├── @types/           # TypeScript type definitsiyalar
│   ├── common.ts     # ApiBaseResponse, CourseType va umumiy tiplar
│   ├── food.ts       # FoodDto, FoodCategory, CreateFoodDto, CreateFoodCategoryDto va h.k.
│   ├── handler.ts    # HandlerChain tipi (apiCallStore uchun)
│   └── user.ts       # GetAllUsersDto
├── assets/
│   ├── brand.svg
│   ├── empty.svg
│   ├── upload-image.svg
│   ├── icons/arrow-right.svg
│   ├── navbar/       # bookmark, calories, home, money-bag, notification, preference, user-edit, user-stat, users, hide-bg
│   └── summary/      # course, down, stat, timer, up, user-group
├── components/
│   ├── MenuItem.vue          # Navbar menu elementi (icon + label + active state)
│   ├── shared/
│   │   ├── SvgIcon.vue       # Global: <svg-icon icon="path.svg"> — src/assets/ dan yuklaydi
│   │   ├── FileUpload.vue    # ElUpload wrapper, makeFileUrl() ishlatadi
│   │   ├── DataTable.vue     # Barcha list view larda ishlatiladi (ElTable + ElPagination + IfEmpty)
│   │   ├── CourseCard.vue    # Kurs kartochkasi (image, delete, edit)
│   │   ├── CopyText.vue      # Matn nusxalash (clipboard)
│   │   ├── GenderSelect.vue  # Male/Female toggle button group
│   │   ├── IfEmpty.vue       # Bo'sh holat (ElEmpty + slot)
│   │   ├── Lottie.vue        # Lottie animatsiya (idb-keyval cache bilan)
│   │   └── SummaryCard.vue   # Dashboard summary kartochka (RouterLink bilan)
│   └── ui/
│       ├── Card.vue          # Umumiy karta wrapper (title slot)
│       ├── Header.vue        # Sahifa header (Profile.vue ichida)
│       ├── Navbar.vue        # Chap sidebar navigatsiya
│       ├── Profile.vue       # Avatar + logout dropdown
│       ├── SalesChart.vue    # Chart.js grafik (vue-chartjs)
│       └── SalesSummary.vue  # Dashboard sales summary kartochalari
├── constants/
│   └── ApiContstants.ts      # Barcha domain enum lar (quyida)
├── integrations/
│   └── axios.ts              # axios instance, API_BASE_URL, makeFileUrl()
├── stores/                   # Barcha Pinia store lar (quyida)
├── utils/
│   └── FormatHelper.ts       # formatMoney(), formatDate()
├── views/
│   ├── auth/SignIn.vue
│   ├── calories/             # FoodCategories, FoodCategoryEdit, Foods, FoodEdit, Index
│   ├── common/NotFound.vue
│   ├── course/               # VideoCourse, CourseEdit, Workouts, WorkoutEdit, Exercises, ExerciseEdit, Lessons, LessonEdit
│   │   └── components/       # ComputationEdit, ExerciseCard, LessonsCard
│   ├── home/                 # Dashboard, Users, Sales, Premium, Notifications, References, Team, index.vue
│   ├── layouts/              # MainLayout, AuthLayout, EmptyLayout, ScreenLayout
│   └── router.ts
├── App.vue
├── main.js
├── style.css
└── env.d.ts
```

---

## Route lar (router.ts)

| Route name        | Path                                              | Component              |
| ----------------- | ------------------------------------------------- | ---------------------- |
| dashboard         | /dashboard                                        | Dashboard.vue          |
| users             | /users                                            | Users.vue              |
| sales             | /sales                                            | Sales.vue              |
| premium           | /premium                                          | Premium.vue            |
| notifications     | /notifications                                    | Notifications.vue      |
| references        | /references                                       | References.vue         |
| team              | /team                                             | Team.vue               |
| course            | /courses                                          | VideoCourse.vue        |
| course_create     | /courses/create                                   | CourseEdit.vue         |
| course_edit       | /courses/:courseId                                | CourseEdit.vue         |
| workouts          | /courses/:courseId/workouts                       | Workouts.vue           |
| workout_create    | /courses/:courseId/workouts/create                | WorkoutEdit.vue        |
| workout_edit      | /courses/:courseId/workouts/:workoutId            | WorkoutEdit.vue        |
| exercises         | /courses/:courseId/workouts/:workoutId/exercises  | Exercises.vue          |
| exercises_create  | .../exercises/create                              | ExerciseEdit.vue       |
| exercise_edit     | .../exercises/:exerciseId                         | ExerciseEdit.vue       |
| lessons           | /courses/:courseId/lessons                        | Lessons.vue            |
| lesson_create     | /courses/:courseId/lessons/create                 | LessonEdit.vue         |
| lesson_edit       | /courses/:courseId/lessons/:lessonId              | LessonEdit.vue         |
| calories          | /calories                                         | calories/Index.vue     |
| food_categories   | /calories/categories                              | FoodCategories.vue     |
| category_create   | /calories/categories/create                       | FoodCategoryEdit.vue   |
| category_edit     | /calories/categories/:categoryId                  | FoodCategoryEdit.vue   |
| foods             | /calories/foods                                   | Foods.vue              |
| food_create       | /calories/foods/create                            | FoodEdit.vue           |
| food_edit         | /calories/foods/:foodId                           | FoodEdit.vue           |
| (auth)            | /auth/sign-in                                     | SignIn.vue             |
| NotFound          | /:pathMatch(.*)*                                  | NotFound.vue           |

---

## Stores

### `useApiCallStore` — `src/stores/apiCallStore.ts`
Middleware chain. Barcha API chaqiruvlar shu orqali o'tadi.
```ts
const { execute } = useApiCallStore()
await execute(async () => { /* axios call */ })
```

### `useTokenStore` — `src/stores/tokenStore.ts` (ID: `"tkns"`, persisted)
```ts
accessToken, refreshToken, refreshTokenExpireAt
setTokens(access, refresh, expireAt)
clearTokens()
```

### `useAuthStore` — `src/stores/authStore.ts`
```ts
isAuthenticated  // computed, JWT expiry ga qarab
sendOtp({ email })
signInViaEmail({ email, verificationCode, code })
refreshToken()
logOut()
```

### `useAppStore` — `src/stores/appStore.ts`
```ts
isLoading  // ref<boolean>
```

### `useCourseStore` — `src/stores/courseStore.ts`
```ts
// State
courses, workouts, exercises

// Courses
loadCourses(gender), getCourseById(gender, courseId), modifyCourse(data), deleteCourse(courseId)

// Workouts
loadWorkouts(courseId), getWorkoutById(workoutId), getWorkoutComputations(workoutId)
modifyWorkout(data), modifyWorkoutComputations(data[])

// Exercises
loadExercises(workoutId), getExerciseById(exerciseId), getExerciseComputations(exerciseId)
modifyExercise(data), deleteExerciseById(exerciseId)

// Lessons
getLessonsByCourseId(courseId), getLessonById(lessonId), modifyLesson(data)
```

### `useDashboardStore` — `src/stores/dashboardStore.ts`
```ts
overallSummary, salesMonthlySummary, subscriptionOrders
loadOverallSummary(), loadSalesMonthlySummary(), loadSubscriptionOrders(params)
```

### `useFoodStore` — `src/stores/foodStore.ts`
```ts
// Categories
loadCategories(params?), searchCategories(query?), saveCategory(data), getCategoryById(id)
loadCategoriesPaged(skip, take), deleteCategory(id)

// Foods
loadFoods(), loadFoodsPaged(skip, take, params?), getFoodById(id)
createFood(data), updateFood(id, data), deleteFood(id)
```

### `useUserStore` — `src/stores/userStore.ts`
```ts
loadUsersPaged(skip, take)  // → ApiBaseResponse<GetAllUsersDto[]>
```

---

## Constants (ApiContstants.ts)

```ts
METRICS       = ["Protein","Fat","Carb","Kcal","Water","Step","Weight"]
COURSE_TYPES  = ["Lesson","Workout"]
ASSET_TYPES   = ["MainImage","SubCoverImage","Default","CoverImage","Video","Lotte"]
GENDERS       = ["Male","Female"]
ENTITY_TYPES  = ["Lesson","Exercise","Workout"]
ACTIVITIES    = ["Minimal","Less","Medium","High","Maximal"]
COMPUTATION_TYPE = ["Duration","Count"]
MENU          = ["Breakfast","Lunch","Dinner","Snack"]
PLANS         = ["Free","Premium","Pro"]
ROLES         = ["SuperAdmin","User"]
```

---

## axios.ts

```ts
import { axios, API_BASE_URL, makeFileUrl } from '@/integrations/axios'

// MODE=production  → baseURL = "https://calora.uz/api"
// boshqa           → baseURL = "https://staging.calora.uz/api"

makeFileUrl(relative)  // → "{baseURL}/file/{relative}"
```

---

## FormatHelper.ts

```ts
formatMoney(value, notation?)  // UZS formatda ("compact" | "standard")
formatDate(value)              // uz-UZ locale da sana
```
