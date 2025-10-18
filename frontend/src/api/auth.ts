import {http} from "./http";

export type LoginResponse =
    | { accessToken: string; user: { userId: string; email: string; name?: string } }
    | { requires2FA: true; tmpToken: string };

export async function registerApi(name: string, email: string, password: string) {
    // POST /auth/register { email, password, name }
    return http("/auth/register", {
        method: "POST",
        body: {email, password, name},
    });
}

export async function loginApi(email: string, password: string, twofaCode?: string): Promise<LoginResponse> {
    // POST /auth/login { email, password, twofaCode? }
    return http("/auth/login", {
        method: "POST",
        body: {email, password, twofaCode},
    });
}

export async function meApi() {
    // GET /auth/me  (Bearer)
    return http("/auth/me", {auth: true});
}

export async function init2faApi() {
    // POST /auth/2fa/init  (Bearer) -> trả về/secret
    return http("/auth/2fa/init", {method: "POST", auth: true});
}

export async function enable2faApi(code: string) {
    // POST /auth/2fa/enable { code } (Bearer) -> enable thành công
    return http("/auth/2fa/enable", {method: "POST", auth: true, body: {code}});
}
