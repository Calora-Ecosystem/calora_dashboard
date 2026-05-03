<script setup lang="ts">
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  FormInstance,
  FormRules,
} from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import type { Mlf } from "../../@types/common";
import FileUpload from "../../components/shared/FileUpload.vue";
import Card from "../../components/ui/Card.vue";
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
  name: {
    required: true,
    type: "object",
    fields: {
      uz: { required: true, type: "string" },
      ru: { required: true, type: "string" },
      eng: { required: true, type: "string" },
    },
  },
  coverUrl: [{ required: true, message: "Cover is required" }],
});

const form = ref<FormInstance>();

const handleSubmit = async () => {
  try {
    await form.value?.validate();
    await foodStore.saveCategory(data);
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
  <Card class="flex justify-center">
    <ElForm
      ref="form"
      label-position="top"
      class="w-min"
      size="large"
      @submit.prevent="handleSubmit"
      :rules="rules"
      :model="data"
    >
      <ElFormItem label="Name" required>
        <div class="flex flex-row gap-x-2">
          <ElFormItem required prop="name.uz">
            <ElInput placeholder="uz" v-model="data.name.uz" />
          </ElFormItem>
          <ElFormItem required prop="name.ru">
            <ElInput placeholder="ru" v-model="data.name.ru" />
          </ElFormItem>
          <ElFormItem required prop="name.eng">
            <ElInput placeholder="en" v-model="data.name.eng" />
          </ElFormItem>
        </div>
      </ElFormItem>

      <ElFormItem label="Cover" required prop="coverUrl">
        <FileUpload v-model="data.coverUrl" />
      </ElFormItem>

      <div class="mt-3 flex justify-center">
        <ElButton
          type="primary"
          native-type="submit"
          :loading="appStore.isLoading"
        >
          {{ data.id && data.id > 0 ? "Update" : "Add" }}
        </ElButton>
      </div>
    </ElForm>
  </Card>
</template>
