import {http} from "./http";

export type UserDto = {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    role?: string;
    avatarUrl?: string | null;
};

export type LoginResp =
    | { requires2FA: true; tmpToken: string }
    | { accessToken: string; user: UserDto };

export async function loginApi(
    username: string, // Email hoặc số điện thoại
    password: string,
    twofaCode?: string
): Promise<LoginResp> {
    const res = await http.post("/auth/login", {username, password, twofaCode});
    return res.data;
}


export async function registerApi(
    name: string,
    email: string,
    password: string,
    phone: string
): Promise<{ accessToken?: string; user?: UserDto }> {
    const res = await http.post("/auth/register", {name, email, password, phone});
    return res.data;
}

export async function meApi(): Promise<UserDto> {
    const res = await http.get("/auth/me");

    const u = res.data || {};
    return {
        id: u.id,
        email: u.email,
        name: u.name ?? undefined,
        phone: u.phone ?? undefined,
        role: u.role ?? undefined,
        avatarUrl: u.avatarUrl ?? undefined,
    };
}


export async function googleLoginApi(idToken: string): Promise<{ accessToken: string; user: UserDto }> {
    const res = await http.post("/auth/google", {idToken});
    return res.data;
}

export async function forgotPasswordApi(email: string): Promise<{ message: string; devCode?: string }> {
    const res = await http.post("/auth/forgot-password", {email});
    return res.data;
}

export async function verifyResetCodeApi(email: string, code: string): Promise<{ verified: boolean }> {
    const res = await http.post("/auth/verify-reset-code", {email, code});
    return res.data;
}

export async function resetPasswordApi(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    const res = await http.post("/auth/reset-password", {email, code, newPassword});
    return res.data;
}

