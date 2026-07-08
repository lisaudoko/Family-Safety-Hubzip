// Test-only environment bootstrap. src/lib/stripe.ts throws at import time if
// STRIPE_SECRET_KEY is unset (it's required so src/app.ts can mount the
// billing router), but none of these tests exercise billing/Stripe behavior,
// so a syntactically-valid dummy test-mode key is enough to let the app
// import cleanly without making any real Stripe network calls.
process.env.STRIPE_SECRET_KEY ??= 'sk_test_dummy_key_for_tests_00000000000000000000';
process.env.MOBILE_APP_SCHEME ??= 'mobile';
// Ensure the email module takes its no-op console-log branch instead of
// trying to open a real SMTP connection.
delete process.env.SMTP_HOST;
