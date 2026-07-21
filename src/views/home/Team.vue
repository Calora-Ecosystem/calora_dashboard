<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElDialog, ElInput, ElMessage, ElPopconfirm } from "element-plus";
import Card from "../../components/ui/Card.vue";
import Icon from "../crm/components/Icon.vue";
import { initials, avatarHue } from "../crm/crmMeta";
import { formatDate } from "../../utils/FormatHelper";
import { useTokenStore } from "../../stores/tokenStore";
import {
  useTeamStore,
  TEAM_ROLES,
  type TeamMemberDto,
  type TeamRole,
} from "../../stores/teamStore";

const teamStore = useTeamStore();
const tokenStore = useTokenStore();

const members = ref<TeamMemberDto[]>([]);
const loaded = ref(false);
const search = ref("");
const roleFilter = ref<TeamRole | "">("");

const ROLE_META: Record<TeamRole, { label: string; icon: string; hint: string }> = {
  SuperAdmin: {
    label: "Admin",
    icon: "sparkles",
    hint: "Tizimning barcha bo'limlariga to'liq huquq",
  },
  HeadOfSales: {
    label: "Sotuv boshlig'i",
    icon: "briefcase",
    hint: "Operatorlar, leadlar taqsimoti va sotuv tahlili",
  },
  Operator: {
    label: "Operator",
    icon: "phone",
    hint: "O'ziga biriktirilgan leadlar bilan ishlaydi",
  },
};

const teamRoles = (m: TeamMemberDto) =>
  m.roles.filter((r): r is TeamRole => (TEAM_ROLES as readonly string[]).includes(r));

const load = async () => {
  const res = await teamStore.getMembers();
  members.value = res.content ?? [];
  loaded.value = true;
};

onMounted(load);

const filtered = computed(() =>
  members.value.filter((m) => {
    const q = search.value.trim().toLowerCase();
    const matchesQuery =
      !q ||
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q);
    const matchesRole = !roleFilter.value || m.roles.includes(roleFilter.value);
    return matchesQuery && matchesRole;
  }),
);

const counts = computed(() => ({
  SuperAdmin: members.value.filter((m) => m.roles.includes("SuperAdmin")).length,
  HeadOfSales: members.value.filter((m) => m.roles.includes("HeadOfSales")).length,
  Operator: members.value.filter((m) => m.roles.includes("Operator")).length,
}));

// ── Create / Edit ────────────────────────────────────────────────
const dialog = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  name: "",
  email: "",
  phone: "",
  roles: [] as TeamRole[],
});

const isEdit = computed(() => editingId.value !== null);

const openCreate = () => {
  editingId.value = null;
  form.name = "";
  form.email = "";
  form.phone = "";
  form.roles = ["Operator"];
  dialog.value = true;
};

const openEdit = (m: TeamMemberDto) => {
  editingId.value = m.id;
  form.name = m.name ?? "";
  form.email = m.email ?? "";
  form.phone = m.phone ?? "";
  form.roles = teamRoles(m);
  dialog.value = true;
};

const toggleRole = (role: TeamRole) => {
  form.roles = form.roles.includes(role)
    ? form.roles.filter((r) => r !== role)
    : [...form.roles, role];
};

const ERRORS: Record<string, string> = {
  team_member_already_exists: "Bu email allaqachon jamoa a'zosi",
  cannot_revoke_own_admin_role: "O'zingizdan Admin rolini olib tashlay olmaysiz",
  cannot_remove_last_admin: "Oxirgi adminni o'chirib bo'lmaydi",
  cannot_remove_self: "O'zingizni jamoadan chiqara olmaysiz",
  at_least_one_team_role_required: "Kamida bitta rol tanlang",
};

const showError = (e: any, fallback: string) =>
  ElMessage.error(ERRORS[e?.response?.data?.error] ?? fallback);

const submit = async () => {
  if (!form.name.trim()) return ElMessage.warning("Ism majburiy");
  if (!isEdit.value && !form.email.trim())
    return ElMessage.warning("Email majburiy");
  if (!form.roles.length) return ElMessage.warning("Kamida bitta rol tanlang");

  saving.value = true;
  try {
    if (isEdit.value) {
      await teamStore.updateMember(editingId.value!, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        roles: form.roles,
      });
      ElMessage.success("Jamoa a'zosi yangilandi");
    } else {
      await teamStore.createMember({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        roles: form.roles,
      });
      ElMessage.success("Jamoaga yangi a'zo qo'shildi");
    }
    dialog.value = false;
    await load();
  } catch (e: any) {
    showError(e, isEdit.value ? "Saqlanmadi" : "A'zo qo'shilmadi");
  } finally {
    saving.value = false;
  }
};

