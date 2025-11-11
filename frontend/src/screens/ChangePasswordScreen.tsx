import React, {useState} from "react";
import {View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {changePasswordApi} from "../api/users";

export default function ChangePasswordScreen({navigation}: any) {
    const [current, setCurrent] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const onChangePassword = async () => {
        if (!current || !newPass || !confirm) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
            return;
        }
        if (newPass.length < 6) {
            Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự");
            return;
        }
        if (newPass !== confirm) {
            Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
            return;
        }

        setLoading(true);
        try {
            await changePasswordApi({
                oldPassword: current,
                newPassword: newPass,
            });
            
            Alert.alert("Thành công", "Mật khẩu đã được thay đổi!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || error?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
            Alert.alert("Lỗi", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
                <Text style={s.title}>Đổi mật khẩu</Text>

                <View style={s.formGroup}>
                    <Text style={s.label}>Mật khẩu hiện tại</Text>
                    <TextInput style={s.input} secureTextEntry value={current} onChangeText={setCurrent}/>
                </View>

                <View style={s.formGroup}>
                    <Text style={s.label}>Mật khẩu mới</Text>
                    <TextInput style={s.input} secureTextEntry value={newPass} onChangeText={setNewPass}/>
                </View>

                <View style={s.formGroup}>
                    <Text style={s.label}>Xác nhận mật khẩu mới</Text>
                    <TextInput style={s.input} secureTextEntry value={confirm} onChangeText={setConfirm}/>
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
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: "#333"
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
