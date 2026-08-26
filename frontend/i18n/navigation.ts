import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware replacements for next/link and next/navigation — Link/
// redirect/usePathname/useRouter all automatically add/strip the locale
// segment, so call sites never hardcode it. Use these instead of the plain
// next/* versions anywhere a route is built or the current path is read.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
