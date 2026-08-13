"use client";

import { WalletContextProvider } from "./WalletContextProvider";
import { PublishSheet } from "./PublishSheet";

interface PublishModalProps {
  onClose: () => void;
}

// Single default-exported entry point so this whole subtree (wallet
// adapter + UI) can be next/dynamic-imported with ssr:false and code-split
// away from the initial bundle, per spec §7 ("mounts only on Publish").
export default function PublishModal({ onClose }: PublishModalProps) {
  return (
    <WalletContextProvider>
      <PublishSheet onClose={onClose} />
    </WalletContextProvider>
  );
}
