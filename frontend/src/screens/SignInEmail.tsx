import React, {useState} from 'react';
import {View, TextInput, Button, Alert} from 'react-native';
import {signInWithEmailAndPassword} from 'firebase/auth';
import {auth} from '../firebase';
import {exchangeFirebaseTokenForAppJWT} from '../api';

export default function SignInEmail() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onSignIn = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            const {accessToken} = await exchangeFirebaseTokenForAppJWT();
            Alert.alert('Login OK', accessToken.slice(0, 24) + '...');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    return (
        <View style={{padding: 16}}>
            <TextInput placeholder="Email" value={email} onChangeText={setEmail}/>
            <TextInput placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword}/>
            <Button title="Đăng nhập" onPress={onSignIn}/>
        </View>
    );
}
