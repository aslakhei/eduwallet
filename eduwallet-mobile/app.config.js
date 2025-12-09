// Optional: import dotenv if using .env files directly
// import 'dotenv/config';

export default {
  expo: {
    name: "eduwallet-mobile",
    slug: "eduwallet-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "eduwalletmobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      // RPC URL for blockchain connection
      // For iOS/Android: Use your local machine's IP address (e.g., "http://192.168.1.100:8545")
      // For web: Use "http://127.0.0.1:8545" or leave as is
      // You can override this with an environment variable: RPC_URL=http://YOUR_IP:8545
      rpcUrl: process.env.RPC_URL || "http://192.168.1.10:8545",
    }
  }
};

