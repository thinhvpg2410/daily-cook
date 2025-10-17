import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function ForgotPasswordCode() {
  const [code, setCode] = useState("");
  const navigation = useNavigation();

  const onVerify = () => {
    // TODO: call API verify code
    navigation.navigate("ResetPassword" as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Your Password</Text>
      <Text style={styles.subtitle}>We will send you the verification code to your email. Enter it below:</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter code"
        keyboardType="numeric"
        value={code}
        onChangeText={setCode}
      />

      <Text style={styles.timer}>Didn’t receive the mail? Resend in 49 sec</Text>

      <TouchableOpacity style={styles.button} onPress={onVerify}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "600", color: "#e53935", marginBottom: 12, textAlign: "center" },
  subtitle: { color: "#555", fontSize: 14, marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#f5a5a5", borderRadius: 25, padding: 12, marginBottom: 16, textAlign: "center", fontSize: 18, letterSpacing: 8 },
  timer: { textAlign: "center", color: "#888", marginBottom: 16 },
  button: { backgroundColor: "#e53935", padding: 14, borderRadius: 25 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
