import React, {useState} from 'react';
import {View, TextInput, Button, Alert} from 'react-native';
import {auth} from '../firebase';
import {createUserWithEmailAndPassword, updateProfile} from 'firebase/auth';
import {exchangeFirebaseTokenForAppJWT} from '../api';

export default function SignUpEmail() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const onSignUp = async () => {
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            if (displayName) await updateProfile(cred.user, {displayName});
            const {accessToken} = await exchangeFirebaseTokenForAppJWT();
            Alert.alert('Signup OK', accessToken.slice(0, 24) + '...');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    return (
        <View style={{padding: 16}}>
            <TextInput placeholder="Tên hiển thị" value={displayName} onChangeText={setDisplayName}/>
            <TextInput placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail}/>
            <TextInput placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword}/>
            <Button title="Đăng ký" onPress={onSignUp}/>
        </View>
    );
}
