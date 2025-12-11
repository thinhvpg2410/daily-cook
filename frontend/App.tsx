import React, { useState, useEffect } from "react";
import {NavigationContainer} from "@react-navigation/native";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {ActivityIndicator, View} from "react-native";
import {AuthProvider, useAuth} from "./src/context/AuthContext";
import {hasCompletedOnboarding} from "./src/utils/onboarding";
// Launch & Onboarding
import LaunchScreen from "./src/screens/LaunchScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import OnboardingScreen2 from "./src/screens/OnboardingScreen2";

// Auth
import SignInEmail from "./src/screens/SignInEmail";
import SignUpEmail from "./src/screens/SignUpEmail";
import ForgotPasswordEmail from "./src/screens/ForgotPasswordEmail";
import ForgotPasswordCode from "./src/screens/ForgotPasswordCode";
import ResetPassword from "./src/screens/ResetPassword";
import ResetPasswordSuccess from "./src/screens/ResetPasswordSuccess";

// Main
import HomeScreen from "./src/screens/HomeScreen";
import CategoryScreen from "./src/screens/CategoryScreen";
import DetailsScreen from "./src/screens/DetailsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import MealSuggestScreen from "./src/screens/MealSuggestScreen";
import CookingScreen from "./src/screens/CookingScreen";

//Profile
import ShoppingListScreen from "./src/screens/ShoppingListScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import FavoriteRecipes from "./src/screens/FavoriteRecipesScreen";
import NutritionTracker from "./src/screens/NutritionTrackerScreen";
import NutritionGoalsScreen from "./src/screens/NutritionGoalsScreen";
import CookingHistoryScreen from "./src/screens/CookingHistoryScreen";
import CookingStatsScreen from "./src/screens/CookingStatsScreen";


const Stack = createNativeStackNavigator();

