import React, {createContext, useContext, useEffect, useMemo, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {loginApi, registerApi, meApi} from "../api/auth";

type User = { userId: string; email: string; name?: string; phone?: string };
type AuthCtx = {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string, twofaCode?: string) => Promise<void | {
        requires2FA: true;
        tmpToken: string
    }>;
    register: (name: string, email: string, password: string, phone:string) => Promise<void>;
    logout: () => Promise<void>;
    refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const me = await meApi();
                setUser(me);
            } catch {
                await AsyncStorage.removeItem("token");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = async (email: string, password: string, twofaCode?: string) => {
        const res = await loginApi(email, password, twofaCode);
        if ("requires2FA" in res) {
            return res;
        }
        await AsyncStorage.setItem("token", res.accessToken);
        setUser(res.user);
    };

    const register = async (name: string, email: string, password: string, phone: string) => {
        const res = await registerApi(name, email, password, phone);
        // Nếu backend trả token ngay sau register, có thể lưu luôn; nếu không, cho user login lại.
        if (res?.accessToken && res?.user) {
            await AsyncStorage.setItem("token", res.accessToken);
            setUser(res.user);
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem("token");
        setUser(null);
    };

    const refreshMe = async () => {
        const me = await meApi();
        setUser(me);
    };

    const value = useMemo(() => ({user, loading, login, register, logout, refreshMe}), [user, loading]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
