<script setup lang="ts">
import { ElPagination, ElTable } from "element-plus";
import { computed, onMounted, ref } from "vue";
import { ApiBaseResponse } from "../../@types/common";
import IfEmpty from "./IfEmpty.vue";
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps<{
  loader: (skip: number, take: number) => Promise<ApiBaseResponse>;
  data?: any[];
}>();

const data = ref<any[]>(props.data || []);
const total = ref(0);
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
  const query = {
    ...router.currentRoute.value.query,
    page: current.value,
    take: take.value,
  };
  router.replace({ query });

  const response = await props.loader(skip.value, take.value);
  data.value = response.content;
  total.value = response.total;
};

onMounted(loadData);
</script>
<template>
  <div>
    <IfEmpty :value="data">
      <ElTable :fit="true" :data="data">
        <slot />
      </ElTable>
    </IfEmpty>
  </div>
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
