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

  const [username, setUsername] = useState(""); // Email hoặc số điện thoại
  const [password, setPassword] = useState("");
  const [twofaCode, setTwofaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [need2FA, setNeed2FA] = useState(false);
  const [tmpToken, setTmpToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ 
    username?: string; 
    password?: string; 
    twofaCode?: string;
    general?: string;
  }>({});

  // Xác định keyboard type dựa trên input (tùy chọn - có thể để default)
  // Để đơn giản, dùng default để user có thể nhập cả email và phone

  // Kiểm tra xem username là email hay phone
  const isEmail = (text: string): boolean => {
    return text.includes("@");
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const validatePhone = (phone: string): boolean => {
    // Loại bỏ các ký tự không phải số và dấu +
    const cleaned = phone.replace(/[^\d\+]/g, "");
    // Phone phải có ít nhất 8 chữ số (sau khi loại bỏ các ký tự đặc biệt)
    const digitsOnly = cleaned.replace(/\+/g, "");
    return digitsOnly.length >= 8 && digitsOnly.length <= 15;
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      newErrors.username = "Vui lòng nhập email hoặc số điện thoại.";
    } else if (isEmail(trimmedUsername)) {
      // Validate email
      if (!validateEmail(trimmedUsername)) {
        newErrors.username = "Email không hợp lệ.";
      }
    } else {
      // Validate phone
      if (!validatePhone(trimmedUsername)) {
        newErrors.username = "Số điện thoại không hợp lệ.";
      }
    }

    if (!password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    }
    
    if (need2FA && !twofaCode.trim()) {
      newErrors.twofaCode = "Vui lòng nhập mã 2FA.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Clear errors when user types
  const clearError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Parse error message from API response
  const getErrorMessage = (error: any): string => {
    // Try to get message from response data
    if (error?.response?.data) {
      const data = error.response.data;
      // Check if message exists and is a string
      if (typeof data.message === "string") {
        return data.message;
      }
      // Check if error exists and is a string
      if (typeof data.error === "string") {
        return data.error;
      }
      // If data is already a string
      if (typeof data === "string") {
        return data;
      }
    }
    // Check error message
    if (typeof error?.message === "string") {
      return error.message;
    }
    // Fallback
    return "Đã xảy ra lỗi. Vui lòng thử lại.";
  };

  const onLogin = async () => {
    // Clear previous errors
    setErrors({});
    
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await login(username.trim(), password, need2FA ? twofaCode : undefined);

      if (res && "requires2FA" in res) {
        setNeed2FA(true);
        setTmpToken(res.tmpToken);
        setErrors({});
        // Don't show alert, just show the 2FA input field
        return;
      }

      // Login successful
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e: any) {
      const errorMessage = getErrorMessage(e);
      const statusCode = e?.response?.status;
      
      // Ensure errorMessage is a string
      const errorMsg = String(errorMessage || "Đã xảy ra lỗi. Vui lòng thử lại.");
      
      // Handle different error cases
      if (statusCode === 401) {
        // Unauthorized - could be wrong credentials or 2FA required
        if (errorMsg.includes("Yêu cầu mã 2FA")) {
          // 2FA is required (first time) - email/password is correct
          setNeed2FA(true);
          setErrors({
            twofaCode: "Vui lòng nhập mã 2FA để tiếp tục.",
          });
        } else if (errorMsg.includes("Sai thông tin đăng nhập")) {
          // Wrong username or password - clear 2FA state if exists
          setNeed2FA(false);
          setTwofaCode("");
          setErrors({
            username: "Email/số điện thoại hoặc mật khẩu không đúng.",
            password: "Email/số điện thoại hoặc mật khẩu không đúng.",
          });
        } else {
          // Other 401 errors
          setErrors({
            general: errorMsg,
          });
        }
      } else if (statusCode === 400) {
        // Bad request - validation error or wrong 2FA code
        if (errorMsg.includes("Mã 2FA không đúng")) {
          // Wrong 2FA code - keep 2FA input visible
          setNeed2FA(true);
          setErrors({
            twofaCode: "Mã 2FA không đúng. Vui lòng thử lại.",
          });
        } else if (errorMsg.toLowerCase().includes("email") || errorMsg.toLowerCase().includes("số điện thoại") || errorMsg.toLowerCase().includes("phone")) {
          // Username (email/phone) validation error
          setErrors({
            username: errorMsg,
          });
        } else if (errorMsg.toLowerCase().includes("password") || errorMsg.toLowerCase().includes("mật khẩu")) {
          // Password validation error
          setErrors({
            password: errorMsg,
          });
        } else {
          // Other validation errors
          setErrors({
            general: errorMsg,
          });
        }
      } else if (statusCode === 404) {
        // Not found
        setErrors({
          general: "Tài khoản không tồn tại.",
        });
      } else if (statusCode >= 500) {
        // Server error
        setErrors({
          general: "Lỗi máy chủ. Vui lòng thử lại sau.",
        });
      } else if (!statusCode) {
        // Network error or no response
        setErrors({
          general: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
        });
      } else {
        // Other errors
        setErrors({
          general: errorMsg,
        });
      }
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

      <Text style={styles.title}>Đăng nhập</Text>

      <TextInput
        style={[styles.input, errors.username && styles.inputError]}
        placeholder="Email hoặc số điện thoại"
        placeholderTextColor="#999"
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          clearError("username");
          clearError("general");
        }}
        autoCapitalize="none"
        keyboardType="default"
        autoComplete="username"
      />
      {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

      <TextInput
        style={[styles.input, errors.password && styles.inputError]}
        placeholder="Mật khẩu"
        placeholderTextColor="#999"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          clearError("password");
          clearError("general");
        }}
        secureTextEntry
        autoComplete="password"
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      {need2FA && (
        <>
          <TextInput
            style={[styles.input, errors.twofaCode && styles.inputError]}
            placeholder="Mã 2FA (6 chữ số)"
            placeholderTextColor="#999"
            value={twofaCode}
            onChangeText={(text) => {
              setTwofaCode(text);
              clearError("twofaCode");
              clearError("general");
            }}
            keyboardType="number-pad"
            maxLength={6}
          />
          {errors.twofaCode && <Text style={styles.errorText}>{errors.twofaCode}</Text>}
        </>
      )}

      {errors.general && (
        <View style={styles.generalErrorContainer}>
          <Text style={styles.generalErrorText}>{errors.general}</Text>
        </View>
      )}

      <TouchableOpacity 
        onPress={() => {
          setErrors({});
          navigation.navigate("ForgotPasswordEmail");
        }}
      >
        <Text style={styles.link}>Quên mật khẩu?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Đăng nhập</Text>
        )}
      </TouchableOpacity>

      {/* Google login (UI only for now) */}
      <TouchableOpacity style={styles.googleButton} onPress={onGoogleLogin}>
        <Image
          source={require("../../assets/google-favicon-2025.jpg")}
          style={styles.googleIcon}
          resizeMode="contain"
        />
        <Text style={styles.googleText}>Đăng nhập bằng Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("SignUpEmail")}>
        <Text style={styles.bottomText}>
          Chưa có tài khoản? <Text style={styles.link}>Đăng ký</Text>
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
    marginTop: -4,
  },
  generalErrorContainer: {
    backgroundColor: "#ffeaea",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#e53935",
  },
  generalErrorText: {
    color: "#e53935",
    fontSize: 14,
    fontWeight: "500",
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
