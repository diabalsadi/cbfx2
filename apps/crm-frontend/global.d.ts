import type { Locale } from "@/i18n/routing";
import type messages from "@/messages/en.json";

// Gives useTranslations()/getTranslations() compile-time checking against
// the actual message catalog shape (en.json is the source of truth — every
// other locale file must match its keys) and types useLocale()'s return as
// our Locale union instead of a bare string.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
