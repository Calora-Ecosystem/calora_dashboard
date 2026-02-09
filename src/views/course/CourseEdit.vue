<script setup lang="ts">
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
  FormInstance,
  FormRules,
} from "element-plus";
import Card from "../../components/ui/Card.vue";
import FileUpload from "../../components/shared/FileUpload.vue";
import { onMounted, reactive, ref } from "vue";
import { Asset, CourseType, Gender, Mlf } from "../../@types/common";
import { useCourseStore } from "../../stores/courseStore";
import { useRouter } from "vue-router";
import { useAppStore } from "../../stores/appStore";

const courseStore = useCourseStore();
const router = useRouter();
const appStore = useAppStore();

const data = reactive<{
  id?: number;
  title: Mlf;
  description: Mlf;
  order: number;
  type: CourseType | null;
  gender: Gender;
  info: Mlf;
  assets: Asset[];
  price: number;
}>({
  title: { uz: "", ru: "", eng: "" },
  description: { uz: "", ru: "", eng: "" },
  info: { uz: "", ru: "", eng: "" },
  price: 0,
  gender: null,
  order: 0,
  type: null,
  assets: [
    { type: "MainImage", url: "" },
    { type: "SubCoverImage", url: "" },
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
  info: {
    required: true,
    type: "object",
    fields: {
      "info.uz": { required: true },
      "info.ru": { required: true },
      "info.eng": { required: true },
    },
  },
  gender: [
    { required: true, message: "Gender is required" },
    { enum: ["Male", "Female"], message: "Invalid gender value" },
  ],
  type: [
    { required: true, message: "Type is required" },
    { enum: ["Lesson", "Workout"], message: "Invalid type value" },
  ],
  order: [
    { required: true, message: "Order is required" },
    { type: "number", min: 0, message: "Order must be a positive number" },
  ],
  price: [
    { required: true, message: "Price is required" },
    {
      type: "number",
      min: 1_000,
      message: "Price must be greater than 1000 UZS",
    },
  ],
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
});

const form = ref<FormInstance>();

const handleSubmit = async () => {
  try {
    await form.value.validate();

    await courseStore.modifyCourse(data);

    router.back();
  } catch (error) {}
};

onMounted(async () => {
  if (router.currentRoute.value.name !== "course_edit") {
    return;
  }
  const course = await courseStore.getCourseById(
    router.currentRoute.value.query.gender as string,
    Number(router.currentRoute.value.params.courseId),
  );

  Object.assign(data, course);
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
      <ElFormItem label="Title" required>
        <div class="flex flex-row gap-x-2">
          <ElFormItem required class="" prop="title.uz">
            <ElInput placeholder="uz" v-model="data.title.uz" />
          </ElFormItem>
          <ElFormItem required prop="title.ru">
            <ElInput placeholder="ru" v-model="data.title.ru" />
          </ElFormItem>
          <ElFormItem required prop="title.eng">
            <ElInput placeholder="en" v-model="data.title.eng" />
          </ElFormItem>
        </div>
      </ElFormItem>

      <ElFormItem label="Description" required>
        <div class="flex flex-row gap-x-2">
          <ElFormItem required prop="description.uz">
            <ElInput
              style="width: 250px"
              placeholder="uz"
              type="textarea"
              :rows="7"
              v-model="data.description.uz"
            />
          </ElFormItem>
          <ElFormItem required prop="description.ru">
            <ElInput
              style="width: 250px"
              placeholder="ru"
              type="textarea"
              :rows="7"
              v-model="data.description.ru"
            />
          </ElFormItem>
          <ElFormItem required prop="description.eng">
            <ElInput
              style="width: 250px"
              placeholder="en"
              type="textarea"
              :rows="7"
              v-model="data.description.eng"
            />
          </ElFormItem>
        </div>
      </ElFormItem>

      <ElFormItem label="Info" required>
        <div class="flex flex-row gap-x-2">
          <ElFormItem required prop="info.uz">
            <ElInput
              style="width: 250px"
              placeholder="uz"
              type="textarea"
              :rows="7"
              v-model="data.info.uz"
            />
          </ElFormItem>
          <ElFormItem required prop="info.ru">
            <ElInput
              style="width: 250px"
              placeholder="ru"
              type="textarea"
              :rows="7"
              v-model="data.info.ru"
            />
          </ElFormItem>
          <ElFormItem required prop="info.eng">
            <ElInput
              style="width: 250px"
              placeholder="en"
              type="textarea"
              :rows="7"
              v-model="data.info.eng"
            />
          </ElFormItem>
        </div>
      </ElFormItem>

      <div class="flex flex-row justify-start gap-x-3 min-w-0 overflow-x-auto">
        <ElFormItem label="Main Image" required prop="assets.0.url">
          <FileUpload v-model="data.assets[0].url" />
        </ElFormItem>
        <ElFormItem label="Sub Cover Image" required prop="assets.1.url">
          <FileUpload v-model="data.assets[1].url" />
        </ElFormItem>
      </div>
      <div class="flex flex-row gap-x-5">
        <ElFormItem label="Price" required prop="price">
          <ElInputNumber v-model="data.price" :controls="false">
            <template #suffix>UZS</template>
          </ElInputNumber>
        </ElFormItem>

        <ElFormItem label="Order" required prop="order">
          <ElInputNumber v-model="data.order" :controls="false" />
        </ElFormItem>

        <ElFormItem label="Gender" required prop="gender">
          <ElSelect v-model="data.gender" class="w-50!" placeholder="Tanlang">
            <ElOption value="Male"></ElOption>
            <ElOption value="Female"></ElOption>
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Course Type" required prop="type">
          <ElSelect v-model="data.type" class="w-50!" placeholder="Tanlang">
            <ElOption value="Lesson"></ElOption>
            <ElOption value="Workout"></ElOption>
          </ElSelect>
        </ElFormItem>
      </div>

      <div class="mt-3 flex justify-center">
        <ElButton
          type="primary"
          native-type="submit"
          :loading="appStore.isLoading"
          >Add</ElButton
        >
      </div>
    </ElForm>
  </Card>
</template>
