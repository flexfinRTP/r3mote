import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { useTVContext } from "@/context/TVContext";

export const useHaptics = () => {
  const { settings } = useTVContext();

  const tap = useCallback(async () => {
    if (!settings.hapticFeedback) {
      return;
    }
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignore haptics failures on unsupported devices/runtimes.
    }
  }, [settings.hapticFeedback]);

  const success = useCallback(async () => {
    if (!settings.hapticFeedback) {
      return;
    }
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore haptics failures on unsupported devices/runtimes.
    }
  }, [settings.hapticFeedback]);

  const error = useCallback(async () => {
    if (!settings.hapticFeedback) {
      return;
    }
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Ignore haptics failures on unsupported devices/runtimes.
    }
  }, [settings.hapticFeedback]);

  return {
    tap,
    success,
    error
  };
};
