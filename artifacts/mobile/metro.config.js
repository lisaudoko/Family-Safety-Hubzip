const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Expo Go on Replit can't load RevenueCat's native module, which breaks bundling.
// Swap in a stub there; EAS/local native builds don't set REPL_ID and use the real SDK.
if (process.env.REPL_ID) {
  const upstreamResolve = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "react-native-purchases") {
      return { type: "sourceFile", filePath: path.resolve(__dirname, "lib/purchases-stub.js") };
    }
    return (upstreamResolve ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
