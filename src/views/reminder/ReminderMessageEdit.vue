<script setup lang="ts">
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  FormInstance,
  FormRules,
} from "element-plus";
import { onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Card from "../../components/ui/Card.vue";
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
    return;
  }
  const res = await reminderStore.getMessageById(messageId!);
  if (res.code === 200 && res.content) {
    data.type = res.content.type;
    data.menu = res.content.menu;
    data.title = res.content.title ?? "";
    data.description = res.content.description ?? "";
  }
});

const handleSubmit = async () => {
  try {
    await form.value?.validate();
    const res = await reminderStore.modifyMessage(data);
    if (res.code === 200) {
      reminderStore.editingMessage = null;
      router.push({ name: "reminder_messages" });
    }
  } catch {}
};
</script>

<template>
  <Card :title="isEdit ? 'Eslatma xabarini tahrirlash' : 'Yangi eslatma xabari'">
    <div class="flex justify-center">
      <ElForm
        ref="form"
        :model="data"
        :rules="rules"
        label-position="top"
        size="large"
        style="width: 480px"
        @submit.prevent="handleSubmit"
      >
        <div class="flex flex-row gap-3">
          <ElFormItem label="Tur" prop="type" required style="flex: 1">
            <ElSelect v-model="data.type" placeholder="Tur" style="width: 100%">
              <ElOption v-for="t in MOMENT_TYPES" :key="t" :label="t" :value="t" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem
            v-if="data.type === 'Food'"
            label="Menyu"
            prop="menu"
            required
            style="flex: 1"
          >
            <ElSelect v-model="data.menu" placeholder="Menyu" style="width: 100%">
              <ElOption v-for="m in MENU" :key="m" :label="m" :value="m" />
            </ElSelect>
          </ElFormItem>
        </div>

        <ElFormItem label="Sarlavha" prop="title" required>
          <ElInput
            v-model="data.title"
            placeholder="Eslatma sarlavhasi"
            maxlength="100"
            show-word-limit
          />
        </ElFormItem>

        <ElFormItem label="Tavsif" prop="description" required>
          <ElInput
            v-model="data.description"
            type="textarea"
            :rows="4"
            placeholder="Eslatma matni"
            maxlength="500"
            show-word-limit
          />
        </ElFormItem>

        <div class="flex gap-3 mt-2">
          <ElButton @click="router.back()">Bekor qilish</ElButton>
          <ElButton
            type="primary"
            native-type="submit"
            :loading="appStore.isLoading"
          >
            Saqlash
          </ElButton>
        </div>
      </ElForm>
    </div>
  </Card>
</template>
