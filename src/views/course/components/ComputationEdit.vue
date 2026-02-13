<script setup lang="ts">
import { onMounted, reactive } from "vue";
import {
  ACTIVITIES,
  COMPUTATION_TYPE,
  ENTITY_TYPES,
} from "../../../constants/ApiContstants";
import {
  ActivityType,
  ComputationType,
  EntityType,
} from "../../../@types/common";
import { useCourseStore } from "../../../stores/courseStore";

const courseStore = useCourseStore();

const props = defineProps<{
  type: EntityType;
  entityId: number;
}>();

const data = reactive<{
  computations: {
    id?: number;
    entityId: number;
    type: EntityType;
    activity: ActivityType;
    computationType: ComputationType;
    value: number;
  }[];
}>({
  computations: [],
});

const handleAddComputation = () => {
  data.computations.push({
    activity: ACTIVITIES[0],
    computationType: COMPUTATION_TYPE[0],
    entityId: 0,
    type: ENTITY_TYPES[0],
    value: 0,
  });
};

onMounted(async () => {
  if (props.type === "Workout") {
    const computations = await courseStore.getWorkoutComputations(
      props.entityId,
    );

    Object.assign(data, { computations });
  }
});
</script>
<template>
  <ElFormItem label="Computations" required prop="computations">
    <ElTable :data="data.computations">
      <ElTableColumn label="Activity" prop="activity">
        <template #default="{ row, index }">
          <ElFormItem :prop="`computations.${row.id}.activity`">
            <ElSelect v-model="row.activity">
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
      <ElTableColumn>
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
      </ElTableColumn>
    </ElTable>
    <div>
      <ElButton
        type="success"
        plain
        @click="handleAddComputation"
        size="default"
        >+</ElButton
      >
    </div>
  </ElFormItem>
</template>
