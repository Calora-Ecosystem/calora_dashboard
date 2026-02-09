import { defineStore } from "pinia";
import { reactive, ref, watch } from "vue";
import { useApiCallStore } from "./apiCallStore";
import { axios } from "../integrations/axios";
import { useRoute } from "vue-router";

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

  const loadWorkouts = async (courseId: number) => {
    Object.assign(workouts, { [courseId]: [] });
    await execute(async () => {
      const response = await axios.get(`/workouts?courseId=${courseId}`);

      Object.assign(workouts, { [courseId]: response.data.content });
    });
  };

  const getWorkoutById = async (workoutId: number) => {
    return await execute(async () => {
      const response = await axios.get(`/workouts`, {
        params: { FilteringExpression: `id==${workoutId}` },
      });
      return response.data.content[0];
    });
  };

  const modifyWorkout = async (data: any) => {
    await execute(async () => {
      const response = await axios.post(`/workouts`, data);
    });
  };

  const loadExercises = async (workoutId: number) => {
    await execute(async () => {
      const response = await axios.get(`/exercises?workoutId=${workoutId}`);

      Object.assign(exercises, { [workoutId]: response.data.content });
    });
  };

  const getExerciseById = async (workoutId: number, exerciseId: number) => {
    return await execute(async () => {
      const response = await axios.get(`/exercises`, {
        params: { FilteringExpression: `id==${exerciseId}`, workoutId },
      });
      return response.data.content[0];
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
    loadWorkouts,
    getWorkoutById,
    modifyWorkout,
    loadExercises,
    getExerciseById,
    modifyExercise,
  };
});