const remove = async (m: TeamMemberDto) => {
  try {
    await teamStore.deleteMember(m.id);
    ElMessage.success("Jamoadan chiqarildi");
    await load();
  } catch (e: any) {
    showError(e, "O'chirilmadi");
  }
};

const isSelf = (m: TeamMemberDto) => String(m.id) === String(tokenStore.userId);
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Rol bo'yicha qisqacha hisob -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <button
        v-for="role in TEAM_ROLES"
        :key="role"
        class="app-card stat"
        :class="{ active: roleFilter === role }"
        @click="roleFilter = roleFilter === role ? '' : role"
      >
        <span class="stat-icon"><Icon :name="ROLE_META[role].icon" :size="17" /></span>
        <span class="min-w-0 text-left">
          <b>{{ counts[role] }}</b>
          <em>{{ ROLE_META[role].label }}</em>
        </span>
      </button>
    </div>

    <Card
      title="Jamoa"
      subtitle="Xodimlarni qo'shish, rollarini o'zgartirish va jamoadan chiqarish"
    >
      <template #actions>
        <button class="add-btn" @click="openCreate">
          <Icon name="user-plus" :size="16" /> Yangi a'zo
        </button>
      </template>

      <div class="mb-4 flex flex-wrap items-center gap-2.5">
        <ElInput
          v-model="search"
          placeholder="Ism, email yoki telefon bo'yicha qidirish"
          clearable
          size="large"
          style="max-width: 320px"
        />
        <span v-if="roleFilter" class="filter-chip">
          {{ ROLE_META[roleFilter].label }}
          <button @click="roleFilter = ''"><Icon name="x" :size="12" /></button>
        </span>
      </div>

      <div v-if="loaded && !filtered.length" class="empty">
        <Icon name="users" :size="30" />
        <span>{{ members.length ? "Qidiruvga mos a'zo topilmadi" : "Jamoa a'zolari yo'q" }}</span>
      </div>

      <div v-else class="grid">
        <article v-for="m in filtered" :key="m.id" class="app-card member">
          <div class="m-head">
            <div
              class="avatar"
              :style="{
                background: `hsl(${avatarHue(m.id)} 70% 92%)`,
                color: `hsl(${avatarHue(m.id)} 65% 38%)`,
              }"
            >
              {{ initials(m.name) }}
            </div>
            <div class="min-w-0 grow">
              <div class="m-name">
                {{ m.name }}
                <span v-if="isSelf(m)" class="self-tag">siz</span>
              </div>
              <div class="m-meta"><Icon name="mail" :size="12" /> {{ m.email ?? "—" }}</div>
              <div v-if="m.phone" class="m-meta"><Icon name="phone" :size="12" /> {{ m.phone }}</div>
            </div>
          </div>

          <div class="roles">
            <span v-for="r in teamRoles(m)" :key="r" class="role-tag" :class="r">
              <Icon :name="ROLE_META[r].icon" :size="11" /> {{ ROLE_META[r].label }}
            </span>
          </div>

          <div class="m-foot">
            <span class="joined">
              <Icon name="calendar" :size="12" /> {{ formatDate(m.createdAt) }}
              <template v-if="m.roles.includes('Operator')">
                · {{ m.activeLeads }} faol lead
              </template>
            </span>
            <div class="actions">
              <button class="edit-btn" @click="openEdit(m)">
                <Icon name="pencil" :size="13" /> Tahrirlash
              </button>
              <ElPopconfirm
                v-if="!isSelf(m)"
                :title="
                  m.roles.includes('Operator')
                    ? 'Jamoadan chiqarilsinmi? Faol leadlari boshqa operatorlarga taqsimlanadi.'
                    : 'Jamoadan chiqarilsinmi?'
                "
                confirm-button-text="Ha, chiqar"
                cancel-button-text="Yo'q"
                width="270"
                @confirm="remove(m)"
              >
                <template #reference>
                  <button class="del-btn"><Icon name="trash" :size="13" /></button>
                </template>
              </ElPopconfirm>
            </div>
          </div>
        </article>
      </div>
    </Card>

    <ElDialog
      v-model="dialog"
      :title="isEdit ? 'Jamoa a\'zosini tahrirlash' : 'Jamoaga yangi a\'zo qo\'shish'"
      width="460"
    >
      <div class="form">
        <div>
          <label class="lbl">Ism *</label>
          <ElInput v-model="form.name" placeholder="Masalan: Aziz Karimov" />
        </div>
        <div>
          <label class="lbl">Email *</label>
          <ElInput v-model="form.email" :disabled="isEdit" placeholder="xodim@calora.uz" />
          <p class="hint">
            <Icon name="mail" :size="12" />
            {{
              isEdit
                ? "Email o'zgartirilmaydi — kirish shu email orqali bog'langan."
                : "Xodim shu email + OTP kod orqali tizimga kiradi."
            }}
          </p>
        </div>
        <div>
          <label class="lbl">Telefon</label>
          <ElInput v-model="form.phone" placeholder="+99890..." />
        </div>
        <div>
          <label class="lbl">Rollar *</label>
          <div class="role-picker">
            <button
              v-for="role in TEAM_ROLES"
              :key="role"
              class="role-opt"
              :class="{ on: form.roles.includes(role) }"
              @click="toggleRole(role)"
            >
              <span class="role-opt-head">
                <Icon :name="ROLE_META[role].icon" :size="14" />
                <b>{{ ROLE_META[role].label }}</b>
                <Icon v-if="form.roles.includes(role)" name="check" :size="14" class="ml-auto" />
              </span>
              <em>{{ ROLE_META[role].hint }}</em>
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="ghost" @click="dialog = false">Bekor</button>
        <button class="add-btn" :disabled="saving" @click="submit">
          <Icon name="check" :size="15" />
          {{ saving ? "Saqlanmoqda…" : isEdit ? "Saqlash" : "Qo'shish" }}
        </button>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.stat {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border: 1px solid transparent; transition: border-color 0.15s ease, transform 0.12s ease;
}
.stat:hover { transform: translateY(-1px); }
.stat.active { border-color: var(--brand); }
.stat-icon {
  width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--brand-soft); color: var(--brand-strong);
}
.stat b { display: block; font-size: 19px; font-weight: 800; color: var(--text); line-height: 1.1; }
.stat em { font-style: normal; font-size: 12.5px; color: var(--text-faint); }

