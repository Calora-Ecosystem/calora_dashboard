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
  workoutId: number;
  assets: Asset[];
  metrics: { id: number; metric: TMetrics; value: number }[];
  computations: {
    id?: number;
    entityId: number;
    type: EntityType;
    activity: ActivityType;
    computationType: ComputationType;
    value: number;
    kcal: number;
  }[];
}>({
  title: { uz: "", ru: "", eng: "" },
  description: { uz: "", ru: "", eng: "" },
  order: 0,
  workoutId: Number(router.currentRoute.value.params.workoutId),
  assets: [
    { type: "Default", url: "" },
    { type: "Video", url: "" },
  ],
  metrics: [],
  computations: ACTIVITIES.map((x) => ({
    entityId: 0,
    type: "Exercise",
    activity: x,
    computationType: COMPUTATION_TYPE[0],
    value: 0,
    kcal: 0,
  })) as [],
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
  workoutId: { required: true, message: "Workout ID is required" },

  assets: {
    type: "array",
    len: 2,
    defaultField: {
      type: "object",
      fields: {
        url: { required: true, message: "URL is required" },
      },
    },
  },

  metrics: {
    type: "array",
    required: true,
    min: 1,
    defaultField: {
      type: "object",
      required: true,
      fields: {
        id: {
          required: true,
          message: "ID is required",
          type: "number",
          min: 0,
        },
        metric: {
          required: true,
          message: "Metric is required",
          enum: METRICS as any,
          type: "enum",
        },
        value: [
          {
            required: true,
            message: "Value is required",
            min: 1,
            max: 9_999,
            type: "number",
          },
        ],
      },
    },
  },

  computations: {
    type: "array",
    required: false,
    defaultField: {
      type: "object",
      fields: {
        type: { required: true, type: "enum", enum: ENTITY_TYPES as any },
        activity: { required: true, type: "enum", enum: ACTIVITIES as any },
        computationType: {
          required: true,
          type: "enum",
          enum: COMPUTATION_TYPE as any,
        },
        value: { required: true, type: "number", min: 1 },
        kcal: { required: true, type: "number", min: 1 },
      },
    },
  },
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

    const isEdit = !!data.id && data.id > 0;

    const responseId = await courseStore.modifyExercise(data);

    data.id = Number(responseId);

    await courseStore.modifyWorkoutComputations(
      data.computations.map((c) => ({
        ...c,
        entityId: data.id,
        id: c.id === 0 ? null : c.id,
      })),
    );

    ElMessage.success(isEdit ? "Mashq yangilandi" : "Mashq qo'shildi");
    router.back();
  } catch (error) {}
};

const handleAddMetric = () => {
  data.metrics.push({ id: data.metrics.length, metric: METRICS[0], value: 0 });
};

const loadComputations = async () => {
  let computations = await courseStore.getExerciseComputations(
    Number(data.id ?? 0),
  );

  computations = computations.map((x: any) => ({
    ...x,
    type: ENTITY_TYPES[1],
    fromType: x?.type,
    kcal: x?.kcal || 0,
  }));

  // computations.forEach((c: any) => {
  //   const d = data.computations.find((x) => x.activity === c.activity);
  //   if (!!d) Object.assign(d as any, c);
  //   else data.computations.push(c);
  // });

  Object.assign(data.computations, computations);
};

onMounted(async () => {
  if (router.currentRoute.value.name !== "exercise_edit") {
    return;
  }
  const exercise = await courseStore.getExerciseById(
    Number(router.currentRoute.value.params.exerciseId),
  );

  const assets = [
    // ...exercise.assets,
    exercise.assets.find((a: any) => a.type === "Default") ?? {
      type: "Default",
      url: "",
    },
    exercise.assets.find((a: any) => a.type === "Video") ?? {
      type: "Video",
      url: "",
    },
  ];

  Object.assign(data, { ...exercise, assets });
  await loadComputations();
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
            {{ isEdit ? "Mashqni (exercise) tahrirlash" : "Yangi exercise qo'shish" }}
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">Mashq tafsilotlarini to'ldiring</p>
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

        <!-- Metrics -->
        <section class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Metrikalar</h2>
            <button type="button" class="add-btn" @click="handleAddMetric">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Qo'shish
            </button>
          </div>
          <ElFormItem prop="metrics" class="!mb-0 mt-4">
            <div v-if="!data.metrics.length" class="empty-box">
              Hozircha metrika yo'q. "Qo'shish" tugmasini bosing.
            </div>
            <ElTable v-else :data="data.metrics" class="w-full">
              <ElTableColumn label="Metrika" prop="metric">
                <template #default="{ row }">
                  <ElFormItem :prop="`metrics.${row.id}.metric`" class="!mb-0">
                    <ElSelect v-model="row.metric" class="w-full">
                      <ElOption
                        v-for="value in METRICS.filter((r) =>
                          data.metrics.every((x) => x.metric !== r),
                        )"
                        :key="value"
                        :label="value"
                        :value="value"
                      ></ElOption>
                    </ElSelect>
                  </ElFormItem>
                </template>
              </ElTableColumn>
              <ElTableColumn label="Qiymat" prop="value" width="160">
                <template #default="{ row }">
                  <ElFormItem :prop="`metrics.${row.id}.value`" class="!mb-0">
                    <ElInputNumber v-model="row.value" :min="0" :max="9_999" class="w-full" />
                  </ElFormItem>
                </template>
              </ElTableColumn>
              <ElTableColumn width="90" align="right">
                <template #default="{ row }">
                  <button
                    type="button"
                    class="icon-del"
                    @click="
                      () =>
                        data.metrics.splice(
                          data.metrics.findIndex((m) => m.id === row.id),
                          1,
                        )
                    "
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </template>
              </ElTableColumn>
            </ElTable>
          </ElFormItem>
        </section>

        <!-- Computations -->
        <section class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Hisob-kitoblar (Computations)</h2>
            <span class="hint-chip">Aktivlik bo'yicha qiymatlar</span>
          </div>
          <ElFormItem prop="computations" class="!mb-0 mt-4">
            <ComputationEdit
              type="Exercise"
              :entityId="data.id as number"
              v-model="data.computations"
            />
          </ElFormItem>
        </section>
      </div>

      <!-- RIGHT -->
      <div class="space-y-5 min-w-0">
        <section class="panel">
          <h2 class="panel-title">Media fayllar</h2>
          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Lottie / Gif</label>
              <ElFormItem prop="assets.0.url" class="!mb-0">
                <FileUpload v-model="data.assets[0].url" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Video havolasi (URL)</label>
              <ElFormItem prop="assets.1.url" class="!mb-0">
                <ElInput
                  v-model="data.assets[1].url"
                  type="url"
                  placeholder="https://..."
                  size="large"
                />
              </ElFormItem>
            </div>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel-title">Sozlamalar</h2>
          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Tartib raqami</label>
              <ElFormItem prop="order" class="!mb-0">
                <ElInputNumber v-model="data.order" :min="0" :controls="true" size="large" class="w-full" />
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
.hint-chip {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 3px 10px;
  border-radius: 999px;
}
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border: 1px solid transparent;
  transition: all 0.15s ease;
}
.add-btn:hover {
  filter: brightness(0.97);
}
.icon-del {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--danger, #ef4444);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.icon-del:hover {
  color: #fff;
  background: var(--danger, #ef4444);
}
.empty-box {
  width: 100%;
  text-align: center;
  padding: 22px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  font-size: 13px;
  color: var(--text-faint);
  background: var(--surface-2);
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
