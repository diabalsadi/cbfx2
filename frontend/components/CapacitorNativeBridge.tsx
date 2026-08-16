"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

// No-op on the web (Capacitor.isNativePlatform() is false there) — this only
// wires up Android's hardware back button when running inside the Capacitor
// shell, so it navigates the app instead of the OS default (exit/no-op).
export default function CapacitorNativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      listenerPromise.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
