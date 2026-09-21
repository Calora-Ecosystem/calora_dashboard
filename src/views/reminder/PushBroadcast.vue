<script setup lang="ts">
import {
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElRadioButton,
  ElRadioGroup,
  FormInstance,
  FormRules,
} from "element-plus";
import { onMounted, reactive, ref } from "vue";
import FileUpload from "../../components/shared/FileUpload.vue";
import { useNotificationStore } from "../../stores/notificationStore";
import { usePushHistoryStore } from "../../stores/pushHistoryStore";

const notificationStore = useNotificationStore();
const pushHistoryStore = usePushHistoryStore();

type Mode = "now" | "schedule";

const form = ref<FormInstance>();

const data = reactive<{
  title: string;
  description: string;
  image: string | null;
  mode: Mode;
  scheduled: string | null;
}>({
  title: "",
  description: "",
  image: null,
  mode: "now",
  scheduled: null,
});

const rules = reactive<FormRules<typeof data>>({
  title: [
    { required: true, message: "Sarlavha kiritilishi shart", trigger: "blur" },
    { max: 100, message: "Maksimal 100 ta belgi", trigger: "blur" },
  ],
  description: [
    { required: true, message: "Matn kiritilishi shart", trigger: "blur" },
    { max: 255, message: "Maksimal 255 ta belgi", trigger: "blur" },
  ],
  scheduled: [
    {
      validator: (_rule, value, callback) => {
        if (data.mode === "schedule") {
          if (!value) return callback(new Error("Yuborish vaqtini tanlang"));
          if (new Date(value).getTime() <= Date.now())
            return callback(new Error("Vaqt hozirgidan keyin bo'lishi kerak"));
        }
        callback();
      },
      trigger: "change",
    },
  ],
});

// O'tgan kunlarni tanlab bo'lmasin.
const disabledDate = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

// ── Auditoriya ────────────────────────────────────────────────
const audienceTotal = ref<number | null>(null);
onMounted(async () => {
  try {
    audienceTotal.value = await notificationStore.getUsersTotal();
  } catch {
    audienceTotal.value = null;
  }
});

// ── Yuborish holati ───────────────────────────────────────────
const sending = ref(false);
const result = ref<{ count: number; scheduled: string | null } | null>(null);

const resetResult = () => {
  result.value = null;
};

const handleSend = async () => {
  try {
    await form.value?.validate();
  } catch {
    return;
  }

  const scheduledIso = data.mode === "schedule" ? data.scheduled : null;
  const whenLabel = scheduledIso
    ? `belgilangan vaqtda (${scheduledIso.slice(0, 16).replace("T", " ")})`
    : "hoziroq";
  const countLabel =
    audienceTotal.value != null ? ` (${audienceTotal.value} ta)` : "";

  try {
    await ElMessageBox.confirm(
      `Push barcha foydalanuvchilarga${countLabel} ${whenLabel} yuboriladi. Davom etamizmi?`,
      "Tasdiqlash",
      {
        confirmButtonText: "Ha, yuborilsin",
        cancelButtonText: "Bekor qilish",
        type: "warning",
      },
    );
  } catch {
    return; // bekor qilindi
  }

  resetResult();
  sending.value = true;
  try {
    const res = await notificationStore.sendBatch({
      title: data.title.trim(),
      description: data.description.trim(),
      image: data.image,
      scheduled: scheduledIso,
      allUsers: true,
    });
    if (res.code === 200) {
      const count =
        typeof res.content === "number" ? res.content : audienceTotal.value ?? 0;
      result.value = { count, scheduled: scheduledIso };
      pushHistoryStore.record({
        title: data.title.trim(),
        description: data.description.trim(),
        image: data.image,
        audienceType: "all",
        audienceLabel: "Barcha foydalanuvchilar",
        recipientCount: count,
        scheduled: scheduledIso,
      });
      ElMessage.success(
        scheduledIso
          ? `${count} ta foydalanuvchiga rejalashtirildi`
          : `${count} ta foydalanuvchiga yuborildi`,
      );
    }
    // Xato bo'lsa apiCallStore avtomatik bildirishnoma ko'rsatadi.
  } catch {
    // execute() xatoni allaqachon qayd etadi
  } finally {
    sending.value = false;
  }
};

const startNew = () => {
  resetResult();
  data.title = "";
  data.description = "";
  data.image = null;
  data.mode = "now";
  data.scheduled = null;
};
</script>

