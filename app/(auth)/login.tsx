import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { F, T } from "../../constants/theme";
import { getStoredFCMToken, isReadyForRegistration, setUserId } from "../../services/fcmTokenManager";
import { mockApi } from "../../services/mockApi";
import { setCurrentUser } from "../../services/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && password.length > 0 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const userEmail = email.trim().toLowerCase();
    try {
      const user = await mockApi.login(userEmail, password);
      setCurrentUser(user);
      setUserId(userEmail);
      const token = getStoredFCMToken();
      if (token && isReadyForRegistration()) {
        mockApi.registerDeviceToken(userEmail, token).catch((e) => console.log("Device token registration failed:", e));
      }
      router.replace("/(dashboard)");
    } catch (e) {
      setError(typeof e === "string" && !/server error/i.test(e) ? e : "Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={T.brand} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 36 }]}>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name="shield-check-outline" size={14} color={T.white} />
            <Text style={styles.heroBadgeText}>Approver console</Text>
          </View>
          <Text style={styles.heroTitle}>Review and approve{"\n"}billing changes</Text>
          <Text style={styles.heroSub}>Refunds, plan changes and cancellations from your customers, in one place.</Text>
        </View>

        <View style={styles.card}>
          <Image source={require("../../assets/images/kloudlenz_white_logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.cardTitle}>Sign in</Text>
          <Text style={styles.cardSub}>Use your Estuate enterprise account</Text>

          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputRow, focused === "email" && styles.inputFocused]}>
            <MaterialCommunityIcons name="email-outline" size={19} color={focused === "email" ? T.brand : T.text3} />
            <TextInput
              style={styles.input}
              placeholder="name@company.com"
              placeholderTextColor={T.text3}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!loading}
              returnKeyType="next"
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
            />
          </View>
          {email.length > 3 && !emailValid && focused !== "email" && (
            <Text style={styles.fieldError}>Enter a valid email address</Text>
          )}

          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputRow, focused === "password" && styles.inputFocused]}>
            <MaterialCommunityIcons name="lock-outline" size={19} color={focused === "password" ? T.brand : T.text3} />
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={T.text3}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
              returnKeyType="go"
              onSubmitEditing={submit}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
            />
            <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10} accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
              <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color={T.text3} />
            </Pressable>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={T.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.button, !canSubmit && styles.buttonDisabled, pressed && canSubmit && styles.buttonPressed]}
            onPress={submit}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color={T.white} />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign in</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color={T.white} />
              </>
            )}
          </Pressable>
        </View>

        <Text style={[styles.footer, { marginBottom: insets.bottom + 20 }]}>KloudLenz · by Estuate</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.pageBg },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: T.brand,
    paddingHorizontal: 24,
    paddingBottom: 84,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: T.pillRadius,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: { fontFamily: F.semibold, fontSize: 11.5, color: T.white, letterSpacing: 0.3 },
  heroTitle: { fontFamily: F.bold, fontSize: 27, lineHeight: 34, color: T.white, marginTop: 18 },
  heroSub: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.82)", marginTop: 10 },
  card: {
    backgroundColor: T.surface,
    marginHorizontal: 16,
    marginTop: -56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 22,
    shadowColor: "#101828",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  logo: { width: 150, height: 34, marginBottom: 18 },
  cardTitle: { fontFamily: F.bold, fontSize: 20, color: T.text },
  cardSub: { fontFamily: F.regular, fontSize: 13, color: T.text2, marginTop: 4, marginBottom: 8 },
  label: { fontFamily: F.semibold, fontSize: 12, color: T.text2, marginTop: 14, marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fafbfc",
  },
  inputFocused: { borderColor: T.brand, backgroundColor: T.surface },
  input: { flex: 1, height: "100%", fontFamily: F.regular, fontSize: 15, color: T.text },
  fieldError: { fontFamily: F.regular, fontSize: 12, color: T.red, marginTop: 6 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.redBg,
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  errorText: { flex: 1, fontFamily: F.medium, fontSize: 13, color: T.red },
  button: {
    flexDirection: "row",
    gap: 8,
    height: 52,
    borderRadius: 12,
    backgroundColor: T.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  buttonPressed: { backgroundColor: T.brandHover },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontFamily: F.semibold, fontSize: 16, color: T.white },
  footer: { fontFamily: F.medium, fontSize: 12, color: T.text3, textAlign: "center", marginTop: 24 },
});
