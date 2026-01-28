import axios from "axios";

const baseURL = "https://staging.calora.uz/api";

const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export { axiosInstance as axios };
