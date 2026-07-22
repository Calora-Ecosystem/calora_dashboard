<script setup lang="ts">
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTimePicker,
  FormInstance,
  FormRules,
} from "element-plus";
import { onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "../../stores/appStore";
import { useReminderStore } from "../../stores/reminderStore";
import type { CreateOrUpdateReminderMessageDto } from "../../@types/reminder";
import { MENU, MOMENT_TYPES } from "../../constants/ApiContstants";

const reminderStore = useReminderStore();
const appStore = useAppStore();
const router = useRouter();
const route = useRoute();

const messageId = route.params.messageId ? Number(route.params.messageId) : undefined;
const isEdit = messageId !== undefined;

const data = reactive<CreateOrUpdateReminderMessageDto>({
  id: messageId ?? null,
  type: "Food",
  menu: "Breakfast",
  title: "",
  description: "",
  time: null,
  isActive: false,
});

const rules = reactive<FormRules<CreateOrUpdateReminderMessageDto>>({
  type: [{ required: true, message: "Tur tanlanishi shart" }],
  menu: [
    {
      validator: (_rule, value, callback) => {
        if (data.type === "Food" && !value) {
          return callback(new Error("Menyu tanlanishi shart"));
        }
        callback();
      },
      trigger: "change",
    },
  ],
  title: [
    { required: true, message: "Sarlavha kiritilishi shart" },
    { max: 100, message: "Maksimal 100 ta belgi" },
  ],
  description: [
    { required: true, message: "Tavsif kiritilishi shart" },
    { max: 500, message: "Maksimal 500 ta belgi" },
  ],
});

watch(
  () => data.type,
  (newType) => {
    if (newType !== "Food") {
      data.menu = null;
      form.value?.clearValidate("menu");
    }
  }
);

const form = ref<FormInstance>();

onMounted(async () => {
  if (!isEdit) return;
  const cached = reminderStore.editingMessage;
  if (cached && cached.id === messageId) {
    data.type = cached.type;
    data.menu = cached.menu;
    data.title = cached.title ?? "";
    data.description = cached.description ?? "";
    data.time = cached.time ?? null;
    data.isActive = cached.isActive ?? false;
    return;
  }
  const res = await reminderStore.getMessageById(messageId!);
  if (res.code === 200 && res.content) {
    data.type = res.content.type;
    data.menu = res.content.menu;
    data.title = res.content.title ?? "";
    data.description = res.content.description ?? "";
    data.time = res.content.time ?? null;
    data.isActive = res.content.isActive ?? false;
  }
});

const handleSubmit = async () => {
  try {
    await form.value?.validate();
    const res = await reminderStore.modifyMessage(data);
    if (res.code === 200) {
      reminderStore.editingMessage = null;
      ElMessage.success(isEdit ? "Xabar yangilandi" : "Xabar qo'shildi");
      router.push({ name: "reminder_messages" });
    }
  } catch {}
};
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
            {{ isEdit ? "Xabarni tahrirlash" : "Yangi eslatma xabari" }}
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">Push-bildirishnoma matnini to'ldiring</p>
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
          <h2 class="panel-title">Matn</h2>
          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Sarlavha</label>
              <ElFormItem prop="title" class="!mb-0">
                <ElInput v-model="data.title" placeholder="Eslatma sarlavhasi" size="large" maxlength="100" show-word-limit />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Tavsif</label>
              <ElFormItem prop="description" class="!mb-0">
                <ElInput v-model="data.description" type="textarea" :rows="6" placeholder="Eslatma matni" maxlength="500" show-word-limit />
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
            <div>
              <label class="lbl">Turi</label>
              <ElFormItem prop="type" class="!mb-0">
                <ElSelect v-model="data.type" placeholder="Tur" size="large" class="w-full">
                  <ElOption v-for="t in MOMENT_TYPES" :key="t" :label="t" :value="t" />
                </ElSelect>
              </ElFormItem>
            </div>
            <div v-if="data.type === 'Food'">
              <label class="lbl">Menyu</label>
              <ElFormItem prop="menu" class="!mb-0">
                <ElSelect v-model="data.menu" placeholder="Menyu" size="large" class="w-full">
                  <ElOption v-for="m in MENU" :key="m" :label="m" :value="m" />
                </ElSelect>
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Eslatma vaqti</label>
              <ElFormItem prop="time" class="!mb-0">
                <ElTimePicker
                  v-model="data.time"
                  format="HH:mm"
                  value-format="HH:mm:ss"
                  placeholder="Vaqtni tanlang"
                  size="large"
                  class="w-full"
                />
              </ElFormItem>
              <p class="hint">Belgilangan vaqtda ovqat kiritmagan userlarga push yuboriladi.</p>
            </div>
            <div class="switch-row">
              <div class="min-w-0">
                <label class="lbl !mb-0">Faol</label>
                <p class="hint !mt-0.5">Global eslatmani yoqish / o'chirish</p>
              </div>
              <ElSwitch v-model="data.isActive" />
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
.hint {
  margin-top: 6px;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--text-faint);
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
