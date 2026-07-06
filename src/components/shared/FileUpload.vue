<script setup lang="ts">
import { ElButton, ElImage, ElUpload, ElIcon, ElMessage } from "element-plus";
import { DeleteFilled } from "@element-plus/icons-vue";
import { makeFileUrl } from "../../integrations/axios";
import { useAppStore } from "../../stores/appStore";
import { useTokenStore } from "../../stores/tokenStore";
import SvgIcon from "./SvgIcon.vue";
import Lottie from "./Lottie.vue";
import { computed, ref, watch } from "vue";

const appStore = useAppStore();
const tokenStore = useTokenStore();

const props = withDefaults(
  defineProps<{
    multiple?: boolean;
    accept?: string | string[];
  }>(),
  {
    multiple: false,
    accept: () =>
      [
        "image/*",
        "video/*",
        "application/json", // for lottie .json
      ] as string[],
  },
);

type ModelType = string | null | string[];

const model = defineModel<ModelType>({ required: false, default: null });

const uploadedUrls = ref<string[]>([]);

// Upload progress state
const uploading = ref(false);
const progress = ref(0);
const uploadingName = ref("");

// helpers
const normalizeAccept = computed(() =>
  Array.isArray(props.accept) ? props.accept.join(",") : props.accept,
);

const asArray = (val: ModelType): string[] => {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

const updateModelFromUrls = () => {
  if (props.multiple) {
    model.value = [...uploadedUrls.value];
  } else {
    model.value = uploadedUrls.value[0] ?? null;
  }
};

const toAbsoluteUrl = (path: string) =>
  path.startsWith("http://") || path.startsWith("https://")
    ? path
    : makeFileUrl(path);

const handleChoose = (file: any, fileList: any[]) => {
  // Element Plus triggers onChange for each status change.
  if (file.status === "ready") {
    uploading.value = true;
    progress.value = 0;
    uploadingName.value = file.name ?? "";
  } else if (file.status === "success") {
    uploading.value = false;
    progress.value = 100;
    const url = file.response?.content;
    if (url) {
      if (props.multiple) {
        uploadedUrls.value.push(url);
      } else {
        uploadedUrls.value = [url];
      }
      updateModelFromUrls();
    }
  } else if (file.status === "fail") {
    uploading.value = false;
    progress.value = 0;
    ElMessage.error("Fayl yuklashda xatolik yuz berdi");
  }
};

// Fired continuously while the file is being uploaded.
const handleProgress = (evt: any) => {
  uploading.value = true;
  progress.value = Math.round(evt.percent ?? 0);
};

const removeItem = (rawUrl: string) => {
  const idx = uploadedUrls.value.findIndex((u) => u === rawUrl);
  if (idx !== -1) {
    uploadedUrls.value.splice(idx, 1);
    updateModelFromUrls();
  }
};

watch(
  model,
  (newVal) => {
    const current = asArray(newVal || null);
    uploadedUrls.value = [...current];
  },
  { immediate: true },
);

// Preview type detection
const isImage = (url: string) =>
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url) || url.startsWith("image:");

const isVideo = (url: string) =>
  /\.(mp4|webm|ogg|mov|m4v)$/i.test(url) || url.startsWith("video:");

const isLottie = (url: string) => /\.json$/i.test(url);

const previewItems = computed(() =>
  uploadedUrls.value.map((u) => ({
    raw: u,
    abs: toAbsoluteUrl(u),
    type: isLottie(u) ? "lottie" : isVideo(u) ? "video" : "image",
  })),
);
</script>

<template>
  <ElUpload
    class="border-[0.6px] border-solid border-[#D5D5D5] bg-[#F5F6FA] rounded-sm w-90 flex flex-row-reverse items-center justify-between px-2 gap-x-2"
    :show-file-list="false"
    :action="makeFileUrl('')"
    :headers="{ Authorization: `Bearer ${tokenStore.accessToken}` }"
    :multiple="props.multiple"
    :accept="normalizeAccept"
    @change="handleChoose"
    @progress="handleProgress"
  >
    <div class="w-full flex flex-col items-stretch justify-start gap-2 p-2">
      <!-- Upload progress -->
      <div v-if="uploading" class="upload-progress" @click.stop>
        <div class="up-top">
          <div class="up-spinner"></div>
          <div class="up-info">
            <p class="up-title">Yuklanmoqda...</p>
            <p v-if="uploadingName" class="up-name" :title="uploadingName">{{ uploadingName }}</p>
          </div>
          <div class="up-percent">{{ progress }}%</div>
        </div>
        <div class="up-track">
          <div class="up-bar" :style="{ width: progress + '%' }">
            <div class="up-stripes"></div>
          </div>
        </div>
      </div>

      <template v-if="previewItems.length === 0 && !uploading">
        <SvgIcon icon="upload-image.svg" />
      </template>

      <template v-else>
        <template v-for="item in previewItems" :key="item.raw">
          <div class="relative group w-full overflow-hidden rounded">
            <ElImage
              v-if="item.type === 'image'"
              :preview-src-list="[item.abs]"
              :src="item.abs"
              class="w-full object-contain"
              fit="contain"
            />
            <video
              v-else-if="item.type === 'video'"
              :src="item.abs"
              controls
              class="w-full object-contain bg-black"
            />
            <div v-else class="w-full flex items-center justify-center">
              <Lottie :animation-link="item.abs" class="w-full" />
            </div>

            <ElButton
              type="danger"
              text
              circle
              class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white! transition-opacity text-red-600 rounded-full shadow p-0! w-7 h-7 flex items-center justify-center"
              @click.stop="removeItem(item.raw)"
              aria-label="Remove file"
              title="Remove"
            >
              <ElIcon><DeleteFilled /></ElIcon>
            </ElButton>
          </div>
        </template>
      </template>
    </div>
    <template #trigger>
      <div>
        <ElButton type="success" plain :loading="appStore.isLoading || uploading">
          <span class="mr-2">Choose File</span>
          <SvgIcon icon="icons/arrow-right.svg" />
        </ElButton>
      </div>
    </template>
  </ElUpload>
</template>

<style scoped>
.upload-progress {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e5e7eb);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}
.up-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.up-spinner {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 2.5px solid rgba(var(--brand-rgb, 34, 197, 94), 0.25);
  border-top-color: var(--brand, #22c55e);
  border-radius: 50%;
  animation: up-spin 0.7s linear infinite;
}
.up-info {
  flex: 1;
  min-width: 0;
}
.up-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #111827);
  line-height: 1.2;
}
.up-name {
  font-size: 11px;
  color: var(--text-faint, #9ca3af);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.up-percent {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--brand-strong, #16a34a);
  font-variant-numeric: tabular-nums;
}
.up-track {
  margin-top: 12px;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: var(--surface-2, #f1f5f9);
  overflow: hidden;
}
.up-bar {
  position: relative;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--brand, #22c55e),
    var(--brand-strong, #16a34a)
  );
  transition: width 0.25s ease;
  overflow: hidden;
}
.up-stripes {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.28) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.28) 50%,
    rgba(255, 255, 255, 0.28) 75%,
    transparent 75%,
    transparent
  );
  background-size: 20px 20px;
  animation: up-stripes-move 0.7s linear infinite;
}
@keyframes up-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes up-stripes-move {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 20px 0;
  }
}
</style>
