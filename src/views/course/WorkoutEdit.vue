<script setup lang="ts">
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
  ElSwitch,
  FormInstance,
  FormRules,
} from "element-plus";
import Card from "../../components/ui/Card.vue";
import FileUpload from "../../components/shared/FileUpload.vue";
import { onMounted, reactive, ref } from "vue";
import {
  ActivityType,
  Asset,
  ComputationType,
  CourseType,
  EntityType,
  Gender,
  Mlf,
} from "../../@types/common";
import { useCourseStore } from "../../stores/courseStore";
import { useRouter } from "vue-router";
import { useAppStore } from "../../stores/appStore";
import { en } from "element-plus/es/locale/index.mjs";
import {
  ACTIVITIES,
  COMPUTATION_TYPE,
  ENTITY_TYPES,
} from "../../constants/ApiContstants";
import ComputationEdit from "./components/ComputationEdit.vue";

const courseStore = useCourseStore();
const router = useRouter();
const appStore = useAppStore();

const data = reactive<{
  title: Mlf;
  description: Mlf;
  order: number;
  courseId: number;
  hasRest: boolean;
  assets: Asset[];
  computations: {
    id?: number;
    entityId: number;
    type: EntityType;
    activity: ActivityType;
    computationType: ComputationType;
    value: number;
  }[];
}>({
  title: { uz: "", ru: "", eng: "" },
  description: { uz: "", ru: "", eng: "" },
  order: 0,
  courseId: Number(router.currentRoute.value.params.courseId),
  hasRest: false,
  assets: [
    { type: "MainImage", url: "" },
    { type: "SubCoverImage", url: "" },
  ],
  computations: [],
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
  courseId: { required: true, message: "Course ID is required" },
  hasRest: { required: true, message: "Has Rest is required" },
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
  computations: {
    type: "array",
    defaultField: {
      type: "object",
      fields: {
        entityId: { required: true },
        type: { required: true, type: "enum", enum: ENTITY_TYPES as any },
        activity: { required: true, type: "enum", enum: ACTIVITIES as any },
        computationType: {
          required: true,
          type: "enum",
          enum: COMPUTATION_TYPE as any,
        },
        value: { required: true, type: "number" },
      },
    },
  },
});

const form = ref<FormInstance>();

const handleAddComputation = () => {
  data.computations.push({
    activity: ACTIVITIES[0],
    computationType: COMPUTATION_TYPE[0],
    entityId: 0,
    type: ENTITY_TYPES[0],
    value: 0,
  });
};

const handleSubmit = async () => {
  try {
    await form.value.validate();

    await courseStore.modifyWorkout(data);

    router.back();
  } catch (error) {}
};

onMounted(async () => {
  if (router.currentRoute.value.name !== "workout_edit") {
    return;
  }
  const workout = await courseStore.getWorkoutById(
    Number(router.currentRoute.value.params.workoutId),
  );

  Object.assign(data, workout);
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

      <div class="flex flex-row justify-start gap-x-3 min-w-0 overflow-x-auto">
        <ElFormItem label="Main Image" required prop="assets.0.url">
          <FileUpload v-model="data.assets[0].url" />
        </ElFormItem>
        <ElFormItem label="Sub Cover Image" required prop="assets.1.url">
          <FileUpload v-model="data.assets[1].url" />
        </ElFormItem>
      </div>
      <div class="flex flex-row gap-x-5">
        <ElFormItem label="Dam olish" required prop="hasRest">
          <ElSwitch v-model="data.hasRest"></ElSwitch>
        </ElFormItem>

        <ElFormItem label="Order" required prop="order">
          <ElInputNumber v-model="data.order" :controls="false" />
        </ElFormItem>
      </div>

      <ComputationEdit />

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
