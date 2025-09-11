import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const navigation = useNavigation();

  const onReset = () => {
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    // TODO: call API reset password
    Alert.alert("Success", "Password changed successfully", [
      { text: "Go To Home", onPress: () => navigation.navigate("SignInEmail" as never) }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create A New Password</Text>
      <Text style={styles.subtitle}>Enter your new password</Text>

      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      <TouchableOpacity style={styles.button} onPress={onReset}>
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
