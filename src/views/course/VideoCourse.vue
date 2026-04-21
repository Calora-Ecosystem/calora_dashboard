<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import CourseCard from "../../components/shared/CourseCard.vue";
import GenderSelect from "../../components/shared/GenderSelect.vue";
import { useCourseStore } from "../../stores/courseStore";
import IfEmpty from "../../components/shared/IfEmpty.vue";
import { useRoute, useRouter } from "vue-router";
import { ElButton } from "element-plus";

const route = useRoute();
const router = useRouter();

const gender = ref((route.query.gender as string) ?? "male");

const courseStore = useCourseStore();

onMounted(async () => {
  await courseStore.loadCourses(gender.value);
});

watch(gender, async (newGender) => {
  router.replace({ ...route, query: { ...route.query, gender: newGender } });
  await courseStore.loadCourses(newGender);
});
</script>

<template>
  <div class="flex flex-row justify-between items-center">
    <GenderSelect v-model="gender" />
    <div>
      <RouterLink :to="{ name: 'course_create' }">
        <ElButton size="large" type="primary">Create</ElButton>
      </RouterLink>
    </div>
  </div>
  <div class="flex flex-row flex-wrap gap-x-3">
    <IfEmpty :value="courseStore.courses as any">
      <CourseCard
        v-for="item in courseStore.courses"
        class="mt-4"
        :id="item.id"
        :title="item.title.uz"
        :gender="item.gender"
        svg="programming"
        :description="item.description.uz"
        :image-link="item.assets.find((x: any) => x.type === 'MainImage')?.url"
        :type="item.type"
      />
    </IfEmpty>
  </div>
</template>
