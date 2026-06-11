<script setup lang="ts">
import { ElPopconfirm, ElTableColumn } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";
import Card from "../../components/ui/Card.vue";
import DataTable from "../../components/shared/DataTable.vue";
import { useBillingStore, type CheckCouponDto, type CouponDto } from "../../stores/billingStore";
import { formatDate, formatMoney } from "../../utils/FormatHelper";

const billingStore = useBillingStore();
const router = useRouter();

const goToEdit = async (row: CouponDto) => {
  const res = await billingStore.checkCoupon(row.code);
  billingStore.editingCoupon = {
    ...row,
    amount: res.code === 200 ? res.content.amount : 0,
  };
  router.push({ name: "coupon_edit", params: { couponId: row.id } });
};

const tableKey = ref(0);

const toggleActive = async (row: CouponDto) => {
  const detailRes = await billingStore.getCouponById(row.id);
  if (detailRes.code !== 200) return;
  const c = detailRes.content;
  const res = await billingStore.modifyCoupon({
    id: c.id,
    code: c.code,
    amount: c.amount,
    isActive: !c.isActive,
    oneTime: c.oneTime,
    expireAt: c.expireAt,
    allowedUserIds: c.allowedUserIds,
  });
  if (res.code === 200) tableKey.value++;
};

const checkCode = ref("");
const checkResult = ref<CheckCouponDto | null>(null);
const checkError = ref("");

const handleCheck = async () => {
  checkResult.value = null;
  checkError.value = "";
  if (!checkCode.value.trim()) return;
  try {
    const res = await billingStore.checkCoupon(checkCode.value.trim());
    if (res.code === 200) {
      checkResult.value = res.content;
    } else {
      checkError.value = res.error ?? "Kupon topilmadi";
    }
  } catch {
    checkError.value = "Kupon topilmadi";
  }
};
</script>

<template>
  <div class="space-y-5">
    <!-- Coupon checker -->
    <section class="panel">
      <h2 class="panel-title">Kupon tekshirish</h2>
      <div class="flex flex-col sm:flex-row gap-2.5 sm:items-center mt-4">
        <div class="checker-input">
          <svg class="w-4 h-4 shrink-0" style="color: var(--text-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          <input
            v-model="checkCode"
            placeholder="Kupon kodi"
            class="bg-transparent outline-none text-[14px] w-full uppercase"
            style="color: var(--text)"
            @keyup.enter="handleCheck"
          />
        </div>
        <button class="btn-primary" @click="handleCheck">Tekshirish</button>
      </div>

      <div v-if="checkResult" class="result-box mt-4">
        <span class="badge" style="background: var(--brand-soft); color: var(--brand-strong)">{{ checkCode.toUpperCase() }}</span>
        <span class="badge" :style="checkResult.isActive
          ? { background: 'var(--brand-soft)', color: 'var(--brand-strong)' }
          : { background: 'var(--danger-soft)', color: 'var(--danger)' }">
          {{ checkResult.isActive ? "Faol" : "Faol emas" }}
        </span>
        <span class="text-[13px]" style="color: var(--text-muted)">Chegirma: <b style="color: var(--text)">{{ formatMoney(checkResult.amount / 100) }}</b></span>
        <span v-if="checkResult.expireAt" class="text-[13px]" style="color: var(--text-muted)">Muddati: {{ formatDate(checkResult.expireAt) }}</span>
      </div>
      <div v-if="checkError" class="mt-4 text-[13px]" style="color: var(--danger)">{{ checkError }}</div>
    </section>

    <!-- Coupons list -->
    <Card title="Kuponlar" subtitle="Chegirma kuponlarini boshqaring">
      <template #actions>
        <RouterLink :to="{ name: 'coupon_create' }">
          <button class="btn-primary">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Yangi kupon
          </button>
        </RouterLink>
      </template>

      <DataTable :key="tableKey" :loader="billingStore.loadCoupons">
        <ElTableColumn label="ID" prop="id" width="72" />
        <ElTableColumn label="Kod" min-width="140">
          <template #default="{ row }">
            <span class="code-chip">{{ row.code }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Foydalanishlar" prop="usages" width="140" align="center" />
        <ElTableColumn label="Holat" width="120">
          <template #default="{ row }">
            <span class="badge" :style="row.isActive
              ? { background: 'var(--brand-soft)', color: 'var(--brand-strong)' }
              : { background: 'var(--danger-soft)', color: 'var(--danger)' }">
              {{ row.isActive ? "Faol" : "Faol emas" }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Bir martalik" width="120">
          <template #default="{ row }">
            <span v-if="row.oneTime" class="badge" style="background: var(--warning-soft); color: var(--warning)">Ha</span>
            <span v-else style="color: var(--text-faint)">Yo'q</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Muddati" min-width="130">
          <template #default="{ row }">
            <span v-if="row.expireAt" style="color: var(--text-muted)">{{ formatDate(row.expireAt) }}</span>
            <span v-else style="color: var(--text-faint)">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Yaratilgan" min-width="130">
          <template #default="{ row }">
            <span style="color: var(--text-muted)">{{ formatDate(row.createdAt) }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Amallar" width="150" align="right">
          <template #default="{ row }">
            <div class="flex items-center justify-end gap-1.5">
              <button class="icon-act" title="Tahrirlash" style="color: var(--brand-strong); background: var(--brand-soft)" @click="goToEdit(row)">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              </button>
              <RouterLink :to="{ name: 'coupon_usages', params: { couponId: row.id } }">
                <button class="icon-act" title="Foydalanishlar" style="color: var(--info); background: var(--info-soft)">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
              </RouterLink>
              <ElPopconfirm
                :title="row.isActive ? 'Kuponni o\'chirib qo\'yasizmi?' : 'Kuponni faollashtirasizmi?'"
                confirm-button-text="Ha"
                cancel-button-text="Yo'q"
                @confirm="toggleActive(row)"
              >
                <template #reference>
                  <button
                    class="icon-act"
                    :title="row.isActive ? 'O\'chirish' : 'Faollashtirish'"
                    :style="row.isActive
                      ? { color: 'var(--danger)', background: 'var(--danger-soft)' }
                      : { color: 'var(--brand-strong)', background: 'var(--brand-soft)' }"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                  </button>
                </template>
              </ElPopconfirm>
            </div>
          </template>
        </ElTableColumn>
      </DataTable>
    </Card>
  </div>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.checker-input {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  max-width: 320px;
  width: 100%;
}
.result-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  padding: 0 18px;
  border-radius: 12px;
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
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.code-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 11px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
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
