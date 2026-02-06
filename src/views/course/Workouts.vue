<script setup lang="ts">
import Card from "../../components/ui/Card.vue";
import IfEmpty from "../../components/shared/IfEmpty.vue";
import { ElTable, ElTableColumn } from "element-plus";
</script>
<template>
  <Card title="">
    <div>#filter_elements</div>
    <IfEmpty :value="false">
      <ElTable :fit="true">
        <ElTableColumn label="ID" />
        <ElTableColumn label="Name" />
        <ElTableColumn label="Calories" />
        <ElTableColumn label="Duration" />
        <ElTableColumn label="Tasks" />
        <ElTableColumn label="Sort Number" />
        <ElTableColumn label="Actions" />
      </ElTable>
    </IfEmpty>
  </Card>
</template>
