<script setup lang="ts">
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
  FormInstance,
  FormRules,
} from "element-plus";
import FileUpload from "../../components/shared/FileUpload.vue";
import { computed, onMounted, reactive, ref } from "vue";
import { Asset, CourseType, Gender, Mlf } from "../../@types/common";
import { useCourseStore } from "../../stores/courseStore";
import { useRouter } from "vue-router";
import { useAppStore } from "../../stores/appStore";
import { makeFileUrl } from "../../integrations/axios";

const courseStore = useCourseStore();
const router = useRouter();
const appStore = useAppStore();

const data = reactive<{
  id?: number;
  title: Mlf;
  description: Mlf;
  order: number;
  type: CourseType | null;
  gender?: Gender;
  info: Mlf;
  assets: Asset[];
}>({
  title: { uz: "", ru: "", eng: "" },
  description: { uz: "", ru: "", eng: "" },
  info: { uz: "", ru: "", eng: "" },
  gender: undefined,
  order: 0,
  type: null,
  assets: [
    { type: "MainImage", url: "" },
    { type: "SubCoverImage", url: "" },
  ],
});

const rules = reactive<FormRules<typeof data>>({
  "title.uz": { required: true, message: "Majburiy", trigger: "blur" },
  "title.ru": { required: true, message: "Majburiy", trigger: "blur" },
  "title.eng": { required: true, message: "Majburiy", trigger: "blur" },
  "description.uz": { required: true, message: "Majburiy", trigger: "blur" },
  "description.ru": { required: true, message: "Majburiy", trigger: "blur" },
  "description.eng": { required: true, message: "Majburiy", trigger: "blur" },
  "info.uz": { required: true, message: "Majburiy", trigger: "blur" },
  "info.ru": { required: true, message: "Majburiy", trigger: "blur" },
  "info.eng": { required: true, message: "Majburiy", trigger: "blur" },
  gender: [{ required: true, message: "Jinsni tanlang", trigger: "change" }],
  type: [{ required: true, message: "Turini tanlang", trigger: "change" }],
  order: [{ required: true, type: "number", min: 0, message: "Tartib raqami", trigger: "blur" }],
  "assets.0.url": { required: true, message: "Rasm majburiy", trigger: "change" },
  "assets.1.url": { required: true, message: "Rasm majburiy", trigger: "change" },
} as any);

const form = ref<FormInstance>();
const isEdit = computed(() => !!data.id && data.id > 0);

const langs = [
  { key: "uz", label: "O'zbek" },
  { key: "ru", label: "Русский" },
  { key: "eng", label: "English" },
] as const;
const lang = ref<"uz" | "ru" | "eng">("uz");

const handleSubmit = async () => {
  try {
    await form.value?.validate();
    await courseStore.modifyCourse(data);
    router.back();
  } catch (e) {}
};

onMounted(async () => {
  if (router.currentRoute.value.name !== "course_edit") return;
  const course = await courseStore.getCourseById(
    router.currentRoute.value.query.gender as string,
    Number(router.currentRoute.value.params.courseId),
  );
  Object.assign(data, course);
  if (!data.assets[1]) data.assets[1] = { type: "SubCoverImage", url: "" };
});

const previewImg = computed(() =>
  data.assets[0]?.url ? makeFileUrl(data.assets[0].url) : null,
);
</script>

