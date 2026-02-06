<script setup lang="ts">
import CourseCard from "../../components/shared/CourseCard.vue";
import GenderSelect from "../../components/shared/GenderSelect.vue";
</script>

<template>
  <GenderSelect />
  <div class="flex flex-row flex-wrap gap-x-3">
    <CourseCard
      class="mt-4"
      :id="1"
      title="Introduction to Programming"
      svg="programming"
      description="Learn the basics of programming with hands-on exercises."
    />
    <CourseCard
      class="mt-4"
      :id="2"
      title="Advanced Programming Techniques"
      svg="programming"
      description="Deep dive into advanced programming concepts and best practices."
    />
  </div>
</template>
