import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_BACKEND_URL });

export async function exchangeFirebaseTokenForAppJWT() {
    const user = auth.currentUser;
    if (!user) throw new Error('No firebase user');
    const idToken = await user.getIdToken(true);
    const res = await api.post('/auth/login', {}, {
        headers: { Authorization: `Bearer ${idToken}` }
    });
    // res.data = { accessToken, user }
    return res.data;
}
