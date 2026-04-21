<script setup lang="ts">
import Card from "../../components/ui/Card.vue";
import IfEmpty from "../../components/shared/IfEmpty.vue";
import { ElTable, ElTableColumn } from "element-plus";
</script>

<template>
  <Card title="">
    <div>#filter_elements</div>
    <IfEmpty :value="true">
      <ElTable :fit="true">
        <ElTableColumn label="ID" />
        <ElTableColumn label="Full Name" />
        <ElTableColumn label="Email" />
        <ElTableColumn label="Gender" />
        <ElTableColumn label="Date" />
        <ElTableColumn label="Point" />
        <ElTableColumn label="Status" />
      </ElTable>
    </IfEmpty>
  </Card>
</template>