<template>
  <ElForm ref="form" :rules="rules" :model="data" class="course-form">
    <!-- Sticky header -->
    <div class="form-header">
      <div class="flex items-center gap-3 min-w-0">
        <button type="button" class="hbtn-back" @click="router.back()">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="min-w-0">
          <h1 class="text-[19px] font-bold truncate" style="color: var(--text)">
            {{ isEdit ? "Kursni tahrirlash" : "Yangi kurs yaratish" }}
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">Kurs ma'lumotlarini to'ldiring</p>
        </div>
      </div>
      <button type="button" class="hbtn-save" :disabled="appStore.isLoading" @click="handleSubmit">
        <span v-if="appStore.isLoading" class="spinner"></span>
        <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {{ isEdit ? "Saqlash" : "Yaratish" }}
      </button>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
      <!-- LEFT: form sections -->
      <div class="xl:col-span-2 space-y-5 min-w-0">
        <!-- Matnli kontent -->
        <section class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Matnli kontent</h2>
            <div class="lang-tabs">
              <button
                v-for="l in langs"
                :key="l.key"
                type="button"
                class="lang-tab"
                :class="{ 'lang-active': lang === l.key }"
                @click="lang = l.key"
              >{{ l.label }}</button>
            </div>
          </div>

          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Sarlavha</label>
              <template v-for="l in langs" :key="l.key">
                <ElFormItem v-show="lang === l.key" :prop="`title.${l.key}`" class="!mb-0">
                  <ElInput v-model="data.title[l.key]" :placeholder="`Sarlavha (${l.label})`" size="large" />
                </ElFormItem>
              </template>
            </div>

            <div>
              <label class="lbl">Tavsif</label>
              <template v-for="l in langs" :key="l.key">
                <ElFormItem v-show="lang === l.key" :prop="`description.${l.key}`" class="!mb-0">
                  <ElInput v-model="data.description[l.key]" type="textarea" :rows="4" :placeholder="`Tavsif (${l.label})`" />
                </ElFormItem>
              </template>
            </div>

            <div>
              <label class="lbl">Qo'shimcha ma'lumot</label>
              <template v-for="l in langs" :key="l.key">
                <ElFormItem v-show="lang === l.key" :prop="`info.${l.key}`" class="!mb-0">
                  <ElInput v-model="data.info[l.key]" type="textarea" :rows="4" :placeholder="`Ma'lumot (${l.label})`" />
                </ElFormItem>
              </template>
            </div>
          </div>
        </section>

        <!-- Media -->
        <section class="panel">
          <h2 class="panel-title">Media fayllar</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
            <div>
              <label class="lbl">Asosiy rasm</label>
              <ElFormItem prop="assets.0.url" class="!mb-0">
                <FileUpload v-model="data.assets[0].url" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Qo'shimcha muqova</label>
              <ElFormItem prop="assets.1.url" class="!mb-0">
                <FileUpload v-model="data.assets[1].url" />
              </ElFormItem>
            </div>
          </div>
        </section>
      </div>

      <!-- RIGHT: settings + preview -->
      <div class="space-y-5 min-w-0">
        <section class="panel">
          <h2 class="panel-title">Sozlamalar</h2>
          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Kurs turi</label>
              <ElFormItem prop="type" class="!mb-0">
                <ElSelect v-model="data.type" placeholder="Tanlang" size="large" class="w-full">
                  <ElOption label="Darslar (Lesson)" value="Lesson" />
                  <ElOption label="Mashqlar (Workout)" value="Workout" />
                </ElSelect>
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Jins</label>
              <ElFormItem prop="gender" class="!mb-0">
                <ElSelect v-model="data.gender" placeholder="Tanlang" size="large" class="w-full">
                  <ElOption label="Erkaklar" value="Male" />
                  <ElOption label="Ayollar" value="Female" />
                </ElSelect>
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Tartib raqami</label>
              <ElFormItem prop="order" class="!mb-0">
                <ElInputNumber v-model="data.order" :min="0" :controls="true" size="large" class="w-full" />
              </ElFormItem>
            </div>
          </div>
        </section>

        <!-- Live preview -->
        <section class="panel">
          <h2 class="panel-title">Ko'rinish (preview)</h2>
          <div class="preview-card mt-4">
            <div class="preview-cover">
              <img v-if="previewImg" :src="previewImg" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center" style="color: var(--text-faint)">
                <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              <span v-if="data.type" class="preview-badge" :style="{ background: data.type === 'Workout' ? 'var(--brand-soft)' : 'var(--info-soft)', color: data.type === 'Workout' ? 'var(--brand-strong)' : 'var(--info)' }">
                {{ data.type === 'Workout' ? 'Mashqlar' : 'Darslar' }}
              </span>
            </div>
            <div class="p-3.5">
              <h3 class="text-[15px] font-bold line-clamp-1" style="color: var(--text)">
                {{ data.title[lang] || "Kurs sarlavhasi" }}
              </h3>
              <p class="text-[12.5px] mt-1 line-clamp-2" style="color: var(--text-muted)">
                {{ data.description[lang] || "Kurs tavsifi shu yerda ko'rinadi" }}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </ElForm>
</template>

<style scoped>
.form-header {
  position: sticky;
  top: -28px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}
.hbtn-back {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.hbtn-back:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.hbtn-save {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 22px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 6px 16px rgba(var(--brand-rgb), 0.3);
  transition: all 0.18s ease;
}
.hbtn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(var(--brand-rgb), 0.42);
}
.hbtn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.lbl {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 7px;
}

.lang-tabs {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.lang-tab {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.15s ease;
}
.lang-tab:hover {
  color: var(--text);
}
.lang-active {
  background: var(--surface);
  color: var(--brand-strong);
  box-shadow: var(--shadow-sm);
}

.preview-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--surface-2);
}
.preview-cover {
  position: relative;
  height: 130px;
  background: var(--surface-hover);
}
.preview-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2.5px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.course-form :deep(.el-input__wrapper),
.course-form :deep(.el-textarea__inner),
.course-form :deep(.el-select__wrapper) {
  border-radius: 11px;
}
.course-form :deep(.el-input-number) {
  width: 100%;
}
</style>
