<script setup lang="ts">
import {
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElRadioButton,
  ElRadioGroup,
  FormInstance,
  FormRules,
} from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import FileUpload from "../../components/shared/FileUpload.vue";
import { useNotificationStore } from "../../stores/notificationStore";
import { usePushHistoryStore } from "../../stores/pushHistoryStore";
import { useAudienceStore } from "../../stores/audienceStore";
import { emptySegmentFilter } from "../../@types/audience";
import type {
  ActivityKey,
  GenderKey,
  PlanKey,
  SavedSegment,
  SegmentFilter,
} from "../../@types/audience";
import { ACTIVITIES, GENDERS, PLANS } from "../../constants/ApiContstants";

const notificationStore = useNotificationStore();
const pushHistoryStore = usePushHistoryStore();
const audienceStore = useAudienceStore();

// ── Yorliqlar ─────────────────────────────────────────────────────
const GENDER_LABELS: Record<GenderKey, string> = { Male: "Erkak", Female: "Ayol" };
const ACTIVITY_LABELS: Record<ActivityKey, string> = {
  Minimal: "Minimal",
  Less: "Kam",
  Medium: "O'rta",
  High: "Yuqori",
  Maximal: "Maksimal",
};

// ── Xabar (kompozitsiya) ──────────────────────────────────────────
type Mode = "now" | "schedule";
const form = ref<FormInstance>();
const data = reactive<{
  title: string;
  description: string;
  image: string | null;
  mode: Mode;
  scheduled: string | null;
}>({
  title: "",
  description: "",
  image: null,
  mode: "now",
  scheduled: null,
});

const rules = reactive<FormRules<typeof data>>({
  title: [
    { required: true, message: "Sarlavha kiritilishi shart", trigger: "blur" },
    { max: 100, message: "Maksimal 100 ta belgi", trigger: "blur" },
  ],
  description: [
    { required: true, message: "Matn kiritilishi shart", trigger: "blur" },
    { max: 255, message: "Maksimal 255 ta belgi", trigger: "blur" },
  ],
  scheduled: [
    {
      validator: (_r, value, cb) => {
        if (data.mode === "schedule") {
          if (!value) return cb(new Error("Yuborish vaqtini tanlang"));
          if (new Date(value).getTime() <= Date.now())
            return cb(new Error("Vaqt hozirgidan keyin bo'lishi kerak"));
        }
        cb();
      },
      trigger: "change",
    },
  ],
});

const disabledDate = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

// ── Segment filtri ────────────────────────────────────────────────
const filter = reactive<SegmentFilter>(emptySegmentFilter());

const toggleIn = <T,>(arr: T[], value: T) => {
  const i = arr.indexOf(value);
  if (i === -1) arr.push(value);
  else arr.splice(i, 1);
};
const toggleGender = (g: GenderKey) => toggleIn(filter.genders, g);
const toggleActivity = (a: ActivityKey) => toggleIn(filter.activityLevels, a);
const togglePlan = (p: PlanKey) => toggleIn(filter.plans, p);

const isFilterEmpty = computed(
  () =>
    filter.genders.length === 0 &&
    filter.ageMin == null &&
    filter.ageMax == null &&
    filter.activityLevels.length === 0 &&
    filter.plans.length === 0 &&
    filter.engagement === "any",
);

const resetFilter = () => Object.assign(filter, emptySegmentFilter());

// Faol filtrni qisqa, o'qiladigan matnga aylantiradi (tarixga yozish uchun).
const segmentSummary = computed(() => {
  const parts: string[] = [];
  if (filter.genders.length)
    parts.push(filter.genders.map((g) => GENDER_LABELS[g]).join(", "));
  if (filter.ageMin != null || filter.ageMax != null)
    parts.push(`${filter.ageMin ?? "0"}–${filter.ageMax ?? "∞"} yosh`);
  if (filter.plans.length) parts.push(filter.plans.join(", "));
  if (filter.activityLevels.length)
    parts.push(filter.activityLevels.map((a) => ACTIVITY_LABELS[a]).join(", "));
  if (filter.engagement === "active")
    parts.push(`≤${filter.activeWithinDays} kun faol`);
  else if (filter.engagement === "dormant")
    parts.push(`≥${filter.dormantAfterDays} kun kam faol`);
  return parts.join(" · ") || "Barcha foydalanuvchilar";
});

