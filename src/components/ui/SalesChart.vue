<template>
  <div class="p-6 bg-white rounded-xl shadow-md">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">Sales Details</h2>
      <div class="w-50">
        <el-select
          v-model="selectedYear"
          placeholder="Select Year"
          class="w-full"
        >
          <el-option
            v-for="year in years"
            :key="year"
            :label="year"
            :value="year"
          />
        </el-select>
      </div>
    </div>
    <div class="chart-wrapper">
      <Bar
        ref="chartRef"
        :data="chartData"
        :options="chartOptions"
        class="h-[3.23rem]"
        :height="50"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
} from "chart.js";
import { Line, Bar } from "vue-chartjs";
import { ElSelect, ElOption } from "element-plus";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
);

const chartRef = ref(null);

// Chart data
const years = [2023, 2024, 2025];
const selectedYear = ref(2025);

const monthlyLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const salesDataByYear = {
  2023: [30, 40, 35, 50, 45, 60, 55, 65, 70, 60, 75, 80],
  2024: [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 100],
  2025: [40, 45, 50, 55, 50, 65, 70, 75, 80, 85, 90, 95],
};

const chartData = ref({
  labels: monthlyLabels,
  datasets: [
    {
      label: "Sales",
      data: salesDataByYear[selectedYear.value],
      borderColor: "#D5F2BD",
      backgroundColor: "#D5F2BD",
      hoverBorderColor: "#7CC243",
      hoverBackgroundColor: "#7CC243",
      tension: 0.4,
      fill: true,
      borderWidth: 2,
      borderRadius: 5,
      borderSkipped: "bottom",
      cursor: "pointer",
    },
  ],
});

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
    },
  },
  scales: {
    y: {
      min: 0,
      ticks: {
        callback: function (value) {
          return value + "%";
        },
      },
    },
  },

  layout: {
    autoPadding: true,
  },
  onHover: (event, chartElement) => {
    event.native.target.style.cursor = chartElement[0] ? "pointer" : "default";
  },
};

// Watch year selection
watch(selectedYear, (newYear) => {
  chartData.value.datasets[0].data = salesDataByYear[newYear];
  chartRef.value.chart.update();
});
</script>

<style scoped>
/* TailwindCSS bilan biriktirilgan, qo‘shimcha custom style shart emas */
</style>
