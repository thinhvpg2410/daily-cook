import React, {useState} from "react";
import {View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {changePasswordApi} from "../api/users";

interface RequirementItemProps {
    checked: boolean;
    text: string;
}

const RequirementItem = ({ checked, text }: RequirementItemProps) => (
    <View style={s.checklistItem}>
        <View style={[s.checkbox, checked && s.checkboxChecked]}>
            {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={[s.checklistText, checked && s.checklistTextChecked]}>
            {text}
        </Text>
    </View>
);

export default function ChangePasswordScreen({navigation}: any) {
    const [current, setCurrent] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [validationError, setValidationError] = useState("");
    const [currentPasswordError, setCurrentPasswordError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const checkPasswordRequirements = (password: string) => {
        return {
            minLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        };
    };

    const getPasswordProgress = (password: string) => {
        const checks = checkPasswordRequirements(password);
        const total = 4;
        const completed = Object.values(checks).filter(Boolean).length;
        return (completed / total) * 100;
    };

    const validatePassword = (password: string): string | null => {
        const checks = checkPasswordRequirements(password);
        if (!checks.minLength) {
            return "Mật khẩu phải có tối thiểu 8 ký tự";
        }
        if (!checks.hasUpperCase) {
            return "Mật khẩu phải có ít nhất 1 chữ cái viết hoa";
        }
        if (!checks.hasNumber) {
            return "Mật khẩu phải có ít nhất 1 số";
        }
        if (!checks.hasSpecialChar) {
            return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt";
        }
        return null;
    };

    const onChangePassword = async () => {
        if (!current || !newPass || !confirm) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
            return;
        }

        const validationMsg = validatePassword(newPass);
        if (validationMsg) {
            setValidationError(validationMsg);
            Alert.alert("Lỗi", validationMsg);
            return;
        }
        setValidationError("");

        if (newPass !== confirm) {
            Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
            return;
        }

        setLoading(true);
        setCurrentPasswordError("");
        setSuccessMessage("");
        try {
            await changePasswordApi({
                oldPassword: current,
                newPassword: newPass,
            });
            
            // Reset form sau khi thành công
            setCurrent("");
            setNewPass("");
            setConfirm("");
            setValidationError("");
            
            // Hiển thị thông báo thành công
            setSuccessMessage("Mật khẩu đã được đổi thành công!");
            
            Alert.alert(
                "✅ Thành công", 
                "Mật khẩu của bạn đã được thay đổi thành công.\n\nVui lòng sử dụng mật khẩu mới cho lần đăng nhập tiếp theo.", 
                [
                    { 
                        text: "OK", 
                        onPress: () => {
                            setSuccessMessage("");
                            navigation.goBack();
                        }
                    }
                ]
            );
        } catch (error: any) {
            // Xử lý error message - có thể là string, array, hoặc object
            let errorMessage = "Đã xảy ra lỗi. Vui lòng thử lại.";
            
            if (error?.response?.data?.message) {
                const msg = error.response.data.message;
                
                if (typeof msg === "string") {
                    errorMessage = msg;
                } else if (Array.isArray(msg)) {
                    // Validation errors dạng array từ NestJS
                    errorMessage = msg.map((err: any) => {
                        if (typeof err === "string") return err;
                        if (err?.message) return err.message;
                        if (err?.constraints) {
                            return Object.values(err.constraints).join(", ");
                        }
                        return String(err);
                    }).join(", ");
                } else if (typeof msg === "object") {
                    // Validation errors dạng object với constraints
                    if (msg.message && Array.isArray(msg.message)) {
                        errorMessage = msg.message.map((m: any) => {
                            if (typeof m === "string") return m;
                            if (m?.constraints) {
                                return Object.values(m.constraints).join(", ");
                            }
                            return String(m);
                        }).join(", ");
                    } else if (msg.message && typeof msg.message === "string") {
                        errorMessage = msg.message;
                    } else if (msg.constraints) {
                        errorMessage = Object.values(msg.constraints).join(", ");
                    } else {
                        errorMessage = JSON.stringify(msg);
                    }
                } else {
                    errorMessage = String(msg);
                }
            } else if (error?.message) {
                errorMessage = typeof error.message === "string" ? error.message : String(error.message);
            }
            
            // Chuẩn hóa error message thành string
            const errorStr = String(errorMessage).toLowerCase();
            
            // Kiểm tra nếu là lỗi mật khẩu hiện tại sai
            if (errorStr.includes("mật khẩu cũ") || errorStr.includes("không đúng") || errorStr.includes("oldpassword")) {
                setCurrentPasswordError("Mật khẩu hiện tại không đúng");
            }
            
            Alert.alert("Lỗi", String(errorMessage));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
                <Text style={s.title}>Đổi mật khẩu</Text>

                {successMessage && (
                    <View style={s.successContainer}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        <Text style={s.successText}>{successMessage}</Text>
                    </View>
                )}

                <View style={s.formGroup}>
                    <Text style={s.label}>Mật khẩu hiện tại</Text>
                    <View style={s.inputContainer}>
                        <TextInput 
                            style={[s.input, currentPasswordError && s.inputError]} 
                            secureTextEntry={!showCurrent} 
                            value={current} 
                            onChangeText={(text) => {
                                setCurrent(text);
                                // Xóa lỗi và success message khi người dùng bắt đầu nhập lại
                                if (currentPasswordError) {
                                    setCurrentPasswordError("");
                                }
                                if (successMessage) {
                                    setSuccessMessage("");
                                }
                            }}
                        />
                        <TouchableOpacity 
                            style={s.eyeIcon} 
                            onPress={() => setShowCurrent(!showCurrent)}
                        >
                            <Ionicons 
                                name={showCurrent ? "eye-off-outline" : "eye-outline"} 
                                size={22} 
                                color="#666" 
                            />
                        </TouchableOpacity>
                    </View>
                    {currentPasswordError && (
                        <View style={s.errorContainer}>
                            <Ionicons name="alert-circle" size={16} color="#f77" />
                            <Text style={[s.errorText, { marginLeft: 6 }]}>{currentPasswordError}</Text>
                        </View>
                    )}
                </View>

                <View style={s.formGroup}>
                    <Text style={s.label}>Mật khẩu mới</Text>
                    <View style={s.inputContainer}>
                        <TextInput 
                            style={s.input} 
                            secureTextEntry={!showNew} 
                            value={newPass} 
                            onChangeText={(text) => {
                                setNewPass(text);
                                if (text) {
                                    const error = validatePassword(text);
                                    setValidationError(error || "");
                                } else {
                                    setValidationError("");
                                }
                                // Xóa success message khi người dùng bắt đầu nhập lại
                                if (successMessage) {
                                    setSuccessMessage("");
                                }
                            }}
                        />
                        <TouchableOpacity 
                            style={s.eyeIcon} 
                            onPress={() => setShowNew(!showNew)}
                        >
                            <Ionicons 
                                name={showNew ? "eye-off-outline" : "eye-outline"} 
                                size={22} 
                                color="#666" 
                            />
                        </TouchableOpacity>
                    </View>

                    {newPass.length > 0 && (
                        <View style={s.requirementContainer}>
                            <View style={s.progressBarContainer}>
                                <View style={[s.progressBar, { width: `${getPasswordProgress(newPass)}%` }]} />
                            </View>
                            <Text style={s.progressText}>
                                {Math.round(getPasswordProgress(newPass))}% hoàn thành
                            </Text>
                            
                            <View style={s.checklistContainer}>
                                <RequirementItem 
                                    checked={checkPasswordRequirements(newPass).minLength}
                                    text="Tối thiểu 8 ký tự"
                                />
                                <RequirementItem 
                                    checked={checkPasswordRequirements(newPass).hasUpperCase}
                                    text="Có ít nhất 1 chữ cái viết hoa (A-Z)"
                                />
                                <RequirementItem 
                                    checked={checkPasswordRequirements(newPass).hasNumber}
                                    text="Có ít nhất 1 số (0-9)"
                                />
                                <RequirementItem 
                                    checked={checkPasswordRequirements(newPass).hasSpecialChar}
                                    text="Có ít nhất 1 ký tự đặc biệt (!@#$%...)"
                                />
                            </View>
                        </View>
                    )}
                    
                    {validationError && (
                        <Text style={s.errorText}>{validationError}</Text>
                    )}
                </View>

                <View style={s.formGroup}>
                    <Text style={s.label}>Xác nhận mật khẩu mới</Text>
                    <View style={s.inputContainer}>
                        <TextInput 
                            style={s.input} 
                            secureTextEntry={!showConfirm} 
                            value={confirm} 
                            onChangeText={(text) => {
                                setConfirm(text);
                                // Xóa success message khi người dùng bắt đầu nhập lại
                                if (successMessage) {
                                    setSuccessMessage("");
                                }
                            }}
                        />
                        <TouchableOpacity 
                            style={s.eyeIcon} 
                            onPress={() => setShowConfirm(!showConfirm)}
                        >
                            <Ionicons 
                                name={showConfirm ? "eye-off-outline" : "eye-outline"} 
                                size={22} 
                                color="#666" 
                            />
                        </TouchableOpacity>
                    </View>
                    {confirm && newPass !== confirm && (
                        <Text style={s.errorText}>Mật khẩu xác nhận không khớp</Text>
                    )}
                </View>

                <TouchableOpacity 
                    style={[s.saveBtn, loading && s.saveBtnDisabled]} 
                    onPress={onChangePassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="key-outline" size={20} color="#fff"/>
                            <Text style={s.saveBtnText}>Cập nhật mật khẩu</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={18} color="#f77" />
                    <Text style={s.cancelText}>Quay lại</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: {flex: 1, backgroundColor: "#fff"},
    container: {flex: 1, padding: 16},
    title: {fontSize: 22, fontWeight: "bold", color: "#f77", marginBottom: 24},
    formGroup: {marginBottom: 16},
    label: {fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6},
    inputContainer: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center"
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        paddingRight: 40,
        fontSize: 15,
        color: "#333"
    },
    inputError: {
        borderColor: "#f77",
        borderWidth: 2
    },
    eyeIcon: {
        position: "absolute",
        right: 12,
        padding: 4
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6
    },
    errorText: {
        fontSize: 12,
        color: "#f77",
        flex: 1
    },
    successContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#e8f5e9",
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#4CAF50",
        marginBottom: 20
    },
    successText: {
        fontSize: 14,
        color: "#2e7d32",
        fontWeight: "600",
        marginLeft: 10,
        flex: 1
    },
    requirementText: {
        fontSize: 12,
        color: "#666",
        marginTop: 4
    },
    requirementContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e0e0e0"
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: "#e0e0e0",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 8
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#4CAF50",
        borderRadius: 3
    },
    progressText: {
        fontSize: 12,
        color: "#666",
        fontWeight: "600",
        marginBottom: 12,
        textAlign: "center"
    },
    checklistContainer: {
        // gap handled by marginBottom in checklistItem
    },
    checklistItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: "#ccc",
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center"
    },
    checkboxChecked: {
        backgroundColor: "#4CAF50",
        borderColor: "#4CAF50"
    },
    checklistText: {
        fontSize: 13,
        color: "#666",
        flex: 1,
        marginLeft: 10
    },
    checklistTextChecked: {
        color: "#333",
        fontWeight: "500"
    },
    saveBtn: {
        flexDirection: "row",
        backgroundColor: "#f77",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20
    },
    saveBtnDisabled: {
        opacity: 0.6
    },
    saveBtnText: {color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 8},
    cancelBtn: {flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16},
    cancelText: {color: "#f77", fontWeight: "600", fontSize: 15, marginLeft: 6}
});