// ── Snapshot & mos auditoriya ─────────────────────────────────────
onMounted(() => {
  audienceStore.loadSnapshot();
});

const snapshotReady = computed(
  () => audienceStore.snapshotLoadedAt != null && audienceStore.snapshot.length > 0,
);
const totalUsers = computed(() => audienceStore.snapshot.length);

const matched = computed(() =>
  snapshotReady.value ? audienceStore.resolve(filter).users : [],
);
const matchedCount = computed(() => matched.value.length);

const matchedGender = computed(() => {
  let male = 0,
    female = 0,
    unknown = 0;
  for (const u of matched.value) {
    if (u.gender === "Male") male++;
    else if (u.gender === "Female") female++;
    else unknown++;
  }
  return { male, female, unknown };
});

const matchedEngagement = computed(() => {
  let active = 0,
    dormant = 0,
    never = 0;
  for (const u of matched.value) {
    if (u.daysSinceLastSignIn == null) never++;
    else if (u.daysSinceLastSignIn <= filter.activeWithinDays) active++;
    else if (u.daysSinceLastSignIn >= filter.dormantAfterDays) dormant++;
  }
  return { active, dormant, never };
});

const noProfileCount = computed(
  () => matched.value.filter((u) => !u.hasProfile).length,
);

const progressPct = computed(() => {
  const { loaded, total } = audienceStore.progress;
  return total > 0 ? Math.round((loaded / total) * 100) : 0;
});

// ── Saqlangan listlar ─────────────────────────────────────────────
const savedSegments = computed(() => audienceStore.savedSegments);

const segmentCount = (seg: SavedSegment) =>
  snapshotReady.value ? audienceStore.resolve(seg.filter).ids.length : null;

const saveCurrent = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      "List uchun nom kiriting",
      "Listni saqlash",
      {
        confirmButtonText: "Saqlash",
        cancelButtonText: "Bekor",
        inputPlaceholder: "Masalan: Kam faol ayollar 25–35",
        inputValidator: (v: string) => (v && v.trim() ? true : "Nom kiriting"),
      },
    );
    audienceStore.saveSegment(value, filter);
    ElMessage.success("List saqlandi");
  } catch {
    /* bekor qilindi */
  }
};

const applySegment = (seg: SavedSegment) => {
  Object.assign(filter, JSON.parse(JSON.stringify(seg.filter)));
  ElMessage.success(`"${seg.name}" listi qo'llandi`);
};

const deleteSegment = async (seg: SavedSegment) => {
  try {
    await ElMessageBox.confirm(`"${seg.name}" listini o'chirasizmi?`, "Tasdiqlash", {
      type: "warning",
      confirmButtonText: "O'chirish",
      cancelButtonText: "Bekor",
    });
    audienceStore.removeSegment(seg.id);
    ElMessage.success("List o'chirildi");
  } catch {
    /* bekor */
  }
};

// ── Yuborish ──────────────────────────────────────────────────────
const sending = ref(false);
const result = ref<{ count: number; scheduled: string | null } | null>(null);

