import React, {createContext, useContext, useEffect, useMemo, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {loginApi, registerApi, meApi} from "../api/auth";


type User = { id: string; email: string; name?: string; phone?: string };

type AuthCtx = {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string, twofaCode?: string) => Promise<void | {
        requires2FA: true;
        tmpToken: string
    }>;
    register: (name: string, email: string, password: string, phone: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem("token");
                if (!stored) {
                    setLoading(false);
                    return;
                }
                setToken(stored); //
                try {
                    const me = await meApi();
                    setUser(me);
                } catch (err: any) {
                    //  clear token  chắc chắn là 401 (unauthorized)
                    const status = err?.response?.status;
                    if (status === 401) {
                        await AsyncStorage.removeItem("token");
                        setToken(null);
                        setUser(null);
                    } else {

                        console.warn("meApi failed but keep token (no 401):", status ?? err?.message);
                    }
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login: AuthCtx["login"] = async (email, password, twofaCode) => {
        const res = await loginApi(email, password, twofaCode);
        if ("requires2FA" in res) {
            return res; // UI sẽ hiển thị form nhập mã & gọi lại login với twofaCode
        }
        await AsyncStorage.setItem("token", res.accessToken);
        setToken(res.accessToken);
        setUser({id: res.user.id, email: res.user.email, name: res.user.name, phone: (res.user as any)?.phone});
    };

    const register: AuthCtx["register"] = async (name, email, password, phone) => {
        const res = await registerApi(name, email, password, phone);
        if (res?.accessToken && res?.user) {
            await AsyncStorage.setItem("token", res.accessToken);
            setToken(res.accessToken);
            setUser({id: res.user.id, email: res.user.email, name: res.user.name, phone: (res.user as any)?.phone});
        } else {

        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    const refreshMe = async () => {
        // gọi /users/me; chỉ xoá token nếu 401
        try {
            const me = await meApi();
            setUser(me);
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401) {
                await AsyncStorage.removeItem("token");
                setToken(null);
                setUser(null);
            } else {
                console.warn("refreshMe failed (kept token):", status ?? err?.message);
            }
        }
    };

    const value = useMemo(
        () => ({user, token, loading, login, register, logout, refreshMe}),
        [user, token, loading]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
