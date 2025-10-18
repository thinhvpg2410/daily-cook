import React from "react";
import {NavigationContainer} from "@react-navigation/native";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {AuthProvider, useAuth} from "./src/context/AuthContext";
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

// Main
import HomeScreen from "./src/screens/HomeScreen";
import CategoryScreen from "./src/screens/CategoryScreen";
import DetailsScreen from "./src/screens/DetailsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import MealSuggestScreen from "./src/screens/MealSuggestScreen";

const Stack = createNativeStackNavigator();

function RootNavigator() {
    const {user, loading} = useAuth();
    if (loading) {
        return (
            <Stack.Navigator screenOptions={{headerShown: false}}>
                <Stack.Screen name="Launch" component={LaunchScreen}/>
            </Stack.Navigator>
        );
    }
    if (!user) {
        return (
            <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Onboarding">
                {/*<Stack.Screen name="Onboarding" component={OnboardingScreen}/>*/}
                {/*<Stack.Screen name="Onboarding2" component={OnboardingScreen2}/>*/}
                <Stack.Screen name="SignInEmail" component={SignInEmail}/>
                <Stack.Screen name="SignUpEmail" component={SignUpEmail}/>
                <Stack.Screen name="ForgotPasswordEmail" component={ForgotPasswordEmail}/>
                <Stack.Screen name="ForgotPasswordCode" component={ForgotPasswordCode}/>
                <Stack.Screen name="ResetPassword" component={ResetPassword}/>
            </Stack.Navigator>
        );
    }
    return (
        <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Home">
            <Stack.Screen name="Home" component={HomeScreen}/>
            <Stack.Screen name="Category" component={CategoryScreen}/>
            <Stack.Screen name="Details" component={DetailsScreen}/>
            <Stack.Screen name="Profile" component={ProfileScreen}/>
            <Stack.Screen name="Calendar" component={CalendarScreen}/>
            <Stack.Screen name="MealPlan" component={MealSuggestScreen}/>
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
