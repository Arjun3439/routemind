import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSignIn, useOAuth, useAuth } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";

import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  useWarmUpBrowser();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({ strategy: "oauth_apple" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.includes("@")) newErrors.email = "Enter a valid email";
    if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (isSignedIn) {
      router.replace("/(tabs)");
      return;
    }
    if (!isLoaded || !validate()) return;
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage || "Sign in failed. Please try again.";
      Alert.alert("Sign In Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (strategy: "oauth_google" | "oauth_apple") => {
    if (isSignedIn) {
      router.replace("/(tabs)");
      return;
    }
    try {
      setLoading(true);
      const redirectUrl = Linking.createURL("/");
      const startOAuthFlow = strategy === "oauth_google" ? startGoogleOAuthFlow : startAppleOAuthFlow;
      const { createdSessionId, signIn: oauthSignIn, signUp: oauthSignUp, setActive: oauthSetActive } = await startOAuthFlow({
        redirectUrl,
      });

      // Happy path: session was created directly
      if (createdSessionId && oauthSetActive) {
        await oauthSetActive({ session: createdSessionId });
        router.replace("/(tabs)");
        return;
      }

      // Transfer flow: Google auth succeeded but user needs to be
      // transferred between signIn <-> signUp
      if (oauthSignIn?.firstFactorVerification?.status === "transferable" && oauthSignUp && oauthSetActive) {
        console.log("Transferable sign-in detected, creating sign-up with transfer...");
        const result = await oauthSignUp.create({ transfer: true });
        if (result.status === "complete" && result.createdSessionId) {
          await oauthSetActive({ session: result.createdSessionId });
          router.replace("/(tabs)");
          return;
        }
      }

      if (oauthSignUp?.verifications?.externalAccount?.status === "transferable" && oauthSignIn && oauthSetActive) {
        console.log("Transferable sign-up detected, creating sign-in with transfer...");
        const result = await oauthSignIn.create({ transfer: true });
        if (result.status === "complete" && result.createdSessionId) {
          await oauthSetActive({ session: result.createdSessionId });
          router.replace("/(tabs)");
          return;
        }
      }

      console.log("OAuth incomplete. signUp status:", oauthSignUp?._status, "missingFields:", oauthSignUp?.missingFields);
      Alert.alert(
        "Authentication Incomplete",
        "Could not complete sign in. Please check your Clerk dashboard settings (phone number may be set as required)."
      );
    } catch (err: any) {
      console.error("OAuth error:", err);
      if (err?.message?.includes("already signed in") || err?.toString()?.includes("already signed in")) {
        router.replace("/(tabs)");
        return;
      }
      Alert.alert("Authentication Failed", err?.message || "Could not complete social sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#020617", "#0F172A", "#1E1B4B"]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🗺</Text>
            </View>
            <Text style={styles.logoText}>RouteMind</Text>
            <Text style={styles.tagline}>Why search for experiences{"\n"}when they can find you?</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to continue your journey</Text>

            {/* Social Auth */}
            <View style={styles.socialAuthContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleOAuth("oauth_google")}
                disabled={loading}
              >
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleOAuth("oauth_apple")}
                disabled={loading}
              >
                <Text style={styles.socialIcon}></Text>
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors(p => ({ ...p, email: undefined })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, errors.password ? styles.inputError : null]}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors(p => ({ ...p, password: undefined })); }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁"}</Text>
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Sign In →</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity style={styles.linkButton}>
                <Text style={styles.linkText}>
                  Don't have an account?{" "}
                  <Text style={styles.linkHighlight}>Create one</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            By signing in, you agree to our Terms & Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: SPACING["2xl"],
    paddingTop: SPACING["5xl"],
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: SPACING["3xl"],
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: "rgba(37,99,235,0.2)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.base,
  },
  logoEmoji: { fontSize: 36 },
  logoText: {
    fontSize: FONT_SIZE["3xl"],
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: SPACING["2xl"],
  },
  cardTitle: {
    fontSize: FONT_SIZE["2xl"],
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  socialAuthContainer: {
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  socialIcon: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginRight: SPACING.sm,
  },
  socialButtonText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  inputGroup: { marginBottom: SPACING.base },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: SPACING.base,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
  },
  inputError: { borderColor: COLORS.error },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: SPACING.base,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
  },
  eyeButton: {
    position: "absolute",
    right: SPACING.base,
    padding: SPACING.xs,
  },
  eyeIcon: { fontSize: 18 },
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  button: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginTop: SPACING.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: {
    paddingVertical: SPACING.base,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonText: {
    color: "#fff",
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginHorizontal: SPACING.md,
  },
  linkButton: { alignItems: "center" },
  linkText: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  linkHighlight: { color: COLORS.secondary, fontWeight: "600" },
  footer: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xl,
  },
});
