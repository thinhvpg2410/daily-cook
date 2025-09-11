import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function ForgotPasswordEmail() {
  const [email, setEmail] = useState("");
  const navigation = useNavigation();

  const onContinue = () => {
    // TODO: call API gửi OTP về email
    navigation.navigate("ForgotPasswordCode" as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Your Password</Text>
      <Text style={styles.subtitle}>Hello There! Enter your email address. We will send a code verification in the next step.</Text>
      
      <TextInput
        style={styles.input}
        placeholder="example@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={onContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "600", color: "#e53935", marginBottom: 12, textAlign: "center" },
  subtitle: { color: "#555", fontSize: 14, marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#f5a5a5", borderRadius: 25, padding: 12, marginBottom: 16 },
  button: { backgroundColor: "#e53935", padding: 14, borderRadius: 25 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
