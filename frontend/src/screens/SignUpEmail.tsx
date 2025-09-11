import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

export default function SignUpEmail({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const onSignUp = async () => {
    if (password !== confirm) return Alert.alert("Error", "Passwords do not match");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      Alert.alert("Sign Up Successful!");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Mobile Number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Date of Birth" value={dob} onChangeText={setDob} />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry />

      <Text style={styles.policy}>
        By continuing, you agree to Terms of Use and Privacy Policy.
      </Text>

      <TouchableOpacity style={styles.button} onPress={onSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("SignInEmail")}>
        <Text style={styles.bottomText}>
          Already have an account? <Text style={styles.link}>Log In</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 16, textAlign: "center", color: "#e53935" },
  input: { borderWidth: 1, borderColor: "#f5a5a5", borderRadius: 25, padding: 12, marginBottom: 12 },
  button: { backgroundColor: "#e53935", padding: 14, borderRadius: 25, marginTop: 10 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  policy: { fontSize: 12, textAlign: "center", color: "#777", marginBottom: 12 },
  link: { color: "#e53935" },
  bottomText: { marginTop: 16, textAlign: "center", color: "#555" },
});
