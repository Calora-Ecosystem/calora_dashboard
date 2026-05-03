<script setup lang="ts">
import { ElButton, ElMessageBox, ElTableColumn } from "element-plus";
import { ref } from "vue";
import { makeFileUrl } from "../../integrations/axios";
import { useFoodStore } from "../../stores/foodStore";
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";

const foodStore = useFoodStore();

const tableKey = ref(0);

const handleDelete = async (id: number) => {
  await ElMessageBox.confirm("Taomni o'chirishni tasdiqlaysizmi?", "O'chirish", {
    confirmButtonText: "Ha",
    cancelButtonText: "Yo'q",
    type: "warning",
  });
  await foodStore.deleteFood(id);
  tableKey.value++;
};
</script>
<template>
  <Card title="">
    <div class="flex flex-row items-center justify-between mb-2">
      <div></div>
      <RouterLink :to="{ name: 'food_create' }">
        <ElButton size="large" type="primary">Yangi taom</ElButton>
      </RouterLink>
    </div>
    <DataTable :key="tableKey" :loader="foodStore.loadFoodsPaged">
      <ElTableColumn label="ID" prop="id" width="80" />
      <ElTableColumn label="Nomi (UZ)" prop="name.uz" />
      <ElTableColumn label="Kategoriya" prop="categoryName.uz" />
      <ElTableColumn label="Muqova" width="100">
        <template #default="{ row }">
          <img
            v-if="row.coverUrl"
            :src="makeFileUrl(row.coverUrl)"
            class="w-12 h-12 object-cover rounded"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="Amallar" width="160">
        <template #default="{ row }">
          <div class="flex flex-wrap gap-2 justify-center items-center">
            <RouterLink :to="{ name: 'food_edit', params: { foodId: row.id } }">
              <ElButton size="small" type="primary">Tahrirlash</ElButton>
            </RouterLink>
            <ElButton size="small" type="danger" @click="handleDelete(row.id)">
              O'chirish
            </ElButton>
          </div>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>
