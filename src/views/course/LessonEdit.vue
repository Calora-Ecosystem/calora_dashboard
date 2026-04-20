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
  FormInstance,
  FormRules,
} from "element-plus";
import { onMounted, reactive, ref } from "vue";
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
import Card from "../../components/ui/Card.vue";
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

const handleSubmit = async () => {
  try {
    await form.value?.validate();

    await courseStore.modifyLesson(data);

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
        <div class="flex flex-row gap-x-2 w-full">
          <ElFormItem required class="flex-auto" prop="title.uz">
            <ElInput class="w-auto" placeholder="uz" v-model="data.title.uz" />
          </ElFormItem>
          <ElFormItem class="flex-auto" required prop="title.ru">
            <ElInput class="w-auto" placeholder="ru" v-model="data.title.ru" />
          </ElFormItem>
          <ElFormItem required prop="title.eng">
            <ElInput class="w-auto" placeholder="en" v-model="data.title.eng" />
          </ElFormItem>
        </div>
      </ElFormItem>

      <ElFormItem label="Description" required class="w-full">
        <div class="flex flex-row gap-x-2 w-full">
          <ElFormItem required prop="description.uz" class="flex-auto">
            <ElInput
              style="width: 250px"
              placeholder="uz"
              type="textarea"
              :rows="7"
              v-model="data.description.uz"
            />
          </ElFormItem>
          <ElFormItem required prop="description.ru" class="flex-auto">
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

      <div class="flex flex-row justify-start gap-x-3 min-w-0 overflow-x-auto">
        <ElFormItem label="Cover Image" required prop="assets.0.url">
          <FileUpload v-model="data.assets[0].url" />
        </ElFormItem>
        <ElFormItem label="Video" required prop="assets.1.url">
          <FileUpload v-model="data.assets[1].url" />
        </ElFormItem>
      </div>
      <div class="flex flex-row gap-x-5">
        <ElFormItem label="Bepul?" required prop="isFree">
          <ElSwitch v-model="data.isFree"></ElSwitch>
        </ElFormItem>
        <ElFormItem label="Order" required prop="order">
          <ElInputNumber v-model="data.order" :controls="false" />
        </ElFormItem>
        <ElFormItem label="Duration" required prop="duration">
          <ElInput
            v-model="data.duration"
            v-maska="'##:##:##'"
            placeholder="hh:mm:ss"
          />
        </ElFormItem>
      </div>

      <div class="mt-3 flex justify-center">
        <ElButton
          type="primary"
          native-type="submit"
          :loading="appStore.isLoading"
          >{{ data.id && data.id > 0 ? "Update" : "Add" }}</ElButton
        >
      </div>
    </ElForm>
  </Card>
</template>