.add-btn {
  display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
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
.filter-chip {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px;
  border-radius: 999px; font-size: 12.5px; font-weight: 600;
  background: var(--brand-soft); color: var(--brand-strong);
}

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.member { padding: 16px; display: flex; flex-direction: column; gap: 13px; transition: transform 0.12s ease, box-shadow 0.15s ease; }
.member:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.m-head { display: flex; align-items: flex-start; gap: 12px; }
.avatar {
  width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 17px;
}
.m-name { display: flex; align-items: center; gap: 7px; font-size: 15px; font-weight: 700; color: var(--text); }
.self-tag {
  font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px;
  background: var(--surface-2); color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.4px;
}
.m-meta {
  display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-faint);
  margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.roles { display: flex; flex-wrap: wrap; gap: 6px; }
.role-tag {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
  background: var(--surface-2); color: var(--text-muted);
}
.role-tag.SuperAdmin { background: var(--brand-soft); color: var(--brand-strong); }
.m-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 3px; }
.joined { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-faint); }
.actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.edit-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12.5px; font-weight: 600; color: var(--brand-strong);
  background: var(--brand-soft); padding: 6px 11px; border-radius: 9px; transition: filter 0.15s ease;
}
.edit-btn:hover { filter: brightness(0.96); }
.del-btn {
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--danger); background: var(--danger-soft);
  width: 30px; height: 30px; border-radius: 9px; transition: filter 0.15s ease;
}
.del-btn:hover { filter: brightness(0.96); }
.empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px; text-align: center; color: var(--text-faint); font-size: 14px;
}

.form { display: flex; flex-direction: column; gap: 14px; }
.lbl { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
.hint { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-faint); margin-top: 5px; }
.role-picker { display: flex; flex-direction: column; gap: 8px; }
.role-opt {
  text-align: left; padding: 10px 12px; border-radius: 11px;
  border: 1.5px solid var(--border); background: var(--surface-2);
  transition: border-color 0.15s ease, background 0.15s ease;
}
.role-opt.on { border-color: var(--brand); background: var(--brand-soft); }
.role-opt-head { display: flex; align-items: center; gap: 7px; font-size: 13.5px; color: var(--text); }
.role-opt em { display: block; font-style: normal; font-size: 11.5px; color: var(--text-faint); margin-top: 3px; }

@media (max-width: 600px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
