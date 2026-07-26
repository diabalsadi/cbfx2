"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface LoginModalCtx {
  isOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const LoginModalContext = createContext<LoginModalCtx>({
  isOpen: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
});

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <LoginModalContext.Provider
      value={{
        isOpen,
        openLoginModal: () => setIsOpen(true),
        closeLoginModal: () => setIsOpen(false),
      }}
    >
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  return useContext(LoginModalContext);
}
