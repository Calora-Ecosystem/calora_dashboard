import { defineStore } from "pinia";
import { reactive, ref, watch } from "vue";
import { useApiCallStore } from "./apiCallStore";
import { axios } from "../integrations/axios";
import { useRoute } from "vue-router";
import { de } from "element-plus/es/locale/index.mjs";

export const useCourseStore = defineStore("course", () => {
  const { execute } = useApiCallStore();
  const route = useRoute();

  const courses = ref<{ id: number } | any[]>([]);
  const workouts = reactive<{ [courseId: number]: any[] }>({});
  const exercises = reactive<{ [workoutId: number]: any[] }>({});

  const loadCourses = async (gender: string) => {
    await execute(async () => {
      const response = await axios.get(`/course`, { params: { gender } });
      courses.value = response.data.content;
    });
  };

  const getCourseById = async (gender: string, courseId: number) => {
    return await execute(async () => {
      const response = await axios.get(`/course`, {
        params: { FilteringExpression: `id==${courseId}`, gender },
      });
      return response.data.content[0];
    });
  };

  const modifyCourse = async (data: any) => {
    await execute(async () => {
      const response = await axios.post(`/course`, data);
    });
  };

  const deleteCourse = async (courseId: number) => {
    await execute(async () => {
      const response = await axios.delete(`/course/${courseId}`);
    });
    await loadCourses((route.query.gender as string) ?? "male");
  };

  const loadWorkouts = async (courseId: number) => {
    Object.assign(workouts, { [courseId]: [] });
    await execute(async () => {
      const response = await axios.get(`/workouts?courseId=${courseId}`);

      Object.assign(workouts, { [courseId]: response.data.content });
    });
  };

  const getWorkoutById = async (workoutId: number) => {
    return await execute(async () => {
      const response = await axios.get(`/workouts/${workoutId}`);
      return response.data.content;
    });
  };

  const getWorkoutComputations = async (workoutId: number) => {
    return await execute(async () => {
      const response = await axios.get(
        `/workouts/computations?workoutId=${workoutId}`,
      );

      return response.data.content;
    });
  };

  const modifyWorkout = async (data: any) => {
    return await execute(async () => {
      const response = await axios.post(`/workouts`, data);
      return response.data.content;
    });
  };

  const modifyWorkoutComputations = async (data: any[]) => {
    await execute(async () => {
      const response = await axios.post(`/workouts/computations`, data);
    });
  };

  const loadExercises = async (workoutId: number) => {
    await execute(async () => {
      const response = await axios.get(`/exercises?workoutId=${workoutId}`);

      Object.assign(exercises, { [workoutId]: response.data.content });
    });
  };

  const getExerciseById = async (exerciseId: number) => {
    return await execute(async () => {
      const response = await axios.get(`/exercises/${exerciseId}`);
      return response.data.content;
    });
  };

  const getExerciseComputations = async (exerciseId: number) => {
    return await execute(async () => {
      const response = await axios.get(
        `/exercises/computations?exerciseId=${exerciseId}`,
      );

      return response.data.content;
    });
  };

  const modifyExercise = async (data: any) => {
    await execute(async () => {
      const response = await axios.post(`/exercises`, data);
    });
  };

  return {
    courses,
    workouts,
    exercises,
    loadCourses,
    getCourseById,
    modifyCourse,
    deleteCourse,
    loadWorkouts,
    getWorkoutComputations,
    getWorkoutById,
    modifyWorkout,
    modifyWorkoutComputations,
    loadExercises,
    getExerciseById,
    getExerciseComputations,
    modifyExercise,
  };
});
