import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ResetPasswordSuccess() {
  const navigation = useNavigation();
  const route = useRoute();
  const email = (route.params as any)?.email || "";
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation khi màn hình load
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoToLogin = () => {
    navigation.navigate("SignInEmail" as never);
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="check-circle" size={80} color="#4caf50" />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim }}>
        <Text style={styles.title}>Đặt lại mật khẩu thành công!</Text>
        <Text style={styles.subtitle}>
          Mật khẩu của bạn đã được đặt lại thành công.{"\n"}
          Bây giờ bạn có thể đăng nhập với mật khẩu mới.
        </Text>

        {email && (
          <View style={styles.emailContainer}>
            <MaterialCommunityIcons name="email-outline" size={16} color="#666" />
            <Text style={styles.emailText}>{email}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleGoToLogin}>
          <Text style={styles.buttonText}>Đăng nhập ngay</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={styles.buttonIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("SignInEmail" as never)}
        >
          <Text style={styles.backButtonText}>Quay lại màn hình đăng nhập</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    color: "#666",
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 32,
  },
  emailText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  button: {
    backgroundColor: "#e53935",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  backButton: {
    marginTop: 24,
  },
  backButtonText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
});

