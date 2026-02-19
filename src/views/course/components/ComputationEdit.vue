<script setup lang="ts">
import {
  ActivityType,
  ComputationType,
  EntityType,
} from "../../../@types/common";
import { ACTIVITIES, COMPUTATION_TYPE } from "../../../constants/ApiContstants";

const model = defineModel<
  {
    id?: number;
    entityId: number;
    type: EntityType;
    activity: ActivityType;
    computationType: ComputationType;
    value: number;
  }[]
>();

const props = withDefaults(
  defineProps<{
    type: EntityType;
    entityId: number;
  }>(),
  {
    entityId: 0,
  },
);
</script>
<template>
  <ElTable :data="model">
    <ElTableColumn label="Activity" prop="activity">
      <template #default="{ row, index }">
        <ElFormItem :prop="`computations.${row.id}.activity`">
          <ElSelect v-model="row.activity" :disabled="true">
            <ElOption
              v-for="value in ACTIVITIES"
              :key="value"
              :label="value"
              :value="value"
            ></ElOption>
          </ElSelect>
        </ElFormItem>
      </template>
    </ElTableColumn>
    <ElTableColumn label="Computation Type" prop="computationType">
      <template #default="{ row, index }">
        <ElFormItem :prop="`computations.${row.id}.computationType`">
          <ElSelect v-model="row.computationType">
            <ElOption
              v-for="value in COMPUTATION_TYPE"
              :key="value"
              :label="value"
              :value="value"
            ></ElOption>
          </ElSelect>
        </ElFormItem>
      </template>
    </ElTableColumn>
    <ElTableColumn label="Value" prop="value">
      <template #default="{ row }">
        <ElFormItem :prop="`computations.${row.id}.value`">
          <ElInputNumber v-model="row.value" :min="0" :max="9_999" />
        </ElFormItem>
      </template>
    </ElTableColumn>
    <!-- <ElTableColumn>
      <template #default="{ row }">
        <ElButton
          type="danger"
          size="default"
          @click="
            () =>
              data.computations.splice(
                data.computations.findIndex((m) => m.id === row.id),
                1,
              )
          "
          >Remove</ElButton
        >
      </template>
    </ElTableColumn> -->
  </ElTable>
  <div>
    <!-- <ElButton
      type="success"
      plain
      @click="handleAddComputation"
      size="default"
      hidden
      >+</ElButton
    > -->
  </div>
</template>
