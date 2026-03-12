import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { useTVContext } from "@/context/TVContext";

export const useHaptics = () => {
  const { settings } = useTVContext();

  const tap = useCallback(async () => {
    if (!settings.hapticFeedback) {
      return;
    }
    await Haptics.selectionAsync();
  }, [settings.hapticFeedback]);

  const success = useCallback(async () => {
    if (!settings.hapticFeedback) {
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [settings.hapticFeedback]);

  const error = useCallback(async () => {
    if (!settings.hapticFeedback) {
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [settings.hapticFeedback]);

  return {
    tap,
    success,
    error
  };
};
