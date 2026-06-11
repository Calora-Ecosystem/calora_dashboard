<script setup lang="ts">
import { ElMessageBox, ElPopconfirm, ElTableColumn } from "element-plus";
import { onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { makeFileUrl } from "../../integrations/axios";
import { useFoodStore } from "../../stores/foodStore";
import { useAppStore } from "../../stores/appStore";
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";

const foodStore = useFoodStore();
const appStore = useAppStore();
const router = useRouter();

const tableKey = ref(0);

const loader = (skip: number, take: number) =>
  foodStore.loadCategoriesPaged(skip, take, appStore.search);

let debounce: ReturnType<typeof setTimeout> | undefined;
watch(
  () => appStore.search,
  () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => tableKey.value++, 350);
  },
);
onBeforeUnmount(() => clearTimeout(debounce));

const handleDelete = async (id: number) => {
  await foodStore.deleteCategory(id);
  tableKey.value++;
};
</script>

<template>
  <Card title="Kategoriyalar" subtitle="Taom kategoriyalarini boshqaring">
    <template #actions>
      <RouterLink :to="{ name: 'category_create' }">
        <button class="btn-primary">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi kategoriya
        </button>
      </RouterLink>
    </template>

    <DataTable :key="tableKey" :loader="loader">
      <ElTableColumn label="Muqova" width="84">
        <template #default="{ row }">
          <div class="thumb">
            <img v-if="row.coverUrl" :src="makeFileUrl(row.coverUrl)" class="w-full h-full object-cover" />
            <svg v-else class="w-5 h-5" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="ID" prop="id" width="72" />
      <ElTableColumn label="Nomi (UZ)" min-width="180">
        <template #default="{ row }">
          <span class="font-semibold" style="color: var(--text)">{{ row.name?.uz ?? "—" }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Nomi (RU)" min-width="160">
        <template #default="{ row }">
          <span style="color: var(--text-muted)">{{ row.name?.ru ?? "—" }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Nomi (EN)" min-width="160">
        <template #default="{ row }">
          <span style="color: var(--text-muted)">{{ row.name?.eng ?? "—" }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Amallar" width="120" align="right">
        <template #default="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <RouterLink :to="{ name: 'category_edit', params: { categoryId: row.id } }">
              <button class="icon-act" title="Tahrirlash" style="color: var(--brand-strong); background: var(--brand-soft)">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              </button>
            </RouterLink>
            <ElPopconfirm title="O'chirishni tasdiqlaysizmi?" confirm-button-text="Ha" cancel-button-text="Yo'q" @confirm="handleDelete(row.id)">
              <template #reference>
                <button class="icon-act" title="O'chirish" style="color: var(--danger); background: var(--danger-soft)">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>

<style scoped>
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 4px 12px rgba(var(--brand-rgb), 0.3);
  transition: all 0.15s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
}
.thumb {
  width: 46px;
  height: 46px;
  border-radius: 11px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.icon-act {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.icon-act:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}
</style>
