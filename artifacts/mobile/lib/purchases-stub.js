// Stand-in for react-native-purchases when running in Expo Go on Replit, where
// RevenueCat's native code is unavailable. metro.config.js swaps it in; real
// iOS/Android builds use the actual SDK. Subscriptions show as unavailable.
const unavailable = () => Promise.reject(new Error("Purchases are unavailable in Expo Go"));

const Purchases = {
  LOG_LEVEL: { DEBUG: "DEBUG" },
  setLogLevel: () => {},
  configure: () => {},
  getCustomerInfo: () => Promise.resolve({ entitlements: { active: {} } }),
  getOfferings: () => Promise.resolve({ current: null, all: {} }),
  purchasePackage: unavailable,
  restorePurchases: unavailable,
};

module.exports = Purchases;
module.exports.default = Purchases;
