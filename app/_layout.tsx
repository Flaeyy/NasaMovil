import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { WeatherResultsProvider } from './_contexts/WeatherResultsContext';


export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<WeatherResultsProvider>
				<StatusBar style="auto" />
				<Stack screenOptions={{ headerShown: true }}>
					<Stack.Screen name="index" options={{ title: 'Inicio' }} />
					<Stack.Screen name="details/[id]" options={{ title: 'Detalle' }} />
				</Stack>
			</WeatherResultsProvider>
		</GestureHandlerRootView>
	);
}