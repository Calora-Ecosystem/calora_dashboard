<script setup lang="ts">
import { ElButton, ElImage, ElUpload } from "element-plus";
import { makeFileUrl } from "../../integrations/axios";
import { useAppStore } from "../../stores/appStore";
import { useTokenStore } from "../../stores/tokenStore";
import SvgIcon from "./SvgIcon.vue";
import { ref, watch } from "vue";

const appStore = useAppStore();
const tokenStore = useTokenStore();

const model = defineModel<string | null>({ required: false, default: null });

const uploadedUrl = ref<string | null>(null);

const handleChoose = (file: any) => {
  if (file.status === "success") {
    model.value = file.response.content;
  }
};

watch(model, (newVal) => {
  uploadedUrl.value = newVal ? makeFileUrl(newVal) : null;
});
</script>

<template>
  <ElUpload
    class="border-[0.6px] border-solid border-[#D5D5D5] bg-[#F5F6FA] rounded-sm w-90 h-27.25 flex flex-row-reverse items-center justify-around px-2 gap-x-2"
    :show-file-list="false"
    :action="makeFileUrl('')"
    :headers="{ Authorization: `Bearer ${tokenStore.accessToken}` }"
    @change="handleChoose"
  >
    <div class="h-full flex justify-center items-center">
      <SvgIcon v-if="!uploadedUrl" icon="upload-image.svg" />
      <ElImage
        v-else
        :preview-src-list="[uploadedUrl]"
        :src="uploadedUrl"
        class="w-full h-full"
        fit="contain"
      />
    </div>
    <template #trigger>
      <div>
        <ElButton type="success" plain :loading="appStore.isLoading"
          ><span class="mr-2">Choose File</span>
          <SvgIcon icon="icons/arrow-right.svg"
        /></ElButton>
      </div>
    </template>
  </ElUpload>
</template>
