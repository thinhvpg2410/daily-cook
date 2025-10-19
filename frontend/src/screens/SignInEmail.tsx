import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export default function SignInEmail() {
  const { login } = useAuth();
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twofaCode, setTwofaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [need2FA, setNeed2FA] = useState(false);
  const [tmpToken, setTmpToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; twofaCode?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = "Invalid email format.";

    if (!password.trim()) newErrors.password = "Password is required.";
    if (need2FA && !twofaCode.trim()) newErrors.twofaCode = "2FA code is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onLogin = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await login(email.trim(), password, need2FA ? twofaCode : undefined);

      if (res && "requires2FA" in res) {
        setNeed2FA(true);
        setTmpToken(res.tmpToken);
        Alert.alert("Two-Factor Authentication", "Please enter your 2FA code to continue.");
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e: any) {
      Alert.alert("Login failed", e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleLogin = () => {
    Alert.alert("Notice", "Google Sign-In feature is coming soon!");
  };

  return (
    <View style={styles.container}>
      {/* Logo + App name */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={48} color="#e53935" />
        </View>
        <Text style={styles.appName}>DailyCook</Text>
      </View>

      <Text style={styles.title}>Sign In</Text>

      <TextInput
        style={[styles.input, errors.email && styles.inputError]}
        placeholder="example@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <TextInput
        style={[styles.input, errors.password && styles.inputError]}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      {need2FA && (
        <>
          <TextInput
            style={[styles.input, errors.twofaCode && styles.inputError]}
            placeholder="2FA Code"
            value={twofaCode}
            onChangeText={setTwofaCode}
            keyboardType="number-pad"
          />
          {errors.twofaCode && <Text style={styles.errorText}>{errors.twofaCode}</Text>}
        </>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("ForgotPasswordEmail")}>
        <Text style={styles.link}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Google login (UI only for now) */}
      <TouchableOpacity style={styles.googleButton} onPress={onGoogleLogin}>
        <Image
          source={require("../../assets/google-favicon-2025.jpg")}
          style={styles.googleIcon}
          resizeMode="contain"
        />
        <Text style={styles.googleText}>Sign in with Google</Text>
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
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: -20,
  },
  logoCircle: {
    backgroundColor: "#ffeaea",
    borderRadius: 60,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e53935",
    marginTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    color: "#444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#f5a5a5",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  inputError: { borderColor: "#e53935" },
  errorText: {
    color: "#e53935",
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 8,
  },
  button: {
    backgroundColor: "#e53935",
    padding: 14,
    borderRadius: 25,
    marginTop: 10,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  link: { color: "#e53935", textAlign: "center", marginVertical: 6 },
  bottomText: { marginTop: 16, textAlign: "center", color: "#555" },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 25,
    padding: 12,
    marginTop: 20,
  },
  googleIcon: { width: 20, height: 20, marginRight: 8 },
  googleText: { fontWeight: "500", color: "#333" },
});
