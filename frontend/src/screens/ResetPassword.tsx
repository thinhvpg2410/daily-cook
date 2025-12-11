import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { resetPasswordApi } from "../api/auth";

type PasswordStrength = "weak" | "medium" | "strong" | "";

const getPasswordStrength = (password: string): PasswordStrength => {
  if (password.length === 0) return "";
  if (password.length < 6) return "weak";
  
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const criteriaCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (criteriaCount <= 1 || password.length < 8) return "weak";
  if (criteriaCount === 2 || password.length < 10) return "medium";
  return "strong";
};

const getStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case "weak":
      return "#e53935";
    case "medium":
      return "#ff9800";
    case "strong":
      return "#4caf50";
    default:
      return "#e0e0e0";
  }
};

const getStrengthText = (strength: PasswordStrength): string => {
  switch (strength) {
    case "weak":
      return "Yếu";
    case "medium":
      return "Trung bình";
    case "strong":
      return "Mạnh";
    default:
      return "";
  }
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const navigation = useNavigation();
  const route = useRoute();
  const { email, code } = (route.params as any) || {};

  const passwordStrength = getPasswordStrength(password);

  const validatePassword = (): boolean => {
    const newErrors: { password?: string; confirm?: string } = {};
    
    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }
    
    if (!confirm) {
      newErrors.confirm = "Vui lòng xác nhận mật khẩu";
    } else if (password !== confirm) {
      newErrors.confirm = "Mật khẩu xác nhận không khớp";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onReset = async () => {
    if (!validatePassword()) {
      return;
    }

    if (!email || !code) {
      Alert.alert("Lỗi", "Thiếu thông tin xác thực");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi(email, code, password);
      navigation.navigate("ResetPasswordSuccess" as never, { email } as never);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock-reset" size={64} color="#e53935" />
          </View>

          <Text style={styles.title}>Tạo mật khẩu mới</Text>
          <Text style={styles.subtitle}>Nhập mật khẩu mới của bạn để hoàn tất đặt lại mật khẩu</Text>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Mật khẩu mới"
              placeholderTextColor="#999"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors({ ...errors, password: undefined });
                }
              }}
              onBlur={validatePassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthBarFill,
                    {
                      width: `${passwordStrength === "weak" ? 33 : passwordStrength === "medium" ? 66 : 100}%`,
                      backgroundColor: getStrengthColor(passwordStrength),
                    },
                  ]}
                />
              </View>
              {passwordStrength && (
                <Text style={[styles.strengthText, { color: getStrengthColor(passwordStrength) }]}>
                  Độ mạnh: {getStrengthText(passwordStrength)}
                </Text>
              )}
            </View>
          )}

          {errors.password && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#e53935" />
              <Text style={styles.errorText}>{errors.password}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-check-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.confirm && styles.inputError]}
              placeholder="Xác nhận mật khẩu"
              placeholderTextColor="#999"
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                if (errors.confirm) {
                  setErrors({ ...errors, confirm: undefined });
                }
              }}
              onBlur={validatePassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {errors.confirm && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#e53935" />
              <Text style={styles.errorText}>{errors.confirm}</Text>
            </View>
          )}

          {password && confirm && password === confirm && password.length >= 6 && (
            <View style={styles.matchContainer}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#4caf50" />
              <Text style={styles.matchText}>Mật khẩu khớp</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (loading || !password || !confirm) && styles.buttonDisabled]}
            onPress={onReset}
            disabled={loading || !password || !confirm}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Đặt lại mật khẩu</Text>
                <MaterialCommunityIcons name="check" size={20} color="#fff" style={styles.buttonIcon} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Yêu cầu mật khẩu:</Text>
            <View style={styles.requirementItem}>
              <MaterialCommunityIcons
                name={password.length >= 6 ? "check-circle" : "circle-outline"}
                size={16}
                color={password.length >= 6 ? "#4caf50" : "#999"}
              />
              <Text style={[styles.requirementText, password.length >= 6 && styles.requirementMet]}>
                Ít nhất 6 ký tự
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialCommunityIcons
                name={/[A-Z]/.test(password) ? "check-circle" : "circle-outline"}
                size={16}
                color={/[A-Z]/.test(password) ? "#4caf50" : "#999"}
              />
              <Text style={[styles.requirementText, /[A-Z]/.test(password) && styles.requirementMet]}>
                Có chữ hoa
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialCommunityIcons
                name={/[0-9]/.test(password) ? "check-circle" : "circle-outline"}
                size={16}
                color={/[0-9]/.test(password) ? "#4caf50" : "#999"}
              />
              <Text style={[styles.requirementText, /[0-9]/.test(password) && styles.requirementMet]}>
                Có số
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    marginTop: Platform.OS === "ios" ? 50 : 20,
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    color: "#666",
    fontSize: 14,
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#fafafa",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "#e53935",
    backgroundColor: "#fff5f5",
  },
  eyeButton: {
    padding: 4,
  },
  strengthContainer: {
    marginBottom: 16,
  },
  strengthBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  strengthBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "500",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  errorText: {
    color: "#e53935",
    fontSize: 13,
    marginLeft: 6,
  },
  matchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  matchText: {
    color: "#4caf50",
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#e53935",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  requirementsContainer: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
  },
  requirementMet: {
    color: "#4caf50",
    fontWeight: "500",
  },
});
