import axios from "axios";

const baseURL = import.meta.env.PROD
  ? "https://calora.uz/api"
  : "https://staging.calora.uz/api";

const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

const makeFileUrl: (relative: string) => string = (relative) => {
  return new URL(relative, baseURL + "/file/").toString();
};

// const axios = axiosInstance;

export { axiosInstance as axios, baseURL as API_BASE_URL, makeFileUrl };
