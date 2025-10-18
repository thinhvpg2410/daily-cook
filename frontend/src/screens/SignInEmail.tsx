import React, {useState} from "react";
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from "react-native";
import {auth} from "../firebase";
import {signInWithEmailAndPassword} from "firebase/auth";
import {useNavigation} from "@react-navigation/native";
import {useAuth} from "../context/AuthContext";

export default function SignInEmail() {
    const {login} = useAuth()
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [twofaCode, setTwofaCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [need2FA, setNeed2FA] = useState(false);
    const [tmpToken, setTmpToken] = useState<string | null>(null);


    // const onLogin = async () => {
    //   try {
    //     await signInWithEmailAndPassword(auth, email, password);
    //     Alert.alert("Login OK", "Welcome back!");
    //     // Sau khi login thành công có thể navigate sang Home
    //     // navigation.navigate("Home");
    //   } catch (e: any) {
    //     Alert.alert("Error", e.message);
    //   }
    // };

    const onLogin = async () => {
        try {
            setLoading(true);
            const res = await login(email.trim(), password, need2FA ? twofaCode : undefined);

            // Nếu backend yêu cầu 2FA ở bước 1
            if (res && "requires2FA" in res) {
                setNeed2FA(true);
                setTmpToken(res.tmpToken);
                Alert.alert("Two-Factor Authentication", "Please enter your 2FA code to continue.");
                return;
            }

            navigation.reset({index: 0, routes: [{name: "Home"}]});
        } catch (e: any) {
            Alert.alert("Login failed", e.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            <TextInput
                style={styles.input}
                placeholder="example@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            {need2FA && (
                <TextInput style={styles.input} placeholder="2FA code" value={twofaCode} onChangeText={setTwofaCode}
                           keyboardType="number-pad"/>
            )}

            <TouchableOpacity onPress={() => navigation.navigate("ForgotPasswordEmail")}>
                <Text style={styles.link}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={onLogin}>
                <Text style={styles.buttonText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("SignUpEmail")}>
                <Text style={styles.bottomText}>
                    Don’t have an account? <Text style={styles.link}>Sign Up</Text>
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff"},
    title: {fontSize: 22, fontWeight: "600", marginBottom: 16, textAlign: "center", color: "#e53935"},
    input: {
        borderWidth: 1,
        borderColor: "#f5a5a5",
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
    },
    button: {backgroundColor: "#e53935", padding: 14, borderRadius: 25, marginTop: 10},
    buttonText: {color: "#fff", textAlign: "center", fontWeight: "600"},
    link: {color: "#e53935"},
    bottomText: {marginTop: 16, textAlign: "center", color: "#555"},
});
