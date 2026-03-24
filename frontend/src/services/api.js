import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // ONLY logout if token invalid
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    // DO NOT logout on 403
    return Promise.reject(error);
  }
);

export const getData = async (url) => {
  const res = await api.get(url);
  return res.data;
};

export const postData = async (url, data, isFormData = false) => {
  const res = await api.post(url, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return res.data;
};

export const putData = async (url, data) => {
  const res = await api.put(url, data);
  return res.data;
};

export const deleteData = async (url) => {
  const res = await api.delete(url);
  return res.data;
};

export default api;