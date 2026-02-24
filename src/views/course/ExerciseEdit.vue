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
  workoutId: number;
  duration: string;
  assets: Asset[];
  metrics: { id: number; metric: TMetrics; value: number }[];
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
  workoutId: Number(router.currentRoute.value.params.workoutId),
  duration: "",
  assets: [{ type: "Default", url: "" }],
  metrics: [],
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
  duration: { required: true, message: "Duration is required" },
  workoutId: { required: true, message: "Workout ID is required" },

  assets: {
    type: "array",
    len: 1,
    fields: {
      0: {
        type: "object",
        fields: {
          url: { required: true, message: "URL is required" },
        },
      },
    },
  },

  metrics: {
    type: "array",
    required: true,
    min: 1,
    defaultField: {
      type: "object",
      required: true,
      fields: {
        id: {
          required: true,
          message: "ID is required",
          type: "number",
          min: 0,
        },
        metric: {
          required: true,
          message: "Metric is required",
          enum: METRICS as any,
          type: "enum",
        },
        value: [
          {
            required: true,
            message: "Value is required",
            min: 1,
            max: 9_999,
            type: "number",
          },
        ],
      },
    },
  },

  computations: {
    type: "array",
    defaultField: {
      type: "object",
      fields: {
        entityId: { required: true, type: "number", min: 1 },
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

const handleSubmit = async () => {
  try {
    await form.value.validate();

    await courseStore.modifyExercise(data);

    router.back();
  } catch (error) {}
};

const handleAddMetric = () => {
  data.metrics.push({ id: data.metrics.length, metric: METRICS[0], value: 0 });
};

const loadComputations = async () => {
  const computations = await courseStore.getExerciseComputations(
    Number(data.id ?? 0),
  );


  Object.assign(data.computations, computations);
};

onMounted(async () => {
  if (router.currentRoute.value.name !== "exercise_edit") {
    return;
  }
  const exercise = await courseStore.getExerciseById(
    Number(router.currentRoute.value.params.workoutId),
    Number(router.currentRoute.value.params.exerciseId),
  );

  Object.assign(data, exercise);
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
        <ElFormItem label="Main Image" required prop="assets.0.url">
          <FileUpload v-model="data.assets[0].url" />
        </ElFormItem>
      </div>
      <div class="flex flex-row gap-x-5">
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
      <ElFormItem label="Metrics" required prop="metrics">
        <ElTable :data="data.metrics">
          <ElTableColumn label="Metric" prop="metric">
            <template #default="{ row, index }">
              <ElFormItem :prop="`metrics.${row.id}.metric`">
                <ElSelect v-model="row.metric">
                  <ElOption
                    v-for="value in METRICS"
                    :key="value"
                    :label="value"
                    :value="value"
                  ></ElOption>
                </ElSelect>
              </ElFormItem>
            </template>
          </ElTableColumn>
          <ElTableColumn label="Value" prop="value">
            <template #default="{ row }">
              <ElFormItem :prop="`metrics.${row.id}.value`">
                <ElInputNumber v-model="row.value" :min="0" :max="9_999" />
              </ElFormItem>
            </template>
          </ElTableColumn>
          <ElTableColumn>
            <template #default="{ row }">
              <ElButton
                type="danger"
                size="small"
                @click="
                  () =>
                    data.metrics.splice(
                      data.metrics.findIndex((m) => m.id === row.id),
                      1,
                    )
                "
                >Remove</ElButton
              >
            </template>
          </ElTableColumn>
        </ElTable>
        <div>
          <ElButton type="success" plain @click="handleAddMetric">+</ElButton>
        </div>
      </ElFormItem>

      <ElFormItem label="Computations" required prop="computations">
        <ComputationEdit
          type="Exercise"
          :entityId="data.id"
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
  <pre>{{ data }}</pre>
</template>
