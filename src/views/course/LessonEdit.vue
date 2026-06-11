<script setup lang="ts">
import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElMessage,
  FormInstance,
  FormRules,
} from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  Asset,
  Mlf,
  TMetrics,
  ActivityType,
  ComputationType,
  EntityType,
} from "../../@types/common";
import FileUpload from "../../components/shared/FileUpload.vue";
import { useCourseStore } from "../../stores/courseStore";
import { useAppStore } from "../../stores/appStore";
import {
  ACTIVITIES,
  ASSET_TYPES,
  COMPUTATION_TYPE,
  ENTITY_TYPES,
  METRICS,
} from "../../constants/ApiContstants";
import ComputationEdit from "./components/ComputationEdit.vue";

const courseStore = useCourseStore();
const router = useRouter();
const appStore = useAppStore();

const data = reactive<{
  id?: number;
  title: Mlf;
  description: Mlf;
  order: number;
  courseId: number;
  isFree: boolean;
  duration: string;
  assets: Asset[];
}>({
  title: { uz: "", ru: "", eng: "" },
  description: { uz: "", ru: "", eng: "" },
  order: 0,
  courseId: Number(router.currentRoute.value.params.courseId),
  isFree: false,
  duration: "",
  assets: [
    { type: "CoverImage", url: "" },
    { type: "Video", url: "" },
  ],
});

const rules = reactive<FormRules<typeof data>>({
  title: {
    required: true,
    fields: {
      uz: { required: true, type: "string" },
      ru: { required: true, type: "string" },
      eng: { required: true, type: "string" },
    },
    type: "object",
  },
  description: {
    required: true,
    type: "object",
    fields: {
      "description.uz": { required: true },
      "description.ru": { required: true },
      "description.eng": { required: true },
    },
  },
  order: [
    { required: true, message: "Order is required" },
    { type: "number", min: 0, message: "Order must be a positive number" },
  ],
  duration: { required: true, message: "Duration is required" },
  courseId: { required: true, message: "Course ID is required" },
  assets: {
    type: "array",
    len: 2,
    fields: {
      0: {
        type: "object",
        fields: {
          url: { required: true, message: "URL is required" },
        },
      },
      1: {
        type: "object",
        fields: {
          url: { required: true, message: "URL is required" },
        },
      },
    },
  },
  isFree: { required: true, message: "Is Free is required" },
});

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

    await courseStore.modifyLesson(data);

    ElMessage.success(isEdit.value ? "Dars yangilandi" : "Dars qo'shildi");
    router.back();
  } catch (error) {}
};

onMounted(async () => {
  if (router.currentRoute.value.name !== "lesson_edit") {
    return;
  }
  await courseStore
    .getLessonById(Number(router.currentRoute.value.params.lessonId))
    .then((response) => {
      const assets: any[] = [];
      assets.push(
        response.assets?.find((x: any) => x.type === ASSET_TYPES[3]) ?? {
          type: ASSET_TYPES[3],
          url: "",
        },
      );
      assets.push(
        response.assets?.find((x: any) => x.type === ASSET_TYPES[4]) ?? {
          type: ASSET_TYPES[4],
          url: "",
        },
      );
      Object.assign(data, { ...response, assets });
    });
});
</script>
<template>
  <ElForm
    ref="form"
    :rules="rules"
    :model="data"
    class="edit-form"
    @submit.prevent="handleSubmit"
  >
    <!-- Sticky header -->
    <div class="form-header">
      <div class="flex items-center gap-3 min-w-0">
        <button type="button" class="hbtn-back" @click="router.back()">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="min-w-0">
          <h1 class="text-[19px] font-bold truncate" style="color: var(--text)">
            {{ isEdit ? "Darsni tahrirlash" : "Yangi dars qo'shish" }}
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">Dars ma'lumotlarini to'ldiring</p>
        </div>
      </div>
      <button type="button" class="hbtn-save" :disabled="appStore.isLoading" @click="handleSubmit">
        <span v-if="appStore.isLoading" class="spinner"></span>
        <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {{ isEdit ? "Saqlash" : "Qo'shish" }}
      </button>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
      <!-- LEFT -->
      <div class="xl:col-span-2 space-y-5 min-w-0">
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
                  <ElInput v-model="data.description[l.key]" type="textarea" :rows="5" :placeholder="`Tavsif (${l.label})`" />
                </ElFormItem>
              </template>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel-title">Media fayllar</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
            <div>
              <label class="lbl">Muqova rasmi</label>
              <ElFormItem prop="assets.0.url" class="!mb-0">
                <FileUpload v-model="data.assets[0].url" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Video</label>
              <ElFormItem prop="assets.1.url" class="!mb-0">
                <FileUpload v-model="data.assets[1].url" />
              </ElFormItem>
            </div>
          </div>
        </section>
      </div>

      <!-- RIGHT -->
      <div class="space-y-5 min-w-0">
        <section class="panel">
          <h2 class="panel-title">Sozlamalar</h2>
          <div class="space-y-4 mt-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <label class="lbl !mb-0.5">Bepul dars</label>
                <p class="text-[11.5px]" style="color: var(--text-faint)">Foydalanuvchilar uchun ochiq</p>
              </div>
              <ElFormItem prop="isFree" class="!mb-0">
                <ElSwitch v-model="data.isFree" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Tartib raqami</label>
              <ElFormItem prop="order" class="!mb-0">
                <ElInputNumber v-model="data.order" :min="0" :controls="true" size="large" class="w-full" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Davomiyligi (hh:mm:ss)</label>
              <ElFormItem prop="duration" class="!mb-0">
                <ElInput
                  v-model="data.duration"
                  v-maska="'##:##:##'"
                  placeholder="00:00:00"
                  size="large"
                />
              </ElFormItem>
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
.edit-form :deep(.el-input__wrapper),
.edit-form :deep(.el-textarea__inner),
.edit-form :deep(.el-select__wrapper) {
  border-radius: 11px;
}
.edit-form :deep(.el-input-number) {
  width: 100%;
}
</style>
