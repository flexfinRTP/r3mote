import React from "react";
import type { RemoteKey } from "@/adapters";
import { RemoteButton } from "./RemoteButton";

type Props = {
  onKey: (key: RemoteKey) => void;
};

export const PowerButton: React.FC<Props> = ({ onKey }) => {
  return (
    <RemoteButton label="⏻" onPress={() => onKey("power")} variant="accent" />
  );
};
