<script setup lang="ts">
import {
  ActivityType,
  ComputationType,
  EntityType,
} from "../../../@types/common";
import {
  ACTIVITIES,
  COMPUTATION_TYPE,
  COURSE_TYPES,
} from "../../../constants/ApiContstants";
import {
  ElBadge,
  ElFormItem,
  ElInputNumber,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const model = defineModel<
  {
    id?: number;
    entityId: number;
    type: EntityType;
    activity: ActivityType;
    computationType: ComputationType;
    value: number;
    kcal: number;
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
    <ElTableColumn label="Activity" prop="activity" width="250">
      <template #default="{ row, index }">
        <ElFormItem :prop="`computations.${row.id}.activity`">
          <ElSelect v-model="row.activity" :disabled="true" class="w-full">
            <ElOption
              v-for="value in ACTIVITIES"
              :key="value"
              :label="t(`activities.${value}`)"
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
          <el-popover
            content="Default value from Workout"
            size="small"
            placement="top"
            :disabled="!row.fromType || row.fromType !== COURSE_TYPES[1]"
          >
            <template #reference>
              <ElInputNumber v-model="row.value" :min="0" :max="9_999" />
            </template>
          </el-popover>
        </ElFormItem>
      </template>
    </ElTableColumn>
    <ElTableColumn label="Kcal" prop="kcal">
      <template #default="{ row }">
        <ElFormItem :prop="`computations.${row.id}.kcal`">
          <el-popover
            content="Default value from Workout"
            size="small"
            placement="top"
            :disabled="!row.fromType || row.fromType !== COURSE_TYPES[1]"
          >
            <template #reference>
              <ElInputNumber v-model="row.kcal" :min="0" :max="9_999" />
            </template>
          </el-popover>
        </ElFormItem>
      </template>
    </ElTableColumn>
  </ElTable>
</template>
