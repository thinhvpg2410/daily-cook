// Use environment variable if set, otherwise use Railway URL
// To use localhost in dev, set EXPO_PUBLIC_BACKEND_URL=http://localhost:3000 in .env file
export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL 
    || "api.dailycook.io.vn";