<script setup lang="ts">
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  FormInstance,
  FormRules,
} from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import type { Mlf } from "../../@types/common";
import type { FoodCategory, FoodMetricDto } from "../../@types/food";
import FileUpload from "../../components/shared/FileUpload.vue";
import { METRICS } from "../../constants/ApiContstants";
import { useAppStore } from "../../stores/appStore";
import { useFoodStore } from "../../stores/foodStore";

const foodStore = useFoodStore();
const appStore = useAppStore();
const router = useRouter();

const categories = ref<FoodCategory[]>([]);

const data = reactive<{
  id?: number;
  categoryId: number | null;
  name: Mlf;
  coverUrl: string | null;
  description: string | null;
  metrics: FoodMetricDto[];
}>({
  categoryId: null,
  name: { uz: "", ru: "", eng: "" },
  coverUrl: null,
  description: null,
  metrics: [],
});

const rules = reactive<FormRules>({
  categoryId: [{ required: true, message: "Kategoriyani tanlang", trigger: "change" }],
  "name.uz": { required: true, message: "Majburiy", trigger: "blur" },
  "name.ru": { required: true, message: "Majburiy", trigger: "blur" },
  "name.eng": { required: true, message: "Majburiy", trigger: "blur" },
  coverUrl: [{ required: true, message: "Rasm majburiy", trigger: "change" }],
  description: [{ required: true, message: "Tavsif majburiy", trigger: "blur" }],
  metrics: {
    type: "array",
    defaultField: {
      type: "object",
      fields: {
        metric: { required: true, message: "Metrika majburiy" },
        value: { required: true, type: "number", min: 0, message: "Qiymat majburiy" },
      },
    },
  },
} as any);

const form = ref<FormInstance>();
const isEdit = computed(() => !!data.id && data.id > 0);

const langs = [
  { key: "uz", label: "O'zbek" },
  { key: "ru", label: "Русский" },
  { key: "eng", label: "English" },
] as const;
const lang = ref<"uz" | "ru" | "eng">("uz");

const handleCategorySearch = async (query: string) => {
  categories.value = await foodStore.searchCategories(query);
};

const addMetric = () => {
  data.metrics.push({ metric: "Protein", value: 0 } as FoodMetricDto);
};

const removeMetric = (index: number) => {
  data.metrics.splice(index, 1);
};

const handleSubmit = async () => {
  try {
    await form.value?.validate();
    if (data.id && data.id > 0) {
      await foodStore.updateFood(data.id, data);
    } else {
      await foodStore.createFood(data);
    }
    ElMessage.success(isEdit.value ? "Taom yangilandi" : "Taom qo'shildi");
    router.back();
  } catch (error) {}
};

onMounted(async () => {
  categories.value = await foodStore.searchCategories();
});

onMounted(async () => {
  if (router.currentRoute.value.name !== "food_edit") return;
  const food = await foodStore.getFoodById(
    Number(router.currentRoute.value.params.foodId),
  );
  Object.assign(data, { ...food, metrics: food.metrics ?? [] });
  if (food.categoryId && !categories.value.find((c) => c.id === food.categoryId)) {
    const cat = await foodStore.getCategoryById(food.categoryId);
    if (cat) categories.value.unshift(cat);
  }
});
</script>

<template>
  <ElForm ref="form" :rules="rules" :model="data" class="edit-form" @submit.prevent="handleSubmit">
    <!-- Sticky header -->
    <div class="form-header">
      <div class="flex items-center gap-3 min-w-0">
        <button type="button" class="hbtn-back" @click="router.back()">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="min-w-0">
          <h1 class="text-[19px] font-bold truncate" style="color: var(--text)">
            {{ isEdit ? "Taomni tahrirlash" : "Yangi taom" }}
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">Taom ma'lumotlarini to'ldiring</p>
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
              <label class="lbl">Taom nomi</label>
              <template v-for="l in langs" :key="l.key">
                <ElFormItem v-show="lang === l.key" :prop="`name.${l.key}`" class="!mb-0">
                  <ElInput v-model="data.name[l.key]" :placeholder="`Nomi (${l.label})`" size="large" />
                </ElFormItem>
              </template>
            </div>
            <div>
              <label class="lbl">Tavsif</label>
              <ElFormItem prop="description" class="!mb-0">
                <ElInput v-model="data.description" type="textarea" :rows="5" placeholder="Taom haqida tavsif" />
              </ElFormItem>
            </div>
          </div>
        </section>

        <!-- Metrics -->
        <section class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Metrikalar (BJU / kaloriya)</h2>
            <button type="button" class="add-btn" @click="addMetric">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Qo'shish
            </button>
          </div>
          <div class="mt-4 space-y-2.5">
            <div v-if="!data.metrics.length" class="empty-box">
              Hozircha metrika yo'q. "Qo'shish" tugmasini bosing.
            </div>
            <div
              v-for="(metric, index) in data.metrics"
              :key="index"
              class="metric-row"
            >
              <ElFormItem :prop="`metrics.${index}.metric`" class="!mb-0 flex-1">
                <ElSelect v-model="metric.metric" placeholder="Metrika" class="w-full">
                  <ElOption v-for="m in METRICS" :key="m" :label="m" :value="m" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem :prop="`metrics.${index}.value`" class="!mb-0" style="width: 150px">
                <ElInputNumber v-model="metric.value" :controls="false" :min="0" placeholder="Qiymat" class="w-full" />
              </ElFormItem>
              <button type="button" class="icon-del" @click="removeMetric(index)">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- RIGHT -->
      <div class="space-y-5 min-w-0">
        <section class="panel">
          <h2 class="panel-title">Kategoriya</h2>
          <div class="mt-4">
            <ElFormItem prop="categoryId" class="!mb-0">
              <ElSelect
                v-model="data.categoryId"
                placeholder="Kategoriyani qidiring..."
                filterable
                remote
                :remote-method="handleCategorySearch"
                size="large"
                class="w-full"
              >
                <ElOption
                  v-for="cat in categories"
                  :key="cat.id"
                  :label="cat.name.uz"
                  :value="cat.id"
                />
              </ElSelect>
            </ElFormItem>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel-title">Muqova rasmi</h2>
          <div class="mt-4">
            <ElFormItem prop="coverUrl" class="!mb-0">
              <FileUpload v-model="data.coverUrl" />
            </ElFormItem>
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
.metric-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon-del {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
