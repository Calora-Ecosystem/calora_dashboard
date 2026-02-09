<script setup lang="ts">
import { ElButton, ElEmpty } from "element-plus";
import { computed, onBeforeMount, ref, watch } from "vue";
import SvgIcon from "./SvgIcon.vue";

type TValue = boolean | any[] | any;

const props = defineProps<{
  value: TValue | (() => Promise<TValue>) | (() => TValue);
}>();

const isEmpty = async (value: typeof props.value) => {
  if (value === null || value === undefined) return true;

  if (Array.isArray(value)) return value.length == 0;

  if (typeof value === "boolean") return value;

  if (typeof value === "function") {
    let result = value();

    if (result instanceof Promise) return isEmpty(await result);

    return isEmpty(value);
  }

  return true;
};

const emptyRef = ref(true);

watch(
  () => props.value,
  async () => {
    emptyRef.value = await isEmpty(props.value);
  },
);

onBeforeMount(async () => {
  emptyRef.value = await isEmpty(props.value);
});
</script>
<template>
  <template v-if="emptyRef">
    <div class="flex w-full h-auto justify-center items-center">
      <div
        class="flex flex-col rounded-[48px] items-center min-w-0 w-120 bg-white justify-center p-8"
      >
        <svg-icon icon="empty.svg" />
        <h1 class="text-[24px] font-semibold text-[#0F172A] leading-8">
          Nothing Here Yet!
        </h1>
        <p
          class="font-normal text-[14px] text-[#7B899D] leading-5.5 content-center text-center mt-2"
        >
          Looks like there’s no content here right now. Check back later or try
          something else.
        </p>
        <el-button class="mt-4" type="primary">Refresh</el-button>
      </div>
    </div>
  </template>
  <template v-else>
    <slot />
  </template>
</template>
