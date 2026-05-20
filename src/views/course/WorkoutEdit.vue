<script setup lang="ts">
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSwitch,
  FormInstance,
  FormRules,
} from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ActivityType,
  Asset,
  ComputationType,
  EntityType,
  Mlf,
} from "../../@types/common";
import FileUpload from "../../components/shared/FileUpload.vue";
import Card from "../../components/ui/Card.vue";
import {
  ACTIVITIES,
  COMPUTATION_TYPE,
  ENTITY_TYPES,
} from "../../constants/ApiContstants";
import { useAppStore } from "../../stores/appStore";
import { useCourseStore } from "../../stores/courseStore";
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
  hasRest: boolean;
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
  courseId: Number(router.currentRoute.value.params.courseId),
  hasRest: false,
  computations: ACTIVITIES.map((x) => ({
    entityId: 0,
    type: "Workout",
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
  courseId: { required: true, message: "Course ID is required" },
  hasRest: { required: true, message: "Has Rest is required" },
  computations: {
    type: "array",
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
        value: { required: true, type: "number" },
        kcal: { required: true, type: "number" },
      },
    },
  },
});

const form = ref<FormInstance>();

const handleSubmit = async () => {
  try {
    await form.value?.validate();

    data.id = await courseStore.modifyWorkout(data);

    await courseStore.modifyWorkoutComputations(
      data.computations.map((c) => ({
        ...c,
        entityId: data.id,
        id: c.id === 0 ? null : c.id,
      })),
    );

    await router.replace({
      name: "workout_edit",
      params: { workoutId: data.id },
    });
    // const workout = await courseStore.getWorkoutById(
    //   Number(data.id!),
    // );
    // Object.assign(data, workout);

    // // router.back();
  } catch (error) {}
};

const loadComputations = async () => {
  const computations = await courseStore.getWorkoutComputations(
    Number(data.id ?? 0),
  );

  Object.assign(data.computations, computations);
};

onMounted(async () => {
  if (router.currentRoute.value.name !== "workout_edit") {
    return;
  }
  const workout = await courseStore.getWorkoutById(
    Number(router.currentRoute.value.params.workoutId),
  );

  workout.assets = [
    ...workout.assets,
    workout.assets.find((a: any) => a.type === "MainImage") ?? {
      type: "MainImage",
      url: "",
    },
    workout.assets.find((a: any) => a.type === "SubCoverImage") ?? {
      type: "SubCoverImage",
      url: "",
    },
  ];

  Object.assign(data, workout);

  await loadComputations();
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

      <!--      <div class="flex flex-row justify-start gap-x-3 min-w-0 overflow-x-auto">
        <ElFormItem label="Main Image" required prop="assets.0.url">
          <FileUpload v-model="data.assets[0].url" />
        </ElFormItem>
        <ElFormItem label="Sub Cover Image" required prop="assets.1.url">
          <FileUpload v-model="data.assets[1].url" />
        </ElFormItem>
      </div>
-->
      <div class="flex flex-row gap-x-5">
        <ElFormItem label="Dam olish" required prop="hasRest">
          <ElSwitch v-model="data.hasRest"></ElSwitch>
        </ElFormItem>

        <ElFormItem label="Order" required prop="order">
          <ElInputNumber v-model="data.order" :controls="false" />
        </ElFormItem>
      </div>

      <ElFormItem label="Computations" required prop="computations">
        <ComputationEdit
          type="Workout"
          :entityId="data.id as number"
          v-model="data.computations"
        />
      </ElFormItem>

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
