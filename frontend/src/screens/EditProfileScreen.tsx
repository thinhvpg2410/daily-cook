import React, {useState} from "react";
import {View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "../context/AuthContext";
import {updateProfileApi} from "../api/users";

export default function EditProfileScreen({navigation}: any) {
    const {user, refreshMe} = useAuth();
    const [name, setName] = useState(user?.name ?? "");
    const [phone, setPhone] = useState(user?.phone ?? "");
    const [loading, setLoading] = useState(false);

    const onSave = async () => {
        if (!name.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập họ tên");
            return;
        }

        setLoading(true);
        try {
            await updateProfileApi({
                name: name.trim(),
                phone: phone.trim() || undefined,
            });
            
            // Refresh user data
            await refreshMe();
            
            Alert.alert("Thành công", "Thông tin cá nhân đã được cập nhật!", [
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
                <Text style={s.title}>Chỉnh sửa hồ sơ</Text>

                <View style={s.formGroup}>
                    <Text style={s.label}>Họ và tên</Text>
                    <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Nhập họ tên"/>
                </View>

                <View style={s.formGroup}>
                    <Text style={s.label}>Email</Text>
                    <TextInput 
                        style={[s.input, s.inputDisabled]} 
                        value={user?.email ?? ""} 
                        editable={false}
                        placeholder="Email không thể thay đổi"
                    />
                </View>

                <View style={s.formGroup}>
                    <Text style={s.label}>Số điện thoại</Text>
                    <TextInput 
                        style={s.input} 
                        value={phone} 
                        onChangeText={setPhone} 
                        keyboardType="phone-pad"
                        placeholder="Nhập số điện thoại"
                    />
                </View>

                <TouchableOpacity 
                    style={[s.saveBtn, loading && s.saveBtnDisabled]} 
                    onPress={onSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={20} color="#fff" />
                            <Text style={s.saveBtnText}>Lưu thay đổi</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={18} color="#f77" />
                    <Text style={s.cancelText}>Hủy bỏ</Text>
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
    inputDisabled: {
        backgroundColor: "#f5f5f5",
        color: "#999"
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