function RootNavigator() {
    const {user, loading: authLoading} = useAuth();
    const [onboardingChecked, setOnboardingChecked] = useState(false);
    const [hasOnboarding, setHasOnboarding] = useState(false);
    const [initialRoute, setInitialRoute] = useState<string | null>(null);

    useEffect(() => {
        // Kiểm tra onboarding status
        const checkOnboarding = async () => {
            const completed = await hasCompletedOnboarding();
            setHasOnboarding(completed);
            setOnboardingChecked(true);
            
            // Xác định initial route
            if (authLoading) {
                // Đang check auth, chờ
                return;
            }
            
            if (user) {
                // Đã đăng nhập
                if (!completed) {
                    // Chưa hoàn thành onboarding -> Onboarding2
                    setInitialRoute("Onboarding2");
                } else {
                    // Đã hoàn thành onboarding -> Home
                    setInitialRoute("Home");
                }
            } else if (!completed) {
                // Chưa đăng nhập và chưa hoàn thành onboarding -> Launch
                setInitialRoute("Launch");
            } else {
                // Đã hoàn thành onboarding nhưng chưa đăng nhập -> Auth
                setInitialRoute("SignInEmail");
            }
        };

        checkOnboarding();
    }, [user, authLoading]);

    // Hiển thị loading khi đang check auth hoặc onboarding
    if (authLoading || !onboardingChecked || !initialRoute) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
                <ActivityIndicator size="large" color="#f77" />
            </View>
        );
    }

    // User đã đăng nhập
    if (user) {
        // Nếu chưa hoàn thành onboarding, hiển thị onboarding flow
        if (!hasOnboarding) {
            return (
                <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Onboarding2">
                    <Stack.Screen name="Onboarding2" component={OnboardingScreen2}/>
                    <Stack.Screen name="Home" component={HomeScreen}/>
                    <Stack.Screen name="Category" component={CategoryScreen}/>
                    <Stack.Screen name="Details" component={DetailsScreen}/>
                    <Stack.Screen name="Cooking" component={CookingScreen}/>
                    <Stack.Screen name="Profile" component={ProfileScreen}/>
                    <Stack.Screen name="Calendar" component={CalendarScreen}/>
                    <Stack.Screen name="MealPlan" component={MealSuggestScreen}/>
                    <Stack.Screen name="MealSuggest" component={MealSuggestScreen}/>
                    <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
                </Stack.Navigator>
            );
        }
        
        // Đã hoàn thành onboarding -> Main app
        return (
            <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Home">
                <Stack.Screen name="Home" component={HomeScreen}/>
                <Stack.Screen name="Category" component={CategoryScreen}/>
                <Stack.Screen name="Details" component={DetailsScreen}/>
                <Stack.Screen name="Cooking" component={CookingScreen}/>
                <Stack.Screen name="Profile" component={ProfileScreen}/>
                <Stack.Screen name="Calendar" component={CalendarScreen}/>
                <Stack.Screen name="MealPlan" component={MealSuggestScreen}/>
                <Stack.Screen name="MealSuggest" component={MealSuggestScreen}/>
                <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
                <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen name="FavoriteRecipes" component={FavoriteRecipes} />
                <Stack.Screen name="NutritionTracker" component={NutritionTracker} />
                <Stack.Screen name="NutritionGoals" component={NutritionGoalsScreen} />
                <Stack.Screen name="CookingHistory" component={CookingHistoryScreen} />
                <Stack.Screen name="CookingStats" component={CookingStatsScreen} />
            </Stack.Navigator>
        );
    }

    // User chưa đăng nhập -> Auth flow (có thể có onboarding)
    return (
        <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName={initialRoute}>
            <Stack.Screen name="Launch" component={LaunchScreen}/>
            <Stack.Screen name="Onboarding" component={OnboardingScreen}/>
            <Stack.Screen name="Onboarding2" component={OnboardingScreen2}/>
            <Stack.Screen name="SignInEmail" component={SignInEmail}/>
            <Stack.Screen name="SignUpEmail" component={SignUpEmail}/>
            <Stack.Screen name="ForgotPasswordEmail" component={ForgotPasswordEmail}/>
            <Stack.Screen name="ForgotPasswordCode" component={ForgotPasswordCode}/>
            <Stack.Screen name="ResetPassword" component={ResetPassword}/>
            <Stack.Screen name="ResetPasswordSuccess" component={ResetPasswordSuccess}/>
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <RootNavigator/>
            </NavigationContainer>
        </AuthProvider>
    );
}

// export default function App() {
//     return (
//         <NavigationContainer>
//             <Stack.Navigator
//                 initialRouteName="Launch"
//                 screenOptions={{headerShown: false}}
//             >
//                 {/* Launch & Onboarding */}
//                 <Stack.Screen name="Launch" component={LaunchScreen}/>
//                 <Stack.Screen name="Onboarding" component={OnboardingScreen}/>
//                 <Stack.Screen name="Onboarding2" component={OnboardingScreen2}/>
//
//                 {/* Auth */}
//                 <Stack.Screen name="SignInEmail" component={SignInEmail}/>
//                 <Stack.Screen name="SignUpEmail" component={SignUpEmail}/>
//                 <Stack.Screen name="ForgotPasswordEmail" component={ForgotPasswordEmail}/>
//                 <Stack.Screen name="ForgotPasswordCode" component={ForgotPasswordCode}/>
//                 <Stack.Screen name="ResetPassword" component={ResetPassword}/>
//
//                 {/* Main */}
//                 <Stack.Screen name="Home" component={HomeScreen}/>
//                 <Stack.Screen name="Category" component={CategoryScreen}/>
//                 <Stack.Screen name="Details" component={DetailsScreen}/>
//                 <Stack.Screen name="Profile" component={ProfileScreen}/>
//                 <Stack.Screen name="Calendar" component={CalendarScreen}/>
//             </Stack.Navigator>
//         </NavigationContainer>
//     );
// }
