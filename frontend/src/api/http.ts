import AsyncStorage from "@react-native-async-storage/async-storage";
import {API_BASE_URL} from "../config/env";

type Options = { method?: string; headers?: Record<string, string>; body?: any; auth?: boolean };

export async function http(path: string, opts: Options = {}) {
    const headers: Record<string, string> = {"Content-Type": "application/json", ...(opts.headers || {})};

    if (opts.auth) {
        const token = await AsyncStorage.getItem("token");
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: opts.method || "GET",
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
        const message = data?.message || `HTTP ${res.status}`;
        throw new Error(message);
    }
    return data;
}
