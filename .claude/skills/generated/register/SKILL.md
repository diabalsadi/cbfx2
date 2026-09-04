---
name: register
description: "Skill for the Register area of cbfx2. 9 symbols across 3 files."
---

# Register

9 symbols | 3 files | Cohesion: 89%

## When to Use

- Working with code in `frontend/`
- Understanding how useSigninBanner, UserLoginPage, RegisterPage work
- Modifying register-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/(auth)/register/RegisterClient.tsx` | LogoIcon, newAccountDraft, RegisterPage, updateAccount, addAccount (+1) |
| `frontend/app/(auth)/login/LoginClient.tsx` | LogoIcon, UserLoginPage |
| `frontend/helpers/useSigninBanner.ts` | useSigninBanner |

## Entry Points

Start here when exploring this area:

- **`useSigninBanner`** (Function) — `frontend/helpers/useSigninBanner.ts:7`
- **`UserLoginPage`** (Function) — `frontend/app/(auth)/login/LoginClient.tsx:25`
- **`RegisterPage`** (Function) — `frontend/app/(auth)/register/RegisterClient.tsx:38`
- **`updateAccount`** (Function) — `frontend/app/(auth)/register/RegisterClient.tsx:68`
- **`addAccount`** (Function) — `frontend/app/(auth)/register/RegisterClient.tsx:72`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `useSigninBanner` | Function | `frontend/helpers/useSigninBanner.ts` | 7 |
| `UserLoginPage` | Function | `frontend/app/(auth)/login/LoginClient.tsx` | 25 |
| `RegisterPage` | Function | `frontend/app/(auth)/register/RegisterClient.tsx` | 38 |
| `updateAccount` | Function | `frontend/app/(auth)/register/RegisterClient.tsx` | 68 |
| `addAccount` | Function | `frontend/app/(auth)/register/RegisterClient.tsx` | 72 |
| `removeAccount` | Function | `frontend/app/(auth)/register/RegisterClient.tsx` | 76 |
| `LogoIcon` | Function | `frontend/app/(auth)/login/LoginClient.tsx` | 9 |
| `LogoIcon` | Function | `frontend/app/(auth)/register/RegisterClient.tsx` | 10 |
| `newAccountDraft` | Function | `frontend/app/(auth)/register/RegisterClient.tsx` | 33 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Overview | 2 calls |

## How to Explore

1. `context({name: "useSigninBanner"})` — see callers and callees
2. `query({search_query: "register"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
