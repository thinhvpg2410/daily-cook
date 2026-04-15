import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/env";


export const http = axios.create({
    baseURL: API_BASE_URL,
    headers: {"Content-Type": "application/json"},
});

http.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
            config.headers = config.headers ?? {};
            (config.headers as any).Authorization = `Bearer ${token}`;
        }
        // Log the full URL for debugging
        const fullUrl = config.baseURL && config.url 
            ? `${config.baseURL}${config.url.startsWith('/') ? '' : '/'}${config.url}`
            : config.url;
        console.log('API Request:', {
            method: config.method?.toUpperCase(),
            url: fullUrl,
            baseURL: config.baseURL,
            path: config.url
        });
    } catch {

    }
    return config;
});


http.interceptors.response.use(
    (res) => res,
    (err) => {
        // Log error details for debugging
        if (err.response) {
            console.error('API Error:', {
                status: err.response.status,
                statusText: err.response.statusText,
                data: err.response.data,
                url: err.config?.url,
            });
        } else if (err.request) {
            console.error('Network Error:', err.message);
        } else {
            console.error('Error:', err.message);
        }
        return Promise.reject(err);
    }
);