const handleSend = async () => {
  try {
    await form.value?.validate();
  } catch {
    return;
  }
  if (!snapshotReady.value) {
    ElMessage.warning("Auditoriya hali yuklanmoqda, biroz kuting");
    return;
  }

  const useAll = isFilterEmpty.value;
  const ids = useAll ? [] : audienceStore.resolve(filter).ids;
  const count = useAll ? totalUsers.value : ids.length;

  if (!useAll && ids.length === 0) {
    ElMessage.warning("Filtrga mos foydalanuvchi topilmadi");
    return;
  }

  const scheduledIso = data.mode === "schedule" ? data.scheduled : null;
  const whenLabel = scheduledIso
    ? `belgilangan vaqtda (${scheduledIso.slice(0, 16).replace("T", " ")})`
    : "hoziroq";
  const whoLabel = useAll
    ? `barcha foydalanuvchilarga (${count} ta)`
    : `${count} ta tanlangan foydalanuvchiga`;

  try {
    await ElMessageBox.confirm(
      `Push ${whoLabel} ${whenLabel} yuboriladi. Davom etamizmi?`,
      "Tasdiqlash",
      { confirmButtonText: "Ha, yuborilsin", cancelButtonText: "Bekor qilish", type: "warning" },
    );
  } catch {
    return;
  }

  result.value = null;
  sending.value = true;
  try {
    const res = await notificationStore.sendBatch({
      title: data.title.trim(),
      description: data.description.trim(),
      image: data.image,
      scheduled: scheduledIso,
      allUsers: useAll,
      userIds: useAll ? null : ids,
    });
    if (res.code === 200) {
      const sent = typeof res.content === "number" ? res.content : count;
      result.value = { count: sent, scheduled: scheduledIso };
      pushHistoryStore.record({
        title: data.title.trim(),
        description: data.description.trim(),
        image: data.image,
        audienceType: useAll ? "all" : "segment",
        audienceLabel: useAll
          ? "Barcha foydalanuvchilar"
          : `Segment · ${segmentSummary.value}`,
        recipientCount: sent,
        scheduled: scheduledIso,
      });
      ElMessage.success(
        scheduledIso
          ? `${sent} ta foydalanuvchiga rejalashtirildi`
          : `${sent} ta foydalanuvchiga yuborildi`,
      );
    }
  } catch {
    /* apiCallStore xatoni ko'rsatadi */
  } finally {
    sending.value = false;
  }
};

const startNew = () => {
  result.value = null;
  data.title = "";
  data.description = "";
  data.image = null;
  data.mode = "now";
  data.scheduled = null;
};
</script>

