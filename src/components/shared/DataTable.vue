<script setup lang="ts">
import { ElPagination, ElSkeleton, ElTable } from "element-plus";
import { computed, onMounted, ref } from "vue";
import { ApiBaseResponse } from "../../@types/common";
import IfEmpty from "./IfEmpty.vue";
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps<{
  loader: (skip: number, take: number) => Promise<ApiBaseResponse>;
  data?: any[];
  defaultSort?: { prop: string; order: "ascending" | "descending" };
  rowClickable?: boolean;
}>();

const emit = defineEmits<{
  (e: "selection-change", rows: any[]): void;
  (e: "row-click", row: any): void;
  (e: "sort-change", payload: { prop: string; order: string | null }): void;
}>();

const data = ref<any[]>(props.data || []);
const total = ref(0);
const loading = ref(true);
const current = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1,
);
const take = ref(
  router.currentRoute.value.query.take
    ? Number(router.currentRoute.value.query.take)
    : 10,
);

const skip = computed(() => (current.value - 1) * take.value);

const loadData = async () => {
  loading.value = true;
  const query = {
    ...router.currentRoute.value.query,
    page: current.value,
    take: take.value,
  };
  router.replace({ query });

  try {
    const response = await props.loader(skip.value, take.value);
    data.value = response.content;
    total.value = response.total;
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);
</script>
<template>
  <ElSkeleton :loading="loading" :rows="take" animated>
    <template #default>
      <IfEmpty :value="data">
        <ElTable
          :fit="true"
          :data="data"
          :default-sort="defaultSort"
          :class="{ 'row-clickable': rowClickable }"
          @selection-change="emit('selection-change', $event)"
          @row-click="emit('row-click', $event)"
          @sort-change="emit('sort-change', { prop: $event.prop, order: $event.order })"
        >
          <slot />
        </ElTable>
      </IfEmpty>
    </template>
  </ElSkeleton>
  <ElPagination
    class="mt-3"
    v-model:page-size="take"
    :default-page-size="take"
    v-model:current-page="current"
    @change="loadData"
    :total="total"
    background
    size="large"
    layout="prev, pager, next, total"
  ></ElPagination>
</template>

<style scoped>
.row-clickable :deep(.el-table__row) {
  cursor: pointer;
}
</style>
