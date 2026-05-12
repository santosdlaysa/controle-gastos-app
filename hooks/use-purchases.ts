import { useCallback, useEffect, useState } from "react";
import Purchases, { LOG_LEVEL, PurchasesPackage } from "react-native-purchases";
import { Platform, Alert } from "react-native";

const REVENUECAT_API_KEY =
  Platform.OS === "ios"
    ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "")
    : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "");
const ENTITLEMENT_ID = "premium";

let initialized = false;

export function initPurchases(userId?: string) {
  if (initialized) return;
  if (Platform.OS === "web" || !REVENUECAT_API_KEY) return;

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    if (userId) {
      Purchases.logIn(userId).catch(() => {});
    }
    initialized = true;
  } catch (e) {
    console.warn("RevenueCat init failed:", e);
  }
}

export function usePurchases() {
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const checkPremium = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      const active = info.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!active);
    } catch {
      setIsPremium(false);
    }
  }, []);

  const loadOfferings = useCallback(async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const pkgs = offerings.current?.availablePackages ?? [];
      setPackages(pkgs);
    } catch {
      setPackages([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([checkPremium(), loadOfferings()]).finally(() => setLoading(false));
  }, [checkPremium, loadOfferings]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!active);
      if (active) {
        Alert.alert("Sucesso!", "Assinatura ativada! Anúncios removidos. Obrigado pelo apoio!");
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Erro", "Não foi possível concluir a compra. Tente novamente.");
      }
    } finally {
      setPurchasing(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setPurchasing(true);
    try {
      const info = await Purchases.restorePurchases();
      const active = info.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!active);
      if (active) {
        Alert.alert("Assinatura restaurada!", "Seus anúncios foram removidos.");
      } else {
        Alert.alert("Nenhuma compra encontrada", "Não encontramos nenhuma compra anterior.");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível restaurar. Tente novamente.");
    } finally {
      setPurchasing(false);
    }
  }, []);

  return { isPremium, packages, loading, purchasing, purchase, restore, checkPremium };
}