<template>
  <ElForm
    ref="form"
    :rules="rules"
    :model="data"
    class="edit-form"
    @submit.prevent="handleSend"
  >
    <!-- Sticky header -->
    <div class="form-header">
      <div class="flex items-center gap-3 min-w-0">
        <span class="hicon">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </span>
        <div class="min-w-0">
          <h1 class="text-[19px] font-bold truncate" style="color: var(--text)">Segmentli push</h1>
          <p class="text-[12.5px]" style="color: var(--text-faint)">
            Auditoriyani filtrlab, tanlangan guruhga push yuboring
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="aud-badge">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
          <template v-if="!snapshotReady">yuklanmoqda…</template>
          <template v-else-if="isFilterEmpty">Barcha {{ totalUsers }}</template>
          <template v-else>{{ matchedCount }} / {{ totalUsers }}</template>
        </span>
        <button type="button" class="hbtn-save" :disabled="sending" @click="handleSend">
          <span v-if="sending" class="spinner"></span>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          {{ sending ? "Yuborilmoqda..." : "Yuborish" }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
      <!-- LEFT -->
      <div class="xl:col-span-2 space-y-5 min-w-0">
        <!-- Matn -->
        <section class="panel">
          <h2 class="panel-title">Xabar</h2>
          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Sarlavha</label>
              <ElFormItem prop="title" class="!mb-0">
                <ElInput v-model="data.title" placeholder="Bildirishnoma sarlavhasi" size="large" maxlength="100" show-word-limit :disabled="sending" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Matn</label>
              <ElFormItem prop="description" class="!mb-0">
                <ElInput v-model="data.description" type="textarea" :rows="5" placeholder="Push matni" maxlength="255" show-word-limit :disabled="sending" />
              </ElFormItem>
            </div>
            <div>
              <label class="lbl">Rasm (ixtiyoriy)</label>
              <FileUpload v-model="data.image" accept="image/*" />
            </div>
          </div>
        </section>

        <!-- Segment filtri -->
        <section class="panel">
          <div class="flex items-center justify-between">
            <h2 class="panel-title">Auditoriya filtri</h2>
            <button v-if="!isFilterEmpty" type="button" class="link-btn" @click="resetFilter">Filtrni tozalash</button>
          </div>

          <div class="space-y-5 mt-4">
            <!-- Jins -->
            <div>
              <label class="lbl">Jins</label>
              <div class="chips">
                <button
                  v-for="g in GENDERS"
                  :key="g"
                  type="button"
                  class="chip"
                  :class="{ 'chip-on': filter.genders.includes(g) }"
                  @click="toggleGender(g)"
                >{{ GENDER_LABELS[g] }}</button>
              </div>
            </div>

            <!-- Yosh -->
            <div>
              <label class="lbl">Yosh oralig'i</label>
              <div class="flex items-center gap-2">
                <ElInputNumber v-model="filter.ageMin" :min="0" :max="120" :controls="false" placeholder="dan" class="w-28" />
                <span style="color: var(--text-faint)">—</span>
                <ElInputNumber v-model="filter.ageMax" :min="0" :max="120" :controls="false" placeholder="gacha" class="w-28" />
                <span class="text-[12px]" style="color: var(--text-faint)">yosh</span>
              </div>
            </div>

            <!-- Obuna -->
            <div>
              <label class="lbl">Obuna tarifi</label>
              <div class="chips">
                <button
                  v-for="p in PLANS"
                  :key="p"
                  type="button"
                  class="chip"
                  :class="{ 'chip-on': filter.plans.includes(p) }"
                  @click="togglePlan(p)"
                >{{ p }}</button>
              </div>
            </div>

            <!-- Fitnes faollik -->
            <div>
              <label class="lbl">Fitnes faollik darajasi</label>
              <div class="chips">
                <button
                  v-for="a in ACTIVITIES"
                  :key="a"
                  type="button"
                  class="chip"
                  :class="{ 'chip-on': filter.activityLevels.includes(a) }"
                  @click="toggleActivity(a)"
                >{{ ACTIVITY_LABELS[a] }}</button>
              </div>
            </div>

            <!-- App faolligi (engagement) -->
            <div>
              <label class="lbl">App faolligi</label>
              <ElRadioGroup v-model="filter.engagement" class="w-full eng-group">
                <ElRadioButton value="any">Hammasi</ElRadioButton>
                <ElRadioButton value="active">Doimiy</ElRadioButton>
                <ElRadioButton value="dormant">Kam faol</ElRadioButton>
              </ElRadioGroup>

              <div v-if="filter.engagement === 'active'" class="thresh">
                <span>Oxirgi</span>
                <ElInputNumber v-model="filter.activeWithinDays" :min="1" :max="365" :controls="false" class="w-20" />
                <span>kun ichida kirgan foydalanuvchilar</span>
              </div>
              <div v-else-if="filter.engagement === 'dormant'" class="thresh">
                <ElInputNumber v-model="filter.dormantAfterDays" :min="1" :max="365" :controls="false" class="w-20" />
                <span>kun va undan ko'p kirmagan (yoki hech kirmagan)</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Natija -->
        <section v-if="result" class="panel">
          <div class="result-card">
            <span class="result-icon">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </span>
            <div class="min-w-0">
              <p class="result-title">{{ result.scheduled ? "Rejalashtirildi" : "Yuborildi" }}</p>
              <p class="result-sub">
                {{ result.count }} ta foydalanuvchiga
                <template v-if="result.scheduled"> · {{ result.scheduled.slice(0, 16).replace("T", " ") }}</template>
              </p>
            </div>
            <button type="button" class="btn-ghost" @click="startNew">Yangi xabar</button>
          </div>
        </section>
      </div>

      <!-- RIGHT -->
      <div class="space-y-5 min-w-0">
        <!-- Auditoriya -->
        <section class="panel">
          <div class="flex items-center justify-between">
            <h2 class="panel-title">Auditoriya</h2>
            <button
              type="button"
              class="link-btn"
              :disabled="audienceStore.loading"
              @click="audienceStore.loadSnapshot(true)"
            >{{ audienceStore.loading ? "Yuklanmoqda…" : "Yangilash" }}</button>
          </div>

          <!-- Yuklanish holati -->
          <div v-if="audienceStore.loading" class="mt-4">
            <div class="progress-track"><div class="progress-fill" :style="{ width: progressPct + '%' }"></div></div>
            <p class="text-[11.5px] mt-2" style="color: var(--text-faint)">
              {{ audienceStore.progress.loaded }} / {{ audienceStore.progress.total }} foydalanuvchi o'qilmoqda…
            </p>
          </div>

          <template v-else-if="snapshotReady">
            <div class="count-box mt-4">
              <p class="count-num">{{ isFilterEmpty ? totalUsers : matchedCount }}</p>
              <p class="count-lbl">
                <template v-if="isFilterEmpty">barcha foydalanuvchi</template>
                <template v-else>{{ totalUsers }} tadan mos keldi</template>
              </p>
            </div>

            <!-- Jins taqsimoti -->
            <div class="mini-row mt-4">
              <span class="mini-lbl">Erkak</span>
              <span class="mini-val">{{ matchedGender.male }}</span>
            </div>
            <div class="mini-row">
              <span class="mini-lbl">Ayol</span>
              <span class="mini-val">{{ matchedGender.female }}</span>
            </div>
            <div v-if="matchedGender.unknown" class="mini-row">
              <span class="mini-lbl">Noma'lum</span>
              <span class="mini-val">{{ matchedGender.unknown }}</span>
            </div>

            <div class="divider"></div>

            <!-- Engagement taqsimoti -->
            <div class="mini-row">
              <span class="mini-lbl">Doimiy (≤{{ filter.activeWithinDays }} kun)</span>
              <span class="mini-val">{{ matchedEngagement.active }}</span>
            </div>
            <div class="mini-row">
              <span class="mini-lbl">Kam faol (≥{{ filter.dormantAfterDays }} kun)</span>
              <span class="mini-val">{{ matchedEngagement.dormant }}</span>
            </div>
            <div class="mini-row">
              <span class="mini-lbl">Hech kirmagan</span>
              <span class="mini-val">{{ matchedEngagement.never }}</span>
            </div>

            <p v-if="noProfileCount" class="warn-note">
              {{ noProfileCount }} ta foydalanuvchi profilini to'ldirmagan (jins/yosh yo'q).
            </p>
          </template>

          <p v-else class="text-[12.5px] mt-4" style="color: var(--text-faint)">
            Auditoriya ma'lumotini yuklab bo'lmadi.
            <button type="button" class="link-btn" @click="audienceStore.loadSnapshot(true)">Qayta urinish</button>
          </p>
        </section>

        <!-- Yetkazish -->
        <section class="panel">
          <h2 class="panel-title">Yetkazish</h2>
          <div class="space-y-4 mt-4">
            <div>
              <label class="lbl">Vaqt</label>
              <ElRadioGroup v-model="data.mode" :disabled="sending" class="w-full mode-group">
                <ElRadioButton value="now">Hoziroq</ElRadioButton>
                <ElRadioButton value="schedule">Rejalashtirish</ElRadioButton>
              </ElRadioGroup>
            </div>
            <div v-if="data.mode === 'schedule'">
              <label class="lbl">Yuborish vaqti</label>
              <ElFormItem prop="scheduled" class="!mb-0">
                <ElDatePicker
                  v-model="data.scheduled"
                  type="datetime"
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DDTHH:mm:ss"
                  placeholder="Sana va vaqtni tanlang"
                  size="large"
                  class="w-full"
                  :disabled-date="disabledDate"
                  :disabled="sending"
                />
              </ElFormItem>
              <p class="hint">Belgilangan vaqtda push avtomatik yuboriladi.</p>
            </div>
            <p v-else class="hint">Xabar tasdiqlangach darhol yuboriladi.</p>
          </div>
        </section>

        <!-- Saqlangan listlar -->
        <section class="panel">
          <div class="flex items-center justify-between">
            <h2 class="panel-title">Saqlangan listlar</h2>
            <button type="button" class="link-btn" @click="saveCurrent">+ Joriy filtrni saqlash</button>
          </div>

          <div v-if="savedSegments.length" class="space-y-2 mt-4">
            <div v-for="seg in savedSegments" :key="seg.id" class="seg-item">
              <div class="min-w-0 flex-1">
                <p class="seg-name">{{ seg.name }}</p>
                <p class="seg-sub">
                  <template v-if="segmentCount(seg) != null">{{ segmentCount(seg) }} ta foydalanuvchi</template>
                  <template v-else>—</template>
                </p>
              </div>
              <button type="button" class="seg-apply" @click="applySegment(seg)">Qo'llash</button>
              <button type="button" class="seg-del" title="O'chirish" @click="deleteSegment(seg)">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <p v-else class="text-[12.5px] mt-4" style="color: var(--text-faint)">
            Hozircha saqlangan list yo'q. Filtrni sozlab, "Joriy filtrni saqlash" tugmasini bosing.
          </p>
        </section>
      </div>
    </div>
  </ElForm>
