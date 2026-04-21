import {
  ACTIVITIES,
  ASSET_TYPES,
  COMPUTATION_TYPE,
  COURSE_TYPES,
  ENTITY_TYPES,
  GENDERS,
  METRICS,
} from "../constants/ApiContstants";

export type Gender = (typeof GENDERS)[number];
export type Mlf = {
  uz: string;
  ru: string;
  eng: string;
  cyrl?: string;
};

export type Asset = {
  type: (typeof ASSET_TYPES)[number];
  url: string;
};

export type CourseType = (typeof COURSE_TYPES)[number];

export type TMetrics = (typeof METRICS)[number];

export type EntityType = (typeof ENTITY_TYPES)[number];
export type ActivityType = (typeof ACTIVITIES)[number];
export type ComputationType = (typeof COMPUTATION_TYPE)[number];

export type ApiBaseResponse<T = any> = {
  id: string;
  code: number;
  error?: string;
  total: number;
  content: T;
  query?: string;
  modelStateError?: {
    key: string;
    errorMessage: string;
  }[];
};
