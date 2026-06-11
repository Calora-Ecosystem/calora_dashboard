<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
onMounted(() => router.replace({ name: "reminder_messages" }));
</script>

<template>
  <div></div>
</template>
