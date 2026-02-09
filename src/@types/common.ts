export type Gender = "Male" | "Female";
export type Mlf = {
  uz: string;
  ru: string;
  eng: string;
  cyrl?: string;
};

export type Asset = {
  type: "MainImage" | "SubCoverImage" | "...";
  url: string;
};

export type CourseType = "Lesson" | "Workout";
