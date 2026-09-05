---
name: form
description: "Skill for the Form area of cbfx2. 5 symbols across 1 files."
---

# Form

5 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `frontend/`
- Understanding how SubmitButton, Form, handleFileChange work
- Modifying form-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/components/Form/index.tsx` | SubmitButton, Form, handleFileChange, handleRemove, renderField |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `SubmitButton` | Function | `frontend/components/Form/index.tsx` | 23 |
| `Form` | Function | `frontend/components/Form/index.tsx` | 32 |
| `handleFileChange` | Function | `frontend/components/Form/index.tsx` | 38 |
| `handleRemove` | Function | `frontend/components/Form/index.tsx` | 49 |
| `renderField` | Function | `frontend/components/Form/index.tsx` | 56 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Form → HandleFileChange` | intra_community | 3 |
| `Form → HandleRemove` | intra_community | 3 |

## How to Explore

1. `context({name: "SubmitButton"})` — see callers and callees
2. `query({search_query: "form"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
