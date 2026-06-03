import { defineStore } from "pinia";
import { reactive, ref, watch } from "vue";
import { useApiCallStore } from "./apiCallStore";
import { axios } from "../integrations/axios";
import { useRoute } from "vue-router";
import { de } from "element-plus/es/locale/index.mjs";
import type { ApiBaseResponse } from "../@types/common";

export const useCourseStore = defineStore("course", () => {
  const { execute } = useApiCallStore();
  const route = useRoute();

  const courses = ref<{ id: number } | any[]>([]);
  const workouts = reactive<{ [courseId: number]: any[] }>({});
  const exercises = reactive<{ [workoutId: number]: any[] }>({});

  const loadCourses = async (gender: string) => {
    return await execute(async () => {
      const response = await axios.get(`/course`, {
        params: { gender, SortDirection: "ascending", SortPropName: "id" },
      });
      return response.data.content;
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

  const loadWorkoutsPaged = async (
    courseId: number,
    skip: number,
    take: number,
  ): Promise<ApiBaseResponse> => {
    return await execute(async () => {
      const response = await axios.get(`/workouts`, {
        params: { courseId, Skip: skip, Take: take },
      });
      return response.data;
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

  const deleteWorkoutById = async (workoutId: number) => {
    await execute(async () => {
      await axios.delete(`/workouts/${workoutId}`);
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
    return await execute(async () => {
      const response = await axios.post(`/exercises`, data);
      return response.data.content;
    });
  };

  const deleteExerciseById = async (exerciseId: number) => {
    await execute(async () => {
      const response = await axios.delete(`/exercises/${exerciseId}`);
    });
  };

  const getLessonsByCourseId = async (courseId: number) => {
    return await execute(async () => {
      const response = await axios.get(`/lessons?courseId=${courseId}`, {
        params: { SortPropName: "id" },
      });
      return response.data.content;
    });
  };

  const getLessonById = async (lessonId: number) => {
    return await execute(async () => {
      const response = await axios.get(`/lessons`, {
        params: { FilteringExpression: `id==${lessonId}` },
      });
      return response.data.content?.[0];
    });
  };

  const modifyLesson = async (data: any) => {
    await execute(async () => {
      const response = await axios.post(`/lessons`, data);
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
    loadWorkoutsPaged,
    getWorkoutComputations,
    getWorkoutById,
    modifyWorkout,
    modifyWorkoutComputations,
    deleteWorkoutById,
    loadExercises,
    getExerciseById,
    getExerciseComputations,
    modifyExercise,
    deleteExerciseById,
    getLessonsByCourseId,
    getLessonById,
    modifyLesson,
  };
});
