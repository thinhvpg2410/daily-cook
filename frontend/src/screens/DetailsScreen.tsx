import React from "react";
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DetailsScreen({ route, navigation }: any) {
  const { item } = route.params; // nhận món ăn từ Home/Category

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#f77" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{item.title}</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="share-social-outline" size={20} color="#f77" />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="heart-outline" size={20} color="#f77" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image + overlay */}
        <View style={s.imageWrap}>
          <Image source={{ uri: item.image }} style={s.image} />
          <TouchableOpacity style={s.playBtn}>
            <Ionicons name="play" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={s.imageFooter}>
            <Text style={s.dishTitle}>{item.title}</Text>
            <View style={s.row}>
              <Ionicons name="heart" size={14} color="#f77" />
              <Text style={s.infoText}>{item.likes}</Text>
              <Text style={[s.infoText, { marginLeft: 6 }]}>2,273</Text>
            </View>
          </View>
        </View>

        {/* Chef info */}
        <View style={s.chefBox}>
          <Image
            source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }}
            style={s.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.chefName}>@josh-ryan</Text>
            <Text style={s.chefDesc}>Josh Ryan - Chef</Text>
          </View>
          <TouchableOpacity style={s.followBtn}>
            <Text style={{ color: "#f77", fontWeight: "600" }}>Following</Text>
          </TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={18} color="#f77" style={{ marginLeft: 10 }} />
        </View>

        {/* Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Details</Text>
          <View style={s.row}>
            <Ionicons name="time-outline" size={16} color="#f77" />
            <Text style={{ marginLeft: 6, color: "#555" }}>{item.time}</Text>
          </View>
          <Text style={s.desc}>
            Fluffy pancakes served with silky whipped cream, a classic breakfast indulgence
            perfect for a leisurely morning treat.
          </Text>
        </View>

        {/* Ingredients */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ingredients</Text>
          {[
            "1 cup all-purpose flour",
            "2 tablespoons granulated sugar",
            "1 teaspoon baking powder",
            "1/2 teaspoon baking soda",
            "1/4 teaspoon salt",
            "1 cup buttermilk",
            "1 large egg",
            "2 tablespoons unsalted butter"
          ].map((ing, idx) => (
            <Text key={idx} style={s.ing}>• {ing}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:16},
  headerTitle:{fontSize:18,fontWeight:"600",color:"#f77"},
  iconBtn:{backgroundColor:"#ffeef0",padding:6,borderRadius:20,marginLeft:8},

  imageWrap:{position:"relative",marginHorizontal:16,borderRadius:12,overflow:"hidden"},
  image:{width:"100%",height:220,borderRadius:12},
  playBtn:{position:"absolute",top:"40%",left:"45%",backgroundColor:"#f77",borderRadius:30,padding:14},
  imageFooter:{backgroundColor:"#f77",padding:12,position:"absolute",bottom:0,width:"100%",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  dishTitle:{color:"#fff",fontSize:16,fontWeight:"600"},row:{flexDirection:"row",alignItems:"center"},
  infoText:{color:"#fff",fontSize:13,marginLeft:4},

  chefBox:{flexDirection:"row",alignItems:"center",padding:16,borderBottomWidth:1,borderColor:"#eee"},
  avatar:{width:48,height:48,borderRadius:24,marginRight:12},
  chefName:{fontSize:14,fontWeight:"600",color:"#333"},chefDesc:{fontSize:12,color:"#777"},
  followBtn:{borderWidth:1,borderColor:"#f77",borderRadius:20,paddingVertical:6,paddingHorizontal:14},

  section:{padding:16,borderBottomWidth:1,borderColor:"#eee"},
  sectionTitle:{fontSize:16,fontWeight:"600",color:"#f77",marginBottom:6},
  desc:{fontSize:13,color:"#555",marginTop:6,lineHeight:18},
  ing:{fontSize:13,color:"#555",marginVertical:2}
});
