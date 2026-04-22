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
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import type { Mlf } from "../../@types/common";
import type { FoodCategory, FoodMetricDto } from "../../@types/food";
import FileUpload from "../../components/shared/FileUpload.vue";
import Card from "../../components/ui/Card.vue";
import { METRICS } from "../../constants/ApiContstants";
import { useAppStore } from "../../stores/appStore";
import { useFoodStore } from "../../stores/foodStore";

const foodStore = useFoodStore();
const appStore = useAppStore();
const router = useRouter();

const categories = ref<FoodCategory[]>([]);

const data = reactive<{
  id?: number;
  categoryId: number | null;
  name: Mlf;
  coverUrl: string | null;
  description: string | null;
  metrics: FoodMetricDto[];
}>({
  categoryId: null,
  name: { uz: "", ru: "", eng: "" },
  coverUrl: null,
  description: null,
  metrics: [],
});

const rules = reactive<FormRules>({
  categoryId: [{ required: true, message: "Category is required" }],
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
  description: [{ required: true, message: "Description is required" }],
  metrics: {
    type: "array",
    defaultField: {
      type: "object",
      fields: {
        metric: { required: true, message: "Metric is required" },
        value: { required: true, type: "number", min: 0, message: "Value is required" },
      },
    },
  },
});

const form = ref<FormInstance>();

const handleCategorySearch = async (query: string) => {
  categories.value = await foodStore.searchCategories(query);
};

const addMetric = () => {
  data.metrics.push({ metric: "Protein", value: 0 } as FoodMetricDto);
};

const removeMetric = (index: number) => {
  data.metrics.splice(index, 1);
};

const handleSubmit = async () => {
  try {
    await form.value?.validate();
    if (data.id && data.id > 0) {
      await foodStore.updateFood(data.id, data);
    } else {
      await foodStore.createFood(data);
    }
    router.back();
  } catch (error) {}
};

onMounted(async () => {
  categories.value = await foodStore.searchCategories();
});

onMounted(async () => {
  if (router.currentRoute.value.name !== "food_edit") return;

  const food = await foodStore.getFoodById(
    Number(router.currentRoute.value.params.foodId),
  );
  Object.assign(data, { ...food, metrics: food.metrics ?? [] });

  if (food.categoryId && !categories.value.find((c) => c.id === food.categoryId)) {
    const cat = await foodStore.getCategoryById(food.categoryId);
    if (cat) categories.value.unshift(cat);
  }
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
      <ElFormItem label="Category" required prop="categoryId">
        <ElSelect
          v-model="data.categoryId"
          placeholder="Search category..."
          filterable
          remote
          :remote-method="handleCategorySearch"
          style="width: 300px"
        >
          <ElOption
            v-for="cat in categories"
            :key="cat.id"
            :label="cat.name.uz"
            :value="cat.id"
          />
        </ElSelect>
      </ElFormItem>

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

      <ElFormItem label="Description" required prop="description">
        <ElInput
          style="width: 760px"
          placeholder="Description"
          type="textarea"
          :rows="4"
          v-model="data.description"
        />
      </ElFormItem>

      <ElFormItem label="Metrics" prop="metrics">
        <div class="flex flex-col gap-y-2 w-full">
          <div
            v-for="(metric, index) in data.metrics"
            :key="index"
            class="flex flex-row gap-x-2 items-center"
          >
            <ElFormItem :prop="`metrics.${index}.metric`" required>
              <ElSelect v-model="metric.metric" placeholder="Metric" style="width: 140px">
                <ElOption v-for="m in METRICS" :key="m" :label="m" :value="m" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem :prop="`metrics.${index}.value`" required>
              <ElInputNumber
                v-model="metric.value"
                :controls="false"
                :min="0"
                placeholder="Value"
              />
            </ElFormItem>
            <ElButton type="danger" size="small" @click="removeMetric(index)">-</ElButton>
          </div>
          <ElButton type="default" size="small" style="width: fit-content" @click="addMetric">
            + Add metric
          </ElButton>
        </div>
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
