import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";


export const http = axios.create({
    baseURL: "http://localhost:3000",
    headers: {"Content-Type": "application/json"},
});

http.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
            config.headers = config.headers ?? {};
            (config.headers as any).Authorization = `Bearer ${token}`;
        }
    } catch {

    }
    return config;
});


http.interceptors.response.use(
    (res) => res,
    (err) => {
        console.log(err)
        return Promise.reject(err);
    }
);
