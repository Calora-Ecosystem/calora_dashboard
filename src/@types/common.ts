import {
  ASSET_TYPES,
  COURSE_TYPES,
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
