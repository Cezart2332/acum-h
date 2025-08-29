import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View, ScrollView, Image } from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "../config";
import type { LocationData } from "./RootStackParamList";
const { useNavigation } = require("@react-navigation/native");

// Use react-native-maps with standard map tiles for Expo Go compatibility
import MapView, { Marker, UrlTile, Callout } from "react-native-maps";

type RegionLike = { latitude: number; longitude: number; zoom?: number };

const DEFAULT_REGION: RegionLike = {
	latitude: 44.4268,
	longitude: 26.1025,
	zoom: 12,
};

// Calculate distance between two coordinates in kilometers
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
	const R = 6371; // Radius of the Earth in kilometers
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = 
		Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
		Math.sin(dLon/2) * Math.sin(dLon/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	const distance = R * c;
	return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Get category emoji based on location category
const getCategoryEmoji = (category: string): string => {
	const cat = category.toLowerCase();
	if (cat.includes('coffee') || cat.includes('cafe')) return '☕';
	if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dining')) return '🍴';
	if (cat.includes('club') || cat.includes('disco') || cat.includes('dance')) return '🎵';
	if (cat.includes('pub') || cat.includes('bar') || cat.includes('brewery')) return '🍺';
	if (cat.includes('pizza')) return '🍕';
	if (cat.includes('fast') || cat.includes('burger')) return '🍔';
	if (cat.includes('bakery') || cat.includes('pastry')) return '🥐';
	if (cat.includes('ice cream') || cat.includes('gelato')) return '🍦';
	if (cat.includes('wine')) return '🍷';
	if (cat.includes('hotel') || cat.includes('accommodation')) return '🏨';
	// Default fallback
	return '🍽️';
};

const MapsScreen: React.FC = () => {
	const navigation = useNavigation();
	const [region, setRegion] = useState<RegionLike>(DEFAULT_REGION);
	const [markerReady, setMarkerReady] = useState<Record<string, boolean>>({});
	const [hasLocation, setHasLocation] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [locations, setLocations] = useState<LocationData[]>([]);
	const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
	const [showDebug, setShowDebug] = useState(false);
	const [debugInfo, setDebugInfo] = useState({
		platform: Platform.OS,
		locationPermission: 'unknown',
		locationCount: 0,
		mapReady: false,
		lastFetch: 'never',
		apiStatus: 'unknown',
		currentLocation: null as any,
		region: null as any,
		mapViewProps: {} as any
	});

	useEffect(() => {
		let mounted = true;
		// Removed Mapbox.setAccessToken for expo-maps compatibility
		(async () => {
			setLoading(true);
			setError(null);
			try {
				await Promise.all([requestLocation(), fetchLocations()]);
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	const requestLocation = async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			setDebugInfo(prev => ({ ...prev, locationPermission: status }));
			
			if (status !== "granted") {
				setError((prev) => prev ?? "Permission to access location was denied");
				setHasLocation(false);
				return;
			}
			const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
			const newRegion = { ...region, latitude: current.coords.latitude, longitude: current.coords.longitude };
			setRegion(newRegion);
			setHasLocation(true);
			setUserLocation(current.coords);
			
			setDebugInfo(prev => ({ 
				...prev, 
				currentLocation: current.coords,
				region: newRegion
			}));
		} catch (err) {
			setError((prev) => prev ?? "Failed to get current location");
			setHasLocation(false);
			setDebugInfo(prev => ({ ...prev, locationPermission: 'error', currentLocation: null }));
		}
	};

	const fetchLocations = async () => {
		try {
			const res = await fetch(`${BASE_URL}/locations`);
			setDebugInfo(prev => ({ ...prev, apiStatus: `${res.status} ${res.statusText}` }));
			
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const list: LocationData[] = Array.isArray(data) ? data : data?.data || [];
			const valid = list.filter(
				(l) => typeof l.latitude === "number" && typeof l.longitude === "number" && !Number.isNaN(l.latitude) && !Number.isNaN(l.longitude)
			);
			setLocations(valid);
			
			setDebugInfo(prev => ({ 
				...prev, 
				locationCount: valid.length,
				lastFetch: new Date().toLocaleTimeString(),
				apiStatus: 'success'
			}));
		} catch (err) {
			setError((prev) => prev ?? "Failed to load locations");
			Alert.alert("Error", "Failed to load locations from server");
			setDebugInfo(prev => ({ 
				...prev, 
				apiStatus: `error: ${err}`,
				lastFetch: 'failed'
			}));
		}
	};

	const onCalloutPress = useCallback((location: LocationData) => {
		navigation.navigate("Info", { location });
	}, [navigation]);

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.center}>
					<ActivityIndicator size="large" color="#A78BFA" />
					<Text style={styles.muted}>Loading map…</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (error && !hasLocation) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.center}>
					<Text style={styles.error}>{error}</Text>
					<TouchableOpacity style={styles.button} onPress={requestLocation}>
						<Text style={styles.buttonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	const isAndroid = Platform.OS === "android";

	return (
		<SafeAreaView style={styles.container}>
			<MapView
				style={styles.map}
				initialRegion={{
					latitude: region.latitude,
					longitude: region.longitude,
					latitudeDelta: 0.0922,
					longitudeDelta: 0.0421,
				}}
				showsUserLocation={true}
				showsMyLocationButton={true}
				mapType="none"
				onPress={(e) => {
					// Add a small delay to avoid conflicts with marker presses
					setTimeout(() => {
						console.log('Map pressed, closing info card');
						setSelectedLocation(null);
					}, 100);
				}}
				onMapReady={() => {
					setDebugInfo(prev => ({ ...prev, mapReady: true }));
					console.log('📍 MapView Ready');
				}}
				onRegionChange={(newRegion) => {
					setDebugInfo(prev => ({ 
						...prev, 
						region: newRegion,
						mapViewProps: {
							latitude: newRegion.latitude,
							longitude: newRegion.longitude,
							latitudeDelta: newRegion.latitudeDelta,
							longitudeDelta: newRegion.longitudeDelta
						}
					}));
				}}
			>
				{/* Dark theme tiles with street names */}
				<UrlTile
					urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
					maximumZ={19}
					flipY={false}
				/>				{locations.map((loc) => {
					const distance = userLocation ? calculateDistance(
						userLocation.latitude,
						userLocation.longitude,
						loc.latitude,
						loc.longitude
					) : null;
					
					const categoryEmoji = getCategoryEmoji(loc.category || 'restaurant');
					const ready = !!markerReady[loc.id];
					return (
						<Marker
					      key={String(loc.id)}
							coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
							tracksViewChanges={!ready}
							anchor={{ x: 0.5, y: 0.5 }}
							onPress={(e) => {
								if (e && e.stopPropagation) e.stopPropagation(); // Prevent map onPress from firing
								console.log('Marker pressed:', loc.name, 'Platform:', Platform.OS);
								console.log('Category:', loc.category, 'Emoji:', categoryEmoji);
								console.log('Current selectedLocation:', selectedLocation);
								console.log('Current selectedLocation ID:', selectedLocation?.id);
								console.log('Loc ID:', loc.id);
								
								// Simplified logic to avoid undefined issues
								const isCurrentlySelected = selectedLocation && selectedLocation.id === loc.id;
								console.log('Is currently selected:', isCurrentlySelected);
								
								if (isCurrentlySelected) {
									console.log('Closing info card');
									setSelectedLocation(null);
								} else {
									console.log('Opening info card for:', loc.name);
									setSelectedLocation(loc);
								}
							}}
						>
							{Platform.OS === 'ios' ? (
								<View style={{
									width: 30,
									height: 30,
									backgroundColor: '#8B5CF6',
									borderRadius: 15,
									borderWidth: 2,
									borderColor: '#4C1D95',
									justifyContent: 'center',
									alignItems: 'center',
									shadowColor: '#000',
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.3,
									shadowRadius: 4,
									elevation: 6,
								}}>
									<Text style={{ color: '#fff', fontSize: 15 }}>{categoryEmoji}</Text>
								</View>
							) : (
								<View style={{
									width: 30,
									height: 30,
									backgroundColor: '#8B5CF6',
									borderRadius: 15,
									borderWidth: 2,
									borderColor: '#4C1D95',
									justifyContent: 'center',
									alignItems: 'center',
									elevation: 6,
								}}>
									<Text style={{ 
										color: '#fff', 
										fontSize: 15,
										textAlign: 'center',
										includeFontPadding: false,
										textAlignVertical: 'center',
									}}>{categoryEmoji}</Text>
								</View>
							)}
						</Marker>
					);
				})}
			</MapView>



			{/* Debug Overlay */}
			{showDebug && (
				<View style={styles.debugOverlay}>
					<ScrollView style={styles.debugContent}>
						<Text style={styles.debugTitle}>🔍 Maps Debug Info</Text>
						
						<Text style={styles.debugSection}>📱 Platform</Text>
						<Text style={styles.debugText}>OS: {debugInfo.platform}</Text>
						<Text style={styles.debugText}>Map Ready: {debugInfo.mapReady ? '✅' : '❌'}</Text>
						
						<Text style={styles.debugSection}>📍 Location</Text>
						<Text style={styles.debugText}>Permission: {debugInfo.locationPermission}</Text>
						<Text style={styles.debugText}>Has Location: {hasLocation ? '✅' : '❌'}</Text>
						<Text style={styles.debugText}>Distance Calc: {userLocation ? '✅' : '❌'}</Text>
						{debugInfo.currentLocation && (
							<Text style={styles.debugText}>
								GPS: {debugInfo.currentLocation.latitude.toFixed(6)}, {debugInfo.currentLocation.longitude.toFixed(6)}
							</Text>
						)}
						
						<Text style={styles.debugSection}>🗺️ Map State</Text>
						{debugInfo.region && (
							<>
								<Text style={styles.debugText}>
									Center: {debugInfo.region.latitude.toFixed(6)}, {debugInfo.region.longitude.toFixed(6)}
								</Text>
								<Text style={styles.debugText}>
									Delta: {debugInfo.region.latitudeDelta?.toFixed(6)}, {debugInfo.region.longitudeDelta?.toFixed(6)}
								</Text>
							</>
						)}
						
						<Text style={styles.debugSection}>🌐 API</Text>
						<Text style={styles.debugText}>Status: {debugInfo.apiStatus}</Text>
						<Text style={styles.debugText}>Last Fetch: {debugInfo.lastFetch}</Text>
						<Text style={styles.debugText}>Locations: {debugInfo.locationCount}</Text>
						<Text style={styles.debugText}>Base URL: {BASE_URL}</Text>
						
						<Text style={styles.debugSection}>🎨 Features</Text>
						<Text style={styles.debugText}>Dark Theme: ✅ CartoDB Dark+Streets</Text>
						<Text style={styles.debugText}>Enhanced Callouts: ✅</Text>
						<Text style={styles.debugText}>Distance Display: {userLocation ? '✅' : '❌'}</Text>
						<Text style={styles.debugText}>Restaurant Photos: ✅</Text>
						<Text style={styles.debugText}>Category Icons: ✅</Text>
						
						<Text style={styles.debugSection}>🏷️ Category Mapping</Text>
						{locations.slice(0, 5).map((loc, index) => (
							<Text key={index} style={styles.debugText}>
								{loc.name}: {loc.category} → {getCategoryEmoji(loc.category || 'restaurant')}
							</Text>
						))}
						{locations.length > 5 && (
							<Text style={styles.debugText}>... and {locations.length - 5} more</Text>
						)}
						
						{error && (
							<>
								<Text style={styles.debugSection}>❌ Errors</Text>
								<Text style={styles.debugError}>{error}</Text>
							</>
						)}
						
						<TouchableOpacity 
							style={styles.debugButton}
							onPress={() => fetchLocations()}
						>
							<Text style={styles.debugButtonText}>🔄 Refresh Locations</Text>
						</TouchableOpacity>
						
						<TouchableOpacity 
							style={styles.debugButton}
							onPress={() => requestLocation()}
						>
							<Text style={styles.debugButtonText}>📍 Refresh Location</Text>
						</TouchableOpacity>
					</ScrollView>
				</View>
			)}

			{/* Enhanced Restaurant Info Card */}
			{selectedLocation && (
				<View style={styles.enhancedInfoCard}>
					<TouchableOpacity 
						style={styles.closeButton}
						onPress={() => {
							console.log('Close button pressed, Platform:', Platform.OS);
							setSelectedLocation(null);
						}}
					>
						<Text style={styles.closeButtonText}>✕</Text>
					</TouchableOpacity>
					
					<View style={styles.cardHeader}>
						<Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
							{selectedLocation.name}
											{userLocation && (
							<View style={styles.cardDistanceContainer}>
								<Text style={styles.cardDistanceText}>{calculateDistance(
									userLocation.latitude,
									userLocation.longitude,
									selectedLocation.latitude,
									selectedLocation.longitude
								)} km</Text>
							</View>
						)}
						</Text>
		
					</View>
					
					{selectedLocation.photoUrl && selectedLocation.photoUrl.trim() !== '' ? (
						<Image 
							source={{ 
								uri: selectedLocation.photoUrl,
								cache: 'force-cache'
							}} 
							style={styles.cardImage}
							resizeMode="cover"
							onError={(error) => {
								console.log('Image load error for', selectedLocation.name, ':', error.nativeEvent.error);
							}}
						/>
					) : (
						<View style={[styles.cardImage, styles.cardImagePlaceholder]}>
							<Text style={styles.cardImagePlaceholderText}>🍽️</Text>
						</View>
					)}
					
					<Text style={styles.cardAddress}>{selectedLocation.address}</Text>
					
					<TouchableOpacity 
						style={styles.cardButton}
						onPress={() => {
							setSelectedLocation(null);
							onCalloutPress(selectedLocation);
						}}
					>
						<Text style={styles.cardButtonText}>View Details</Text>
					</TouchableOpacity>
				</View>
			)}

			{error && hasLocation && (
				<View style={styles.toast}>
					<Text style={styles.toastText}>{error}</Text>
				</View>
			)}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#fff" },
	map: { flex: 1 },
	center: { flex: 1, justifyContent: "center", alignItems: "center" },
	muted: { marginTop: 8, color: "#666" },
	error: { color: "#444", textAlign: "center", paddingHorizontal: 24, marginBottom: 16 },
	button: { backgroundColor: "#A78BFA", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
	buttonText: { color: "#fff", fontWeight: "600" },
	callout: { minWidth: 200 },
	title: { fontWeight: "700", fontSize: 16, marginBottom: 4, color: "#222" },
	subtitle: { color: "#666", marginBottom: 6 },
	link: { color: "#A78BFA", fontStyle: "italic" },
	toast: { position: "absolute", left: 16, right: 16, bottom: 24, backgroundColor: "#00000088", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
	toastText: { color: "#fff", textAlign: "center" },
	// Debug styles
	debugToggle: {
		position: "absolute",
		top: 60,
		right: 16,
		backgroundColor: "#333",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		zIndex: 1000,
	},
	debugToggleText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
	},
	debugOverlay: {
		position: "absolute",
		top: 100,
		left: 16,
		right: 16,
		bottom: 100,
		backgroundColor: "rgba(0,0,0,0.9)",
		borderRadius: 8,
		zIndex: 999,
	},
	debugContent: {
		flex: 1,
		padding: 16,
	},
	debugTitle: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 16,
		textAlign: "center",
	},
	debugSection: {
		color: "#A78BFA",
		fontSize: 14,
		fontWeight: "600",
		marginTop: 12,
		marginBottom: 6,
	},
	debugText: {
		color: "#ccc",
		fontSize: 12,
		marginBottom: 4,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
	},
	debugError: {
		color: "#ff6b6b",
		fontSize: 12,
		marginBottom: 4,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
	},
	debugButton: {
		backgroundColor: "#A78BFA",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 6,
		marginTop: 8,
		marginBottom: 4,
	},
	debugButtonText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
		textAlign: "center",
	},
	// Enhanced Callout styles
	calloutContainer: {
		width: 220,
		padding: 10,
		backgroundColor: "#1e1e2e",
		borderRadius: 10,
		borderWidth: 2,
		borderColor: "#A78BFA",
		overflow: 'hidden',
		shadowColor: "#A78BFA",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	calloutHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
		paddingBottom: 6,
		borderBottomWidth: 1,
		borderBottomColor: "#A78BFA40",
	},
	calloutTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#fff",
		flex: 1,
		textShadowColor: "#A78BFA",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	distanceContainer: {
		backgroundColor: "#A78BFA",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginLeft: 8,
		shadowColor: "#A78BFA",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 4,
		elevation: 4,
	},
	distanceText: {
		fontSize: 11,
		fontWeight: "700",
		color: "#fff",
		textAlign: "center",
	},
	calloutImage: {
		width: "100%",
		height: 100,
		borderRadius: 8,
		marginBottom: 8,
		backgroundColor: "#2a2a2a",
		borderWidth: 1,
		borderColor: "#A78BFA60",
	},
	calloutAddress: {
		fontSize: 13,
		color: "#ccc",
		marginBottom: 10,
		lineHeight: 18,
		fontStyle: "italic",
	},
	calloutButton: {
		backgroundColor: "#A78BFA",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		alignItems: "center",
		shadowColor: "#A78BFA",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.4,
		shadowRadius: 6,
		elevation: 6,
		borderWidth: 1,
		borderColor: "#B794F6",
		// Add a subtle inner glow effect
		marginTop: 2,
	},
	calloutButtonText: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		textShadowColor: "#6B46C1",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	calloutImagePlaceholder: {
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#2a2a2a",
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: "#A78BFA40",
		borderStyle: "dashed",
	},
	calloutImagePlaceholderText: {
		fontSize: 28,
		opacity: 0.6,
		color: "#A78BFA",
	},
	// Enhanced Info Card styles
	enhancedInfoCard: {
		position: 'absolute',
		bottom: 100,
		left: 16,
		right: 16,
		backgroundColor: "#1e1e2e",
		borderRadius: 16,
		padding: 16,
		borderWidth: 2,
		borderColor: "#A78BFA",
		shadowColor: "#A78BFA",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.4,
		shadowRadius: 12,
		elevation: 12,
		zIndex: 1000,
	},
	closeButton: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "#A78BFA",
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1001,
	},
	closeButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
		paddingBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#A78BFA40",
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#fff",
		flex: 1,
		flexShrink: 1,
		textShadowColor: "#A78BFA",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	cardDistanceInline: {
		fontSize: 14,
		fontWeight: "600",
		color: "#A78BFA",
		textShadowColor: "#4C1D95",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 1,
		alignSelf: 'center',
		marginLeft: 8,
	},
	cardDistanceContainer: {
		backgroundColor: "#1b0b4dff",
		paddingHorizontal: 10,
		paddingVertical: 2,
		borderRadius: 14,
		marginLeft: 18,
		shadowColor: "#240c6cba",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 4,
		elevation: 0,
	},
	cardDistanceText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#fff",
		textAlign: "center",
	},
	cardImage: {
		width: "100%",
		height: 120,
		borderRadius: 12,
		marginBottom: 12,
		backgroundColor: "#2a2a2a",
		borderWidth: 1,
		borderColor: "#A78BFA60",
	},
	cardImagePlaceholder: {
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#2a2a2a",
		borderWidth: 1,
		borderColor: "#A78BFA40",
		borderStyle: "dashed",
	},
	cardImagePlaceholderText: {
		fontSize: 32,
		opacity: 0.6,
		color: "#A78BFA",
	},
	cardAddress: {
		fontSize: 14,
		color: "#ccc",
		marginBottom: 16,
		lineHeight: 20,
		fontStyle: "italic",
	},
	cardButton: {
		backgroundColor: "#A78BFA",
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: "center",
		shadowColor: "#A78BFA",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.4,
		shadowRadius: 8,
		elevation: 8,
		borderWidth: 1,
		borderColor: "#B794F6",
	},
	cardButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		textShadowColor: "#6B46C1",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
});

export default MapsScreen;