</template>

<style scoped>
.form-header {
  position: sticky;
  top: -28px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}
.hicon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-strong);
  background: var(--brand-soft);
}
.aud-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-strong);
  background: var(--brand-soft);
  white-space: nowrap;
}
.hbtn-save {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 22px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  box-shadow: 0 6px 16px rgba(var(--brand-rgb), 0.3);
  transition: all 0.18s ease;
}
.hbtn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(var(--brand-rgb), 0.42);
}
.hbtn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
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
.lbl {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 7px;
}
.hint {
  margin-top: 6px;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--text-faint);
}
.link-btn {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-strong);
  transition: opacity 0.15s ease;
}
.link-btn:hover:not(:disabled) {
  opacity: 0.75;
}
.link-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
/* Chip tanlash */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  height: 34px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}
.chip:hover {
  border-color: var(--brand);
  color: var(--text);
}
.chip-on {
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  border-color: transparent;
  box-shadow: 0 4px 10px rgba(var(--brand-rgb), 0.28);
}
.eng-group,
.mode-group {
  display: flex;
}
.eng-group :deep(.el-radio-button),
.eng-group :deep(.el-radio-button__inner) {
  flex: 1;
}
.mode-group :deep(.el-radio-button),
.mode-group :deep(.el-radio-button__inner) {
  width: 50%;
}
.thresh {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--text-muted);
}
/* Auditoriya hisobi */
.count-box {
  padding: 16px;
  border-radius: 12px;
  background: var(--surface-2);
  text-align: center;
}
.count-num {
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  color: var(--brand-strong);
}
.count-lbl {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}
.mini-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 12.5px;
}
.mini-lbl {
  color: var(--text-muted);
}
.mini-val {
  font-weight: 700;
  color: var(--text);
}
.divider {
  height: 1px;
  background: var(--border);
  margin: 8px 0;
}
.warn-note {
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--warning);
  background: var(--warning-soft);
}
.progress-track {
  height: 8px;
  border-radius: 6px;
  background: var(--surface-hover);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  transition: width 0.2s ease;
}
/* Saqlangan listlar */
.seg-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 11px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.seg-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.seg-sub {
  font-size: 11.5px;
  color: var(--text-faint);
  margin-top: 1px;
}
.seg-apply {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-strong);
  background: var(--brand-soft);
  flex-shrink: 0;
}
.seg-apply:hover {
  filter: brightness(0.97);
}
.seg-del {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--danger);
  background: var(--danger-soft);
  flex-shrink: 0;
}
.result-card {
  display: flex;
  align-items: center;
  gap: 14px;
}
.result-icon {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--success);
  background: var(--success-soft);
  flex-shrink: 0;
}
.result-title {
  font-size: 15.5px;
  font-weight: 700;
  color: var(--text);
}
.result-sub {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 1px;
}
.btn-ghost {
  margin-left: auto;
  height: 40px;
  padding: 0 18px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-strong);
  background: var(--brand-soft);
  flex-shrink: 0;
}
.btn-ghost:hover {
  filter: brightness(0.97);
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2.5px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.edit-form :deep(.el-input__wrapper),
.edit-form :deep(.el-textarea__inner),
.edit-form :deep(.el-input-number) {
  border-radius: 11px;
}
</style>
