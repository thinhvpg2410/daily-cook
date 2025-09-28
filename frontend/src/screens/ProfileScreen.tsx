import React from "react";
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TabBar from "./TabBar";

export default function ProfileScreen({ navigation }: any) {
  const user = {
    name: "Dianne Russell",
    email: "dianne@example.com",
    phone: "+84 123 456 789",
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} style={s.container}>
        {/* Header */}
        <Text style={s.title}>Profile</Text>

        {/* User Info */}
        <View style={s.card}>
          <Ionicons name="person-circle-outline" size={80} color="#f77" style={{ alignSelf: "center" }} />
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.text}>{user.email}</Text>
          <Text style={s.text}>{user.phone}</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={s.item}>
          <Ionicons name="create-outline" size={20} color="#f77" />
          <Text style={s.itemText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.item}>
          <Ionicons name="lock-closed-outline" size={20} color="#f77" />
          <Text style={s.itemText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.item}>
          <Ionicons name="log-out-outline" size={20} color="#f77" />
          <Text style={[s.itemText, { color: "red" }]}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={{ marginBottom: 50 }}>
        <TabBar />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#fff"},
  container:{flex:1,padding:16},
  title:{fontSize:22,fontWeight:"bold",color:"#f77",marginBottom:16},
  card:{alignItems:"center",marginBottom:24},
  name:{fontSize:18,fontWeight:"600",marginTop:8},
  text:{fontSize:14,color:"#555",marginTop:2},
  item:{flexDirection:"row",alignItems:"center",paddingVertical:14,borderBottomWidth:1,borderColor:"#eee"},
  itemText:{fontSize:16,marginLeft:12,color:"#333"}
});