<template>
  <ElForm
    ref="form"
    :rules="rules"
    :model="data"
    class="edit-form"
    @submit.prevent="handleSend"
  >
    <!-- Sticky header -->
    <div class="form-header">
      <div class="flex items-center gap-3 min-w-0">
        <span class="hicon">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </span>
        <div class="min-w-0">
          <h1 class="text-[19px] font-bold truncate" style="color: var(--text)">
            Push yuborish
          </h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">
            Barcha foydalanuvchilarga bildirishnoma jo'nating
          </p>
        </div>
      </div>
      <button
        type="button"
        class="hbtn-save"
        :disabled="sending"
        @click="handleSend"
      >
        <span v-if="sending" class="spinner"></span>
        <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        {{ sending ? "Yuborilmoqda..." : "Yuborish" }}
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
                <ElInput
                  v-model="data.title"
                  placeholder="Bildirishnoma sarlavhasi"
                  size="large"
                  maxlength="100"
                  show-word-limit
                  :disabled="sending"
                />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Matn</label>
              <ElFormItem prop="description" class="!mb-0">
                <ElInput
                  v-model="data.description"
                  type="textarea"
                  :rows="6"
                  placeholder="Push matni"
                  maxlength="255"
                  show-word-limit
                  :disabled="sending"
                />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Rasm (ixtiyoriy)</label>
              <FileUpload v-model="data.image" accept="image/*" />
            </div>
          </div>
        </section>

        <!-- Natija -->
        <section v-if="result" class="panel">
          <div class="result-card">
            <span class="result-icon">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </span>
            <div class="min-w-0">
              <p class="result-title">
                {{ result.scheduled ? "Rejalashtirildi" : "Yuborildi" }}
              </p>
              <p class="result-sub">
                {{ result.count }} ta foydalanuvchiga
                <template v-if="result.scheduled">
                  · {{ result.scheduled.slice(0, 16).replace("T", " ") }}
                </template>
              </p>
            </div>
            <button type="button" class="btn-ghost" @click="startNew">
              Yangi xabar
            </button>
          </div>
        </section>
      </div>

      <!-- RIGHT -->
      <div class="space-y-5 min-w-0">
        <section class="panel">
          <h2 class="panel-title">Yetkazish</h2>
          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Vaqt</label>
              <ElRadioGroup v-model="data.mode" :disabled="sending" class="w-full mode-group">
                <ElRadioButton value="now">Hoziroq</ElRadioButton>
                <ElRadioButton value="schedule">Rejalashtirish</ElRadioButton>
              </ElRadioGroup>
            </div>
            <div v-if="data.mode === 'schedule'">
              <label class="lbl">Yuborish vaqti</label>
              <ElFormItem prop="scheduled" class="!mb-0">
                <ElDatePicker
                  v-model="data.scheduled"
                  type="datetime"
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DDTHH:mm:ss"
                  placeholder="Sana va vaqtni tanlang"
                  size="large"
                  class="w-full"
                  :disabled-date="disabledDate"
                  :disabled="sending"
                />
              </ElFormItem>
              <p class="hint">Belgilangan vaqtda push avtomatik yuboriladi.</p>
            </div>
            <p v-else class="hint">Xabar tasdiqlangach darhol yuboriladi.</p>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel-title">Auditoriya</h2>
          <div class="audience mt-4">
            <span class="audience-icon">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <div class="min-w-0">
              <p class="audience-title">Barcha foydalanuvchilar</p>
              <p class="audience-sub">
                <template v-if="audienceTotal != null">{{ audienceTotal }} ta foydalanuvchi</template>
                <template v-else>Soni aniqlanmoqda…</template>
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
.hicon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-strong);
  background: var(--brand-soft);
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
.mode-group :deep(.el-radio-button),
.mode-group :deep(.el-radio-button__inner) {
  width: 50%;
}
.mode-group {
  display: flex;
}
.result-card {
  display: flex;
  align-items: center;
  gap: 14px;
}
.result-icon {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--success);
  background: var(--success-soft);
  flex-shrink: 0;
}
.result-title {
  font-size: 15.5px;
  font-weight: 700;
  color: var(--text);
}
.result-sub {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 1px;
}
.btn-ghost {
  margin-left: auto;
  height: 40px;
  padding: 0 18px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-strong);
  background: var(--brand-soft);
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.btn-ghost:hover {
  filter: brightness(0.97);
}
.audience {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--surface-2);
}
.audience-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-strong);
  background: var(--brand-soft);
  flex-shrink: 0;
}
.audience-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.audience-sub {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 1px;
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
