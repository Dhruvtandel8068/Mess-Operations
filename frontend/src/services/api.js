import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getData = async (url) => {
  const res = await API.get(url);
  return res.data;
};

export const postData = async (url, data, isFormData = false) => {
  const res = await API.post(url, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return res.data;
};

export const putData = async (url, data) => {
  const res = await API.put(url, data);
  return res.data;
};

export const deleteData = async (url) => {
  const res = await API.delete(url);
  return res.data;
};

export default API;