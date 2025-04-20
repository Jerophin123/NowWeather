import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Animated,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import changeNavigationBarColor from "react-native-navigation-bar-color";

const App = () => {
  const [city, setCity] = useState("");
  const [cities, setCities] = useState([]);
  const [showSplash, setShowSplash] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState(""); // Dynamic greeting
  const splashOpacity = new Animated.Value(1);

  const API_KEY = "a996da042f68433ab2c162740240711";
  const colorScheme = useColorScheme();

  const isDarkMode = colorScheme === "dark";
  const styles = isDarkMode ? darkThemeStyles : lightThemeStyles;

  // Configure navigation bar color
  useEffect(() => {
    const setNavigationBar = async () => {
      const navBarColor = isDarkMode ? "#1E293B" : "#E3F2FD";
      const darkIcons = !isDarkMode;
      await changeNavigationBarColor(navBarColor, darkIcons);
    };

    setNavigationBar();
  }, [isDarkMode]);

  useEffect(() => {
    const splashTimeout = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true, // Smooth animations
      }).start(() => setShowSplash(false));
    }, 3000);

    return () => clearTimeout(splashTimeout);
  }, [splashOpacity]);

  // Update greeting based on the time of day
  useEffect(() => {
    const updateGreeting = () => {
      const currentHour = new Date().getHours();
      if (currentHour < 12) {
        setGreeting("Good Morning!");
      } else if (currentHour < 18) {
        setGreeting("Good Afternoon!");
      } else {
        setGreeting("Good Evening!");
      }
    };

    updateGreeting();
  }, []);

  const showErrorDialog = (title, message) => {
    Alert.alert(title, message);
  };

  const fetchWeather = async () => {
    if (city.trim() === "") {
      showErrorDialog("Error", "Please enter a city name.");
      return;
    }
    try {
      const response = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${city}`
      );
      const weatherData = response.data;

      const newCity = { id: Date.now().toString(), data: weatherData };

      const updatedCities = [newCity, ...cities];
      setCities(updatedCities);
      setCity("");

      await AsyncStorage.setItem("cities", JSON.stringify(updatedCities));
    } catch (err) {
      if (err.message === "Network Error") {
        showErrorDialog(
          "Error",
          "Internet is disconnected. Please check your connection."
        );
      } else if (err.response && err.response.status === 404) {
        showErrorDialog(
          "Error",
          "Weather data not available for the entered city."
        );
      } else {
        showErrorDialog(
          "Error",
          "Could not fetch weather data. Please try again."
        );
      }
    }
  };

  const refreshWeather = async () => {
    try {
      const refreshedCities = await Promise.all(
        cities.map(async (item) => {
          const response = await axios.get(
            `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${item.data.location.name}`
          );
          return { id: item.id, data: response.data };
        })
      );
      setCities(refreshedCities);

      await AsyncStorage.setItem("cities", JSON.stringify(refreshedCities));
    } catch (err) {
      if (err.message === "Network Error") {
        showErrorDialog(
          "Error",
          "Internet is disconnected. Please check your connection."
        );
      } else {
        showErrorDialog(
          "Error",
          "Could not refresh weather data. Please try again."
        );
      }
    }
  };

  const removeCity = async (id) => {
    try {
      const updatedCities = cities.filter((item) => item.id !== id);
      setCities(updatedCities);

      await AsyncStorage.setItem("cities", JSON.stringify(updatedCities));
    } catch (err) {
      showErrorDialog(
        "Error",
        "Could not remove the city. Please try again later."
      );
    }
  };

  const loadCities = async () => {
    try {
      const storedCities = await AsyncStorage.getItem("cities");
      if (storedCities) {
        setCities(JSON.parse(storedCities));
      }
    } catch (err) {
      console.error("Failed to load cities from AsyncStorage", err);
    }
  };

  useEffect(() => {
    loadCities();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshWeather();
    setRefreshing(false);
  };

  const renderAstronomy = () => {
    const currentHour = new Date().getHours();
    let icon = require("./assets/sunrise-icon.png");

    if (currentHour >= 12 && currentHour < 15) {
      icon = require("./assets/noon-icon.png");
    } else if (currentHour >= 15 && currentHour < 18) {
      icon = require("./assets/sunset-icon.png");
    } else if (currentHour >= 18 || currentHour < 6) {
      icon = require("./assets/moon-icon.png");
    }

    return (
      <View style={styles.astronomyBlock}>
        <Image source={icon} style={styles.astronomyIcon} />
      </View>
    );
  };

  if (showSplash) {
    return (
      <>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={isDarkMode ? "#1E293B" : "#E3F2FD"}
          translucent={false}
        />
        <Animated.View
          style={[
            styles.splashScreen,
            {
              backgroundColor: isDarkMode ? "#1E293B" : "#E3F2FD",
              opacity: splashOpacity,
            },
          ]}
        >
          <Image
            source={require("./assets/splash-icon.png")}
            style={styles.splashIcon}
          />
          <Text style={styles.splashText}>Now Weather</Text>
        </Animated.View>
      </>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#1E293B" : "#E3F2FD"}
        translucent={false}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          {renderAstronomy()}
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter city name"
            placeholderTextColor={isDarkMode ? "#A8C3E0" : "#5A78A0"}
            value={city}
            onChangeText={setCity}
          />
          <TouchableOpacity style={styles.addButton} onPress={fetchWeather}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={cities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const { location, current } = item.data;
            return (
              <View style={styles.weatherCard}>
                <Text style={styles.city}>{location.name}</Text>
                <Text style={styles.region}>
                  {location.region}, {location.country}
                </Text>
                <Image
                  source={{ uri: `https:${current.condition.icon}` }}
                  style={styles.weatherIcon}
                />
                <Text style={styles.temp}>
                  {current.temp_c}°C | {current.temp_f}°F
                </Text>
                <Text style={styles.condition}>{current.condition.text}</Text>
                <View style={styles.detailsGrid}>
                  {/* Feels Like */}
                  <View style={styles.gridItem}>
                    <Image
                      source={require("./assets/feels-like-icon.png")}
                      style={styles.gridIcon}
                    />
                    <View>
                      <Text style={styles.gridText}>Feels Like:</Text>
                      <Text style={styles.gridValue}>{current.feelslike_c}°C</Text>
                    </View>
                  </View>

                  {/* Humidity */}
                  <View style={styles.gridItem}>
                    <Image
                      source={require("./assets/humidity-icon.png")}
                      style={styles.gridIcon}
                    />
                    <View>
                      <Text style={styles.gridText}>Humidity:</Text>
                      <Text style={styles.gridValue}>{current.humidity}%</Text>
                    </View>
                  </View>

                  {/* Wind */}
                  <View style={styles.gridItem}>
                    <Image
                      source={require("./assets/wind-icon.png")}
                      style={styles.gridIcon}
                    />
                    <View>
                      <Text style={styles.gridText}>Wind:</Text>
                      <Text style={styles.gridValue}>{current.wind_kph} kph</Text>
                    </View>
                  </View>

                  {/* UV Index */}
                  <View style={styles.gridItem}>
                    <Image
                      source={require("./assets/uv-icon.png")}
                      style={styles.gridIcon}
                    />
                    <View>
                      <Text style={styles.gridText}>UV Index:</Text>
                      <Text style={styles.gridValue}>{current.uv}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeCity(item.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    </>
  );
};

const lightThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#E3F2FD",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  greeting: {
    fontSize: 24,
    fontFamily: "ProductSans-Bold",
    color: "#1E3A5F",
  },
  astronomyIcon: {
    width: 40, // Adjust size of the moon/sun icon
    height: 40,
    marginLeft: 20, // Space between the text and the icon
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
    backgroundColor: "#BBDEFB",
    borderRadius: 25,
    padding: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 25,
    color: "#1E3A5F",
    fontFamily: "ProductSans-Regular",
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#1976D2",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 10,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontFamily: "ProductSans-Medium",
    fontSize: 16,
  },
  weatherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center", // Center content horizontally
    justifyContent: "center", // Center content vertically
  },
  city: {
    fontSize: 28,
    fontFamily: "ProductSans-Bold",
    color: "#1E3A5F",
    marginBottom: 5,
    textAlign: "center",
  },
  region: {
    fontSize: 16,
    fontFamily: "ProductSans-Regular",
    color: "#5C6B79",
    marginBottom: 20,
    textAlign: "center",
  },
  weatherIcon: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 10,
  },
  temp: {
    fontSize: 24,
    fontFamily: "ProductSans-Bold",
    color: "#0D47A1",
    textAlign: "center",
    marginBottom: 5,
  },
  condition: {
    fontSize: 16,
    fontFamily: "ProductSans-Regular",
    color: "#5C6B79",
    textAlign: "center",
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap", // Enable wrapping
    justifyContent: "space-evenly", // Adjust for even spacing across the grid
    alignItems: "center", // Center items vertically
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  gridItem: {
    flexDirection: "row", // Align icon and text horizontally
    alignItems: "center",
    justifyContent: "flex-start", // Align content within the grid item
    width: "45%", // Two items per row
    marginVertical: 10,
    marginHorizontal: 7,
  },
  gridIcon: {
    width: 43, // Proper icon size
    height: 43,
    marginRight: 8, // Increased spacing between icon and text
  },
  textContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  gridText: {
    fontSize: 15,
    fontFamily: "ProductSans-Medium",
    color: "#5C6B79",
  },
  gridValue: {
    fontSize: 18,
    fontFamily: "ProductSans-Bold",
    color: "#1E3A5F",
  },
  removeButton: {
    marginTop: 15,
    backgroundColor: "#BBDEFB",
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: "center",
    elevation: 2,
  },
  removeButtonText: {
    color: "#1E3A5F",
    fontFamily: "ProductSans-Medium",
    fontSize: 14,
  },
  splashScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
  },
  splashIcon: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  splashText: {
    fontSize: 36,
    fontFamily: "ProductSans-Bold",
    color: "#1E3A5F",
  },
});

const darkThemeStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#1E293B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  greeting: {
    fontSize: 24,
    fontFamily: "ProductSans-Bold",
    color: "#E2E8F0",
  },
  astronomyIcon: {
    width: 40, // Adjust size of the moon/sun icon
    height: 40,
    marginLeft: 20, // Space between the text and the icon
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
    backgroundColor: "#334155",
    borderRadius: 25,
    padding: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 25,
    color: "#E2E8F0",
    fontFamily: "ProductSans-Regular",
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#2563EB",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 10,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontFamily: "ProductSans-Medium",
    fontSize: 16,
  },
  weatherCard: {
    backgroundColor: "#334155",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    alignItems: "center", // Center content horizontally
    justifyContent: "center", // Center content vertically
  },
  city: {
    fontSize: 28,
    fontFamily: "ProductSans-Bold",
    color: "#E2E8F0",
    marginBottom: 5,
    textAlign: "center",
  },
  region: {
    fontSize: 16,
    fontFamily: "ProductSans-Regular",
    color: "#94A3B8",
    marginBottom: 20,
    textAlign: "center",
  },
  weatherIcon: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 10,
  },
  temp: {
    fontSize: 24,
    fontFamily: "ProductSans-Bold",
    color: "#3B82F6",
    textAlign: "center",
    marginBottom: 5,
  },
  condition: {
    fontSize: 16,
    fontFamily: "ProductSans-Regular",
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap", // Enable wrapping
    justifyContent: "space-evenly", // Adjust for even spacing across the grid
    alignItems: "center", // Center items vertically
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  gridItem: {
    flexDirection: "row", // Align icon and text horizontally
    alignItems: "center",
    justifyContent: "flex-start", // Align content within the grid item
    width: "45%", // Two items per row
    marginVertical: 11,
    marginHorizontal: 7,
  },
  gridIcon: {
    width: 43, // Proper icon size
    height: 43,
    marginRight: 8, // Increased spacing between icon and text
  },
  textContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  gridText: {
    fontSize: 15,
    fontFamily: "ProductSans-Medium",
    color: "#CBD5E1",
  },
  gridValue: {
    fontSize: 18,
    fontFamily: "ProductSans-Bold",
    color: "#E2E8F0",
  },
  removeButton: {
    marginTop: 15,
    backgroundColor: "#475569",
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  removeButtonText: {
    color: "#E2E8F0",
    fontFamily: "ProductSans-Medium",
    fontSize: 14,
  },
  splashScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E293B",
  },
  splashIcon: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  splashText: {
    fontSize: 36,
    fontFamily: "ProductSans-Bold",
    color: "#E2E8F0",
  },
});

export default App;