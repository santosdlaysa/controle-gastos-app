import { useThemeContext } from "@/lib/theme-provider";

/**
 * On web we follow the in-app ThemeProvider (same as native) so the chosen
 * theme is consistent across platforms instead of following the OS scheme.
 */
export function useColorScheme() {
  return useThemeContext().colorScheme;
}
