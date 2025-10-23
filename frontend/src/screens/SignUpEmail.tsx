import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export default function SignUpEmail({ navigation }: any) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatDob = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDob(formatted);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email))
      newErrors.email = "Invalid email format.";
    if (!phone.trim()) newErrors.phone = "Phone number is required.";
    else if (!/^\d{9,12}$/.test(phone))
      newErrors.phone = "Phone must be 9–12 digits.";
    if (!dob.trim()) newErrors.dob = "Date of birth is required.";
    else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob))
      newErrors.dob = "Use format DD/MM/YYYY (e.g., 22/05/1998).";
    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 6)
      newErrors.password = "Password must be at least 6 characters.";
    if (password !== confirm)
      newErrors.confirm = "Passwords do not match.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSignUp = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await register(fullName.trim(), email.trim(), password, phone.trim());
      Alert.alert("Success", "Account created. Please log in.");
      navigation.replace("SignInEmail");
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message || "Unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />
      {errors.fullName && <Text style={styles.error}>{errors.fullName}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      {errors.email && <Text style={styles.error}>{errors.email}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Mobile Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Date of Birth (DD/MM/YYYY)"
        value={dob}
        onChangeText={formatDob}
        maxLength={10}
        keyboardType="number-pad"
      />
      {errors.dob && <Text style={styles.error}>{errors.dob}</Text>}

      {/* Password Input */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-outline" : "eye-off-outline"}
            size={22}
            color="#f77"
          />
        </TouchableOpacity>
      </View>
      <View style={{ borderBottomWidth: 1, borderColor: "#f5a5a5", marginBottom: 8 }} />
      {errors.password && <Text style={styles.error}>{errors.password}</Text>}

      {/* Confirm Password Input */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
          placeholder="Confirm Password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showConfirm}
        />
        <TouchableOpacity
          onPress={() => setShowConfirm(!showConfirm)}
          style={styles.eyeIcon}
        >
        </TouchableOpacity>
      </View>
      <View style={{ borderBottomWidth: 1, borderColor: "#f5a5a5", marginBottom: 8 }} />
      {errors.confirm && <Text style={styles.error}>{errors.confirm}</Text>}

      <Text style={styles.policy}>
        By continuing, you agree to Terms of Use and Privacy Policy.
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={onSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
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
  input: {
    borderWidth: 1,
    borderColor: "#f5a5a5",
    borderRadius: 25,
    padding: 12,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f5a5a5",
    borderRadius: 25,
    paddingRight: 12,
    paddingLeft: 4,
    marginBottom: 6,
  },
  eyeIcon: { padding: 8 },
  error: { color: "#e53935", fontSize: 12, marginBottom: 8, marginLeft: 8 },
  button: { backgroundColor: "#e53935", padding: 14, borderRadius: 25, marginTop: 10 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  policy: { fontSize: 12, textAlign: "center", color: "#777", marginBottom: 12, marginTop: 6 },
  link: { color: "#e53935" },
  bottomText: { marginTop: 16, textAlign: "center", color: "#555" },
});
