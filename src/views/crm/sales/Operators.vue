<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ElDialog,
  ElInput,
  ElMessage,
  ElPopconfirm,
} from "element-plus";
import Icon from "../components/Icon.vue";
import {
  useSalesStore,
  type OperatorLeaderboardRowDto,
} from "../../../stores/salesStore";
import { initials, avatarHue } from "../crmMeta";
import { formatMoney } from "../../../utils/FormatHelper";

const salesStore = useSalesStore();
const router = useRouter();
const operators = ref<OperatorLeaderboardRowDto[]>([]);

const dialog = ref(false);
const saving = ref(false);
const form = reactive({ name: "", email: "", phone: "" });

const load = async () => {
  const res = await salesStore.getOperators();
  operators.value = res.content ?? [];
};

onMounted(load);

const openCreate = () => {
  form.name = "";
  form.email = "";
  form.phone = "";
  dialog.value = true;
};

const submit = async () => {
  if (!form.name.trim() || !form.email.trim()) {
    ElMessage.warning("Ism va email majburiy");
    return;
  }
  saving.value = true;
  try {
    await salesStore.createOperator({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
    });
    ElMessage.success("Operator qo'shildi");
    dialog.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(
      e?.response?.data?.error === "operator_already_exists"
        ? "Bu email allaqachon operator"
        : "Operator qo'shilmadi",
    );
  } finally {
    saving.value = false;
  }
};

const remove = async (op: OperatorLeaderboardRowDto) => {
  await salesStore.deleteOperator(op.operatorId);
  ElMessage.success("Operator o'chirildi, leadlari qayta taqsimlandi");
  await load();
};

const openBoard = (id: number) =>
  router.push({ name: "crm_sales_operator_board", params: { operatorId: id } });
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title"><Icon name="briefcase" :size="22" /> Operatorlar</h1>
        <p class="page-sub">Jamoa a'zolari va ularning ko'rsatkichlari</p>
      </div>
      <button class="add-btn" @click="openCreate"><Icon name="user-plus" :size="16" /> Yangi operator</button>
    </header>

    <div v-if="!operators.length" class="app-card empty">
      <Icon name="users" :size="30" /><span>Operatorlar topilmadi</span>
    </div>
    <div v-else class="grid">
      <article v-for="op in operators" :key="op.operatorId" class="app-card op">
        <div class="op-head">
          <div class="avatar" :style="{ background: `hsl(${avatarHue(op.operatorId)} 70% 92%)`, color: `hsl(${avatarHue(op.operatorId)} 65% 38%)` }">
            {{ initials(op.operatorName) }}
          </div>
          <div class="min-w-0 grow cursor-pointer" @click="openBoard(op.operatorId)">
            <div class="op-name">{{ op.operatorName }}</div>
            <div class="op-leads"><Icon name="users" :size="12" /> {{ op.leads }} ta lead</div>
          </div>
          <span class="conv">{{ op.conversionRate }}%</span>
        </div>
        <div class="stat-grid">
          <div><span><Icon name="phone" :size="12" /> Qo'ng'iroq</span><b>{{ op.calls }}</b></div>
          <div><span><Icon name="check-circle" :size="12" /> Sotuv</span><b>{{ op.sales }}</b></div>
          <div class="full"><span><Icon name="wallet" :size="12" /> Tushum</span><b>{{ formatMoney(op.revenue) }}</b></div>
        </div>
        <div class="op-foot">
          <button class="board-btn" @click="openBoard(op.operatorId)">Kanbanni ko'rish <Icon name="arrow-right" :size="13" /></button>
          <ElPopconfirm
            title="Operator o'chirilsinmi? Leadlari boshqa operatorlarga taqsimlanadi."
            confirm-button-text="Ha, o'chir"
            cancel-button-text="Yo'q"
            width="260"
            @confirm="remove(op)"
          >
            <template #reference>
              <button class="del-btn"><Icon name="trash" :size="13" /> O'chirish</button>
            </template>
          </ElPopconfirm>
        </div>
      </article>
    </div>

    <ElDialog v-model="dialog" title="Yangi operator qo'shish" width="420">
      <div class="form">
        <div>
          <label class="lbl">Ism *</label>
          <ElInput v-model="form.name" placeholder="Masalan: Aziz Karimov" />
        </div>
        <div>
          <label class="lbl">Email *</label>
          <ElInput v-model="form.email" placeholder="operator@calora.uz" />
          <p class="hint"><Icon name="mail" :size="12" /> Operator shu email + OTP kod orqali tizimga kiradi.</p>
        </div>
        <div>
          <label class="lbl">Telefon</label>
          <ElInput v-model="form.phone" placeholder="+99890..." />
        </div>
      </div>
      <template #footer>
        <button class="ghost" @click="dialog = false">Bekor</button>
        <button class="add-btn" :disabled="saving" @click="submit">
          <Icon name="check" :size="15" /> {{ saving ? "Saqlanmoqda…" : "Qo'shish" }}
        </button>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { display: flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; }
.page-title :deep(.crm-icon) { color: var(--brand-strong); }
.page-sub { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
.add-btn {
  display: inline-flex; align-items: center; gap: 7px;
  height: 40px; padding: 0 18px; border-radius: 11px;
  font-size: 13px; font-weight: 700; color: #fff; background: var(--brand);
  transition: filter 0.15s ease;
}
.add-btn:hover { filter: brightness(0.95); }
.add-btn:disabled { opacity: 0.6; }
.ghost {
  height: 40px; padding: 0 16px; border-radius: 11px; font-size: 13px; font-weight: 600;
  color: var(--text-muted); background: var(--surface-2); border: 1px solid var(--border); margin-right: 8px;
}
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
.op { padding: 17px; display: flex; flex-direction: column; gap: 14px; transition: transform 0.12s ease, box-shadow 0.15s ease; }
.op:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.op-head { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 17px;
}
.op-name { font-size: 15px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.op-leads { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-faint); margin-top: 2px; }
.conv {
  margin-left: auto; font-size: 13px; font-weight: 800; color: var(--brand-strong);
  background: var(--brand-soft); padding: 5px 11px; border-radius: 999px; flex-shrink: 0;
}
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat-grid > div { background: var(--surface-2); border-radius: 11px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
.stat-grid .full { grid-column: span 2; }
.stat-grid span { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-faint); }
.stat-grid b { font-size: 15px; color: var(--text); }
.op-foot { display: flex; align-items: center; justify-content: space-between; }
.board-btn { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 600; color: var(--brand-strong); }
.del-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12.5px; font-weight: 600; color: var(--danger);
  background: var(--danger-soft); padding: 6px 11px; border-radius: 9px; transition: filter 0.15s ease;
}
.del-btn:hover { filter: brightness(0.96); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; text-align: center; color: var(--text-faint); font-size: 14px; }
.form { display: flex; flex-direction: column; gap: 14px; }
.lbl { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
.hint { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-faint); margin-top: 5px; }
@media (max-width: 600px) {
  .page-title { font-size: 19px; }
  .grid { grid-template-columns: 1fr; }
}
</style>
