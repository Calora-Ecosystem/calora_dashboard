<script setup lang="ts">
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  FormInstance,
  FormRules,
} from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import type { Mlf } from "../../@types/common";
import FileUpload from "../../components/shared/FileUpload.vue";
import { useAppStore } from "../../stores/appStore";
import { useFoodStore } from "../../stores/foodStore";

const foodStore = useFoodStore();
const appStore = useAppStore();
const router = useRouter();

const data = reactive<{
  id?: number;
  name: Mlf;
  coverUrl: string | null;
}>({
  name: { uz: "", ru: "", eng: "" },
  coverUrl: null,
});

const rules = reactive<FormRules>({
  "name.uz": { required: true, message: "Majburiy", trigger: "blur" },
  "name.ru": { required: true, message: "Majburiy", trigger: "blur" },
  "name.eng": { required: true, message: "Majburiy", trigger: "blur" },
  coverUrl: [{ required: true, message: "Rasm majburiy", trigger: "change" }],
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
    await foodStore.saveCategory(data);
    ElMessage.success(isEdit.value ? "Kategoriya yangilandi" : "Kategoriya qo'shildi");
    router.back();
  } catch (error) {}
};

onMounted(async () => {
  if (router.currentRoute.value.name !== "category_edit") return;
  const categoryId = Number(router.currentRoute.value.params.categoryId);
  const category = await foodStore.getCategoryById(categoryId);
  if (category) Object.assign(data, category);
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
            {{ isEdit ? "Kategoriyani tahrirlash" : "Yangi kategoriya" }}
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">Kategoriya ma'lumotlarini to'ldiring</p>
        </div>
      </div>
      <button type="button" class="hbtn-save" :disabled="appStore.isLoading" @click="handleSubmit">
        <span v-if="appStore.isLoading" class="spinner"></span>
        <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {{ isEdit ? "Saqlash" : "Qo'shish" }}
      </button>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
      <div class="xl:col-span-2 space-y-5 min-w-0">
        <section class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Nomi</h2>
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
          <div class="mt-4">
            <label class="lbl">Kategoriya nomi</label>
            <template v-for="l in langs" :key="l.key">
              <ElFormItem v-show="lang === l.key" :prop="`name.${l.key}`" class="!mb-0">
                <ElInput v-model="data.name[l.key]" :placeholder="`Nomi (${l.label})`" size="large" />
              </ElFormItem>
            </template>
          </div>
        </section>
      </div>

      <div class="space-y-5 min-w-0">
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
</style>
