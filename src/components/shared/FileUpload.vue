<script setup lang="ts">
import { ElButton, ElImage, ElUpload, ElIcon } from "element-plus";
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
  // Element Plus triggers onChange for each status change. We only act on success.
  if (file.status === "success") {
    const url = file.response?.content;
    if (url) {
      if (props.multiple) {
        uploadedUrls.value.push(url);
      } else {
        uploadedUrls.value = [url];
      }
      updateModelFromUrls();
    }
  }
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
  >
    <div class="w-full flex flex-col items-stretch justify-start gap-2 p-2">
      <template v-if="previewItems.length === 0">
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
        <ElButton type="success" plain :loading="appStore.isLoading">
          <span class="mr-2">Choose File</span>
          <SvgIcon icon="icons/arrow-right.svg" />
        </ElButton>
      </div>
    </template>
  </ElUpload>
</template>
