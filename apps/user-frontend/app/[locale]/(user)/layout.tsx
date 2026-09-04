import UserNav from "@/components/UserNav";
import LoginModal from "@/components/LoginModal";
import { LoginModalProvider } from "@/contexts/LoginModalContext";
import styles from "./user.module.scss";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LoginModalProvider>
      <UserNav />
      <div className={styles.main}>{children}</div>
      <footer className={styles.footer}>© 2026 CBFX — Trade smarter.</footer>
      <LoginModal />
    </LoginModalProvider>
  );
}
