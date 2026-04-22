<script setup lang="ts">
import { ElTableColumn, ElTag } from "element-plus";
import { useUserStore } from "../../stores/userStore";
import { makeFileUrl } from "../../integrations/axios";
import { formatDate } from "../../utils/FormatHelper";
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";
import CopyText from "../../components/shared/CopyText.vue";

const userStore = useUserStore();
</script>

<template>
  <Card title="Foydalanuvchilar">
    <div>#filter_elements</div>
    <DataTable :loader="userStore.loadUsersPaged">
      <ElTableColumn label="ID" prop="id" width="80" />

      <ElTableColumn label="Ism">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <img
              v-if="row.extra?.photo"
              :src="makeFileUrl(row.extra.photo)"
              class="w-8 h-8 rounded-full object-cover"
            />
            <span>{{ row.name ?? "—" }}</span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Aloqa">
        <template #default="{ row }">
          <div class="flex flex-col text-sm">
            <CopyText v-if="row.email" :text="row.email" />
            <CopyText v-if="row.phone" :text="row.phone" class="text-gray-400" />
            <span v-if="!row.email && !row.phone">—</span>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="Obuna">
        <template #default="{ row }">
          <template v-if="row.subscription">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1">
                <ElTag
                  :type="
                    row.subscription.plan === 'Pro'
                      ? 'success'
                      : row.subscription.plan === 'Premium'
                        ? 'warning'
                        : 'info'
                  "
                  size="small"
                >
                  {{ row.subscription.plan }}
                </ElTag>
                <ElTag
                  :type="row.subscription.isActive ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.subscription.isActive ? "Faol" : "Faol emas" }}
                </ElTag>
              </div>
              <span class="text-xs text-gray-400">{{
                formatDate(row.subscription.endsAt)
              }}</span>
            </div>
          </template>
          <span v-else>—</span>
        </template>
      </ElTableColumn>
    </DataTable>
  </Card>
</template>
