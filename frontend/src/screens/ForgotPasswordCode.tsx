import React, { useState, useEffect, useRef } from "react";
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
import { verifyResetCodeApi, forgotPasswordApi } from "../api/auth";

const OTP_RESEND_COOLDOWN = 60; // seconds

export default function ForgotPasswordCode() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(OTP_RESEND_COOLDOWN);
  const [error, setError] = useState("");
  const navigation = useNavigation();
  const route = useRoute();
  const email = (route.params as any)?.email || "";
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus input when screen loads
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Countdown timer
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCodeChange = (text: string) => {
    // Only allow numbers and limit to 6 digits
    const numericText = text.replace(/[^0-9]/g, "").slice(0, 6);
    setCode(numericText);
    setError("");

    // Auto-submit when 6 digits are entered
    if (numericText.length === 6) {
      handleVerify(numericText);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const codeValue = codeToVerify || code;
    if (!codeValue || codeValue.length !== 6) {
      setError("Vui lòng nhập đầy đủ 6 chữ số");
      return;
    }

    if (!email) {
      Alert.alert("Lỗi", "Thiếu thông tin email");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await verifyResetCodeApi(email, codeValue);
      navigation.navigate("ResetPassword" as never, { email, code: codeValue } as never);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || "Mã OTP không đúng. Vui lòng nhập lại.";
      setError(errorMessage);
      // Clear code on error and allow user to retry
      setCode("");
      // Focus input after a short delay to ensure it's ready
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resendLoading) return;

    setResendLoading(true);
    setError("");
    try {
      const res = await forgotPasswordApi(email);
      setTimer(OTP_RESEND_COOLDOWN);
      if (res.devCode) {
        Alert.alert("Mã OTP mới (Development)", `Mã OTP: ${res.devCode}`);
      } else {
        Alert.alert("Thành công", "Mã OTP mới đã được gửi đến email của bạn");
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || "Không thể gửi lại mã. Vui lòng thử lại.";
      setError(errorMessage);
    } finally {
      setResendLoading(false);
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
            <MaterialCommunityIcons name="email-check-outline" size={64} color="#e53935" />
          </View>

          <Text style={styles.title}>Nhập mã xác thực</Text>
          <Text style={styles.subtitle}>
            Chúng tôi đã gửi mã xác thực 6 chữ số đến email{"\n"}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <View style={styles.otpContainer}>
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="numeric"
              maxLength={6}
              autoFocus
              selectTextOnFocus
              editable={!loading}
            />
            <View style={styles.otpBoxes}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    code.length === index && styles.otpBoxActive,
                    code.length > index && styles.otpBoxFilled,
                    error && styles.otpBoxError,
                  ]}
                >
                  <Text style={[styles.otpBoxText, error && styles.otpBoxTextError]}>
                    {code[index] || ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#e53935" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
            onPress={() => handleVerify()}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Xác nhận</Text>
                <MaterialCommunityIcons name="check" size={20} color="#fff" style={styles.buttonIcon} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Không nhận được mã?</Text>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                Gửi lại sau <Text style={styles.timerValue}>{formatTime(timer)}</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={resendLoading}
                style={styles.resendButton}
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color="#e53935" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="refresh" size={16} color="#e53935" />
                    <Text style={styles.resendButtonText}>Gửi lại mã</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.changeEmailButton}
            onPress={() => navigation.navigate("ForgotPasswordEmail" as never)}
          >
            <Text style={styles.changeEmailText}>
              <MaterialCommunityIcons name="email-edit-outline" size={14} color="#666" /> Thay đổi email
            </Text>
          </TouchableOpacity>
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
  emailText: {
    fontWeight: "600",
    color: "#333",
  },
  otpContainer: {
    marginBottom: 16,
    position: "relative",
  },
  hiddenInput: {
    position: "absolute",
    width: "100%",
    height: 60,
    opacity: 0,
    zIndex: 1,
  },
  otpBoxes: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    height: 64,
  },
  otpBox: {
    width: 56,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    backgroundColor: "#fafafa",
    justifyContent: "center",
    alignItems: "center",
  },
  otpBoxActive: {
    borderColor: "#e53935",
    borderWidth: 2,
    backgroundColor: "#fff",
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  otpBoxFilled: {
    borderColor: "#e53935",
    backgroundColor: "#fff5f5",
  },
  otpBoxError: {
    borderColor: "#e53935",
    backgroundColor: "#fff5f5",
    borderWidth: 2,
  },
  otpBoxText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  otpBoxTextError: {
    color: "#e53935",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffebee",
  },
  errorText: {
    color: "#e53935",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#e53935",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
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
  resendContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  resendText: {
    color: "#666",
    fontSize: 14,
    marginBottom: 8,
  },
  timerText: {
    color: "#999",
    fontSize: 13,
  },
  timerValue: {
    fontWeight: "600",
    color: "#e53935",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    color: "#e53935",
    fontSize: 14,
    fontWeight: "600",
  },
  changeEmailButton: {
    marginTop: 24,
    alignItems: "center",
  },
  changeEmailText: {
    color: "#666",
    fontSize: 13,
  },
});
