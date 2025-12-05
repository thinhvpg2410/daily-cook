import React, {useState} from "react";
import {View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "../context/AuthContext";
import {updateProfileApi, uploadAvatarApi} from "../api/users";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

const PLACEHOLDER_AVATAR =
    "https://ui-avatars.com/api/?name=User&background=f77&color=fff&size=200";

function normalizeImage(src?: string | null) {
    if (!src || typeof src !== "string" || !src.trim()) return PLACEHOLDER_AVATAR;
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith("/")) return `http://localhost:3000${src}`;
    return src;
}

export default function EditProfileScreen({navigation}: any) {
    const {user, refreshMe} = useAuth();
    const [name, setName] = useState(user?.name ?? "");
    const [phone, setPhone] = useState(user?.phone ?? "");
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Request permission to access media library
    React.useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn avatar.');
                }
            }
        })();
    }, []);

    const pickImage = async () => {
        try {
            // Với web, sử dụng HTML input file
            if (Platform.OS === 'web') {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.style.display = 'none';
                
                input.onchange = async (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    // Kiểm tra kích thước file (max 5MB)
                    const maxSize = 5 * 1024 * 1024; // 5MB
                    if (file.size > maxSize) {
                        Alert.alert("Lỗi", "Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.");
                        return;
                    }
                    
                    try {
                        const uri = URL.createObjectURL(file);
                        // Resize và optimize ảnh
                        const processedImage = await processAndResizeImage(uri);
                        setSelectedImage(processedImage);
                        URL.revokeObjectURL(uri); // Clean up
                    } catch (error: any) {
                        console.error("Error processing image:", error);
                        Alert.alert("Lỗi", error.message || "Không thể xử lý ảnh.");
                    }
                };
                
                document.body.appendChild(input);
                input.click();
                document.body.removeChild(input);
                return;
            }

            // Native: sử dụng expo-image-picker
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn avatar.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1], // Square crop
                quality: 0.8,
                base64: false, // Sẽ convert sau khi resize
            });

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                // Resize và optimize ảnh trước khi hiển thị
                const processedImage = await processAndResizeImage(uri);
                setSelectedImage(processedImage);
            }
        } catch (error: any) {
            console.error("Error picking image:", error);
            Alert.alert("Lỗi", error.message || "Không thể chọn ảnh. Vui lòng thử lại.");
        }
    };

    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập camera để chụp ảnh.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1], // Square crop
                quality: 0.8,
                base64: false,
            });

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                // Resize và optimize ảnh trước khi hiển thị
                const processedImage = await processAndResizeImage(uri);
                setSelectedImage(processedImage);
            }
        } catch (error: any) {
            console.error("Error taking photo:", error);
            Alert.alert("Lỗi", error.message || "Không thể chụp ảnh. Vui lòng thử lại.");
        }
    };

    // Xử lý và resize ảnh để giảm dung lượng
    const processAndResizeImage = async (uri: string): Promise<string> => {
        try {
            // Max size: 512x512px để tiết kiệm dung lượng
            const MAX_SIZE = 512;
            
            // Manipulate image: resize và đảm bảo hình vuông
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                uri,
                [
                    { resize: { width: MAX_SIZE, height: MAX_SIZE } }, // Resize về max 512x512
                ],
                {
                    compress: 0.8, // Compress để giảm dung lượng
                    format: ImageManipulator.SaveFormat.JPEG, // JPEG để giảm size hơn PNG
                }
            );
            
            return manipulatedImage.uri;
        } catch (error: any) {
            console.error("Error processing image:", error);
            // Nếu không xử lý được, trả về URI gốc
            return uri;
        }
    };

    const showImagePickerOptions = () => {
        Alert.alert(
            "Chọn ảnh đại diện",
            "Bạn muốn chọn ảnh từ đâu?",
            [
                {
                    text: "Thư viện ảnh",
                    onPress: pickImage,
                },
                {
                    text: "Chụp ảnh",
                    onPress: takePhoto,
                },
                {
                    text: "Xóa ảnh",
                    style: "destructive",
                    onPress: () => {
                        setSelectedImage(null);
                        setAvatarUrl("");
                    },
                },
                {
                    text: "Hủy",
                    style: "cancel",
                },
            ],
            { cancelable: true }
        );
    };

    const uploadImageToFirebase = async (uri: string): Promise<string> => {
        // Nếu là URL từ internet (như Google avatar hoặc Firebase URL), giữ nguyên
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
            return uri; // Giữ nguyên URL
        }

        try {
            // Convert ảnh sang base64 để gửi lên backend
            let base64Data: string;
            
            if (Platform.OS === 'web') {
                // Web: fetch và convert sang base64
                const response = await fetch(uri);
                if (!response.ok) {
                    throw new Error("Không thể đọc file ảnh");
                }
                const blob = await response.blob();
                
                // Convert blob sang base64
                const reader = new FileReader();
                base64Data = await new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        resolve(result);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } else {
                // React Native: đọc file và convert sang base64
                const base64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: 'base64' as any,
                });
                // Determine mime type từ extension hoặc mặc định là jpeg
                base64Data = `data:image/jpeg;base64,${base64}`;
            }

            // Kiểm tra kích thước (ước tính từ base64)
            // Base64 encoding làm tăng size ~33%, nên nếu base64 > 2.7MB thì ảnh gốc ~2MB
            const maxSize = 2.7 * 1024 * 1024; // ~2MB sau khi encode
            if (base64Data.length > maxSize) {
                throw new Error("Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 2MB.");
            }

            // Gọi API backend để upload lên Firebase Storage
            console.log("Uploading image via backend API...");
            const response = await uploadAvatarApi(base64Data);
            console.log("Image uploaded successfully:", response.data.avatarUrl);
            
            return response.data.avatarUrl;
        } catch (error: any) {
            console.error("Error uploading image:", error);
            
            let errorMessage = "Không thể upload ảnh. Vui lòng thử lại.";
            if (error?.response?.data?.message) {
                errorMessage = typeof error.response.data.message === 'string' 
                    ? error.response.data.message 
                    : errorMessage;
            } else if (error?.message) {
                errorMessage = error.message;
            }
            
            throw new Error(errorMessage);
        }
    };

    const onSave = async () => {
        if (!name.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập họ tên");
            return;
        }

        setLoading(true);
        try {
            let finalAvatarUrl = avatarUrl;

            // Upload ảnh lên Firebase Storage nếu có ảnh mới được chọn
            if (selectedImage) {
                setUploading(true);
                try {
                    finalAvatarUrl = await uploadImageToFirebase(selectedImage);
                } catch (error: any) {
                    console.error("Error uploading image:", error);
                    Alert.alert("Lỗi upload ảnh", error.message || "Không thể upload ảnh. Bạn có muốn tiếp tục lưu thông tin khác không?", [
                        { text: "Hủy", style: "cancel", onPress: () => {
                            setUploading(false);
                        }},
                        { text: "Tiếp tục", onPress: async () => {
                            // Lưu mà không có avatar mới
                            finalAvatarUrl = user?.avatarUrl || "";
                            setUploading(false);
                        }},
                    ]);
                    return;
                } finally {
                    setUploading(false);
                }
            }

            await updateProfileApi({
                name: name.trim(),
                phone: phone.trim() || undefined,
                avatarUrl: finalAvatarUrl || undefined,
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

                {/* Avatar Section */}
                <View style={s.avatarSection}>
                    <View style={s.avatarContainer}>
                        <Image
                            source={{
                                uri: selectedImage || normalizeImage(user?.avatarUrl || avatarUrl)
                            }}
                            style={s.avatar}
                        />
                        <TouchableOpacity
                            style={s.avatarEditBtn}
                            onPress={showImagePickerOptions}
                            disabled={uploading}
                        >
                            <Ionicons name="camera" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={s.avatarHint}>
                        {user?.avatarUrl ? "Chạm vào ảnh để thay đổi" : "Thêm ảnh đại diện"}
                    </Text>
                    {user?.avatarUrl && (
                        <View style={s.googleAvatarHintContainer}>
                            <Ionicons name="logo-google" size={14} color="#4285F4" /> 
                            <Text style={s.googleAvatarHint}>Ảnh từ tài khoản Google</Text>
                        </View>
                    )}
                </View>

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
                    style={[s.saveBtn, (loading || uploading) && s.saveBtnDisabled]} 
                    onPress={onSave}
                    disabled={loading || uploading}
                >
                    {(loading || uploading) ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={20} color="#fff" />
                            <Text style={s.saveBtnText}>
                                {uploading ? "Đang upload ảnh..." : "Lưu thay đổi"}
                            </Text>
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
    avatarSection: {
        alignItems: "center",
        marginBottom: 24,
    },
    avatarContainer: {
        position: "relative",
        marginBottom: 8,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#f0f0f0",
    },
    avatarEditBtn: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#f77",
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "#fff",
    },
    avatarHint: {
        fontSize: 13,
        color: "#666",
        marginTop: 4,
    },
    googleAvatarHintContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        gap: 4,
    },
    googleAvatarHint: {
        fontSize: 12,
        color: "#4285F4",
    },
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
