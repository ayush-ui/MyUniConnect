# Mobile Architecture

React Native / Expo app for MyUniConnect. This document is the single source of truth for mobile conventions, layer rules, and quality standards. Every mobile story must follow it. Deviations require an explicit decision recorded here.

---

## Guiding Principles

- **Screens are dumb.** A screen file renders layout and delegates all logic to hooks or context. No business logic, no API calls, no token reads inside a screen component.
- **One source of truth.** Auth state lives in `AuthContext`. Feature state lives as close to the leaf as possible. We do not promote state upward until a concrete need forces it.
- **Trust the API contract.** Client-side validation mirrors the API's rules (not invents new ones). Error codes from `ApiError.code` drive UI decisions — never parse `message` strings.
- **No premature abstraction.** A hook shared by one screen is local to that screen. A component used once is not extracted. Extract when duplication is real, not anticipated.
- **No external state library** until proven necessary. Adding Redux, Zustand, or Jotai requires a documented reason — a specific cross-feature problem that Context cannot solve cleanly.

---

## Directory Structure

```
apps/mobile/
├── app/                       # expo-router file-based routing
│   ├── _layout.tsx            # Root layout: fonts, SafeAreaProvider, AuthProvider
│   ├── index.tsx              # Auth gate: loading spinner → redirect
│   ├── (auth)/                # Unauthenticated route group
│   │   ├── _layout.tsx        # Stack navigator, no header
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── check-email.tsx
│   └── (tabs)/                # Authenticated route group
│       ├── _layout.tsx        # Auth guard + tab navigator
│       └── index.tsx          # Home tab
├── components/
│   └── ui/                    # Primitive, stateless UI components only
├── context/
│   └── AuthContext.tsx        # Global auth state + actions
├── hooks/                     # Feature-scoped hooks (one per feature, co-located near screen)
├── lib/
│   ├── api/
│   │   ├── client.ts          # Base fetch — DO NOT call directly from screens
│   │   └── auth.ts            # Typed auth endpoint methods
│   └── auth/
│       └── storage.ts         # expo-secure-store abstraction
└── docs/
    └── MOBILE_ARCHITECTURE.md # This file
```

---

## Layer Rules

| Layer | Files | Allowed to depend on | Must NOT depend on |
|-------|-------|---------------------|---------------------|
| Screen | `app/**/*.tsx` | Context, hooks, `components/ui/`, expo-router | `lib/api/*` directly, `lib/auth/storage` directly |
| Context | `context/*.tsx` | `lib/api/*`, `lib/auth/*` | Screens, expo-router navigation |
| Hook | `hooks/*.ts` | `lib/api/*`, `lib/auth/*`, Context | Screens |
| API layer | `lib/api/*.ts` | `lib/auth/storage.ts` | Context, hooks, screens |
| Storage | `lib/auth/storage.ts` | `expo-secure-store` only | Everything else |
| UI component | `components/ui/*.tsx` | React Native primitives, NativeWind | Context, API layer, hooks |

**The critical rule:** a screen never imports from `lib/api/` or `lib/auth/`. All data fetching and token handling goes through context or a feature hook. This keeps screens trivially testable and prevents business logic from leaking into layout code.

---

## Screen Rules

A screen file is responsible for:
1. Rendering layout using `components/ui/` primitives and NativeWind classes
2. Calling one or two hooks/context methods to get state and actions
3. Handling navigation (`useRouter`) in response to action outcomes
4. Mapping hook state to inline error display

A screen file is **not** responsible for:
- Validation logic beyond what NativeWind/UI needs (validation lives in a hook or util)
- API error code interpretation (the hook/context maps codes to user-facing strings)
- Token storage or auth state mutation
- Data transformation

If a screen has more than ~150 lines, it likely contains logic that belongs in a hook.

---

## Hook Rules

Hooks in `hooks/` are feature-scoped. The rule for where to put them:

| Scope | Where |
|-------|-------|
| Used by one screen only | Local to the screen file (if small) or in `hooks/use-<feature>.ts` |
| Used by 2+ screens in the same route group | `hooks/use-<feature>.ts` |
| Used across route groups | Promote to Context |

A hook must:
- Return a stable interface (typed return object, not a tuple)
- Handle its own loading and error state
- Never reach into `lib/auth/storage` directly — go through `AuthContext` for token access

---

## API Layer Rules

Every backend endpoint has exactly one typed function in `lib/api/<feature>.ts`. Rules:

- Functions accept typed payload objects, return typed result objects
- `apiFetchRaw` is used when the caller needs response headers (e.g., to parse `Set-Cookie`)
- `apiFetch` is used otherwise
- Functions throw `ApiError` on non-2xx responses — they do not catch or swallow errors
- No retry logic in the API layer — that is the caller's responsibility
- No UI-specific error strings — only pass through `code` and `message` from the API

### Error handling pattern

```typescript
try {
  const result = await someApiCall();
  // handle success
} catch (err) {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'SPECIFIC_CODE': // map to UI state
      default: setServerError(err.message);
    }
  } else {
    setServerError('Something went wrong. Please try again.');
  }
}
```

Always check `err instanceof ApiError` before reading `.code`. An unknown error (network failure, JSON parse error) must not crash the UI.

---

## AuthContext Contract

`AuthContext` is the single source of auth truth. It exposes:

```typescript
interface AuthState {
  user: MeResult | null;
  accessToken: string | null;
  isLoading: boolean;     // true only during the initial session restore
  isAuthenticated: boolean;
}

interface AuthActions {
  login(email: string, password: string): Promise<void>;  // throws ApiError on failure
  logout(): Promise<void>;
  clearSession(): void;   // clears state without a server call
}
```

Rules:
- `login()` **throws** on failure. The calling screen catches and maps errors.
- `logout()` **never throws** — it always clears local state even if the server revoke call fails.
- `accessToken` must not be read by screens directly; it is used inside the API layer only.
- `isLoading = true` only during the initial cold-start session restore. It is never set to true again after that — individual screen actions track their own loading state.

---

## Component Rules

Components in `components/ui/` must be:

- **Stateless or locally-stateful only** (e.g., a focused border state for an input)
- **Agnostic** — no business logic, no direct API calls, no AuthContext reads
- **Styled exclusively with NativeWind** using design tokens from `tailwind.config.js`

Do not build a `components/features/` directory speculatively. Feature-specific composed components live near their screen until they're needed in a second place.

### Primitive components available

| Component | Props | Notes |
|-----------|-------|-------|
| `Button` | `label`, `loading?`, standard TouchableOpacity props | Shows ActivityIndicator when `loading=true` |
| `FormField` | `label`, `error?`, `rightElement?`, standard TextInput props | Handles focus border, error text |

New primitives must be genuinely reusable across at least two screens before being added here.

---

## Styling Rules

- **All styling via NativeWind** — no `StyleSheet.create`, no inline `style` props except for dynamic values that NativeWind cannot express
- **Use design tokens** from `tailwind.config.js` — never hardcode colors (e.g., use `text-primary-400`, not `text-[#2e5559]`)
- **Spacing scale**: use Tailwind's default `px-6`, `pt-8`, `gap-4` etc. Do not invent new fixed pixel values
- **Font classes**: `font-jakarta` (400 Regular), `font-jakarta-medium` (500 Medium) — these are the only loaded fonts

Current design tokens:

```js
primary:  { 400: '#2e5559' }
neutral:  { 50: '#faf8f5', 200: '#dcd4c8', 400: '#a89f8e', 600: '#756c5c', 800: '#4a4338', 900: '#28241d' }
```

---

## Navigation Rules

- **expo-router file-based routing** — route groups `(auth)` and `(tabs)` control auth gating
- The auth guard lives in `app/(tabs)/_layout.tsx`. It reads `useAuth().isAuthenticated` and redirects to `/(auth)/login` if false
- Screens **navigate on action outcome** (`router.replace` after successful login), not based on auth state watching
- `router.replace` (not `router.push`) is used for auth transitions so the user cannot back-navigate to a pre-auth screen
- Never navigate from inside a context or hook — return a value/throw an error, let the screen navigate

---

## Testing Strategy

### What we test (mobile)

| What | Tool | Where |
|------|------|-------|
| Pure utility functions (e.g., cookie parser, validators) | Jest | `*.spec.ts` next to the file |
| Custom hooks with non-trivial state machines | Jest + `@testing-library/react-hooks` | `hooks/*.spec.ts` |
| AuthContext — session restore, token refresh, error paths | Jest + mock API | `context/AuthContext.spec.tsx` |
| API layer functions — request shape, error parsing | Jest + `msw` (mock service worker) | `lib/api/*.spec.ts` |

### What we do NOT test on mobile

- Screen rendering/layout — NativeWind class names and JSX structure are not worth snapshotting
- Navigation outcomes — expo-router's own test suite covers file-based routing
- `expo-secure-store` calls — we test the storage abstraction, not the underlying native module

### TDD flow for mobile

1. Write `*.spec.ts` with the expected behavior (input → output for utilities; state transitions for hooks)
2. Run `pnpm --filter mobile test -- --watch`
3. Implement until tests pass
4. No screen ships without its hook tested if the hook contains conditional logic

### Test file placement

Tests live next to the code they test:
```
lib/api/auth.ts           → lib/api/auth.spec.ts
lib/api/marketplace.ts    → lib/api/marketplace.spec.ts
lib/auth/storage.ts       → lib/auth/storage.spec.ts
context/AuthContext.tsx   → context/AuthContext.spec.tsx
hooks/useMarketplace.ts   → hooks/useMarketplace.spec.ts
```

### Test setup

- **Preset**: `jest-expo` with `transformIgnorePatterns` configured for RN/Expo packages
- **expo-secure-store mock**: `__mocks__/expo-secure-store.ts` — in-memory store; call `__resetStore()` in `beforeEach`
- **API layer mocks**: mock `./client` using `jest.requireActual` + override `apiFetch`/`apiFetchRaw` with `jest.fn()` — do NOT use MSW (its deps are ESM-only and incompatible with Jest CJS mode)
- **AuthContext mocks**: mock `../lib/api/auth` module; use `@testing-library/react-native`'s `renderHook`

```
# Run all tests
pnpm --filter mobile test

# Watch mode
pnpm --filter mobile test:watch
```

---

## Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `EXPO_PUBLIC_API_URL` | Yes (device testing) | `http://192.168.1.10:3001` | Full URL with protocol and port. Use LAN IP, not `localhost`, when testing on a physical device or simulator with a separate host |

Set in `apps/mobile/.env.local` (gitignored). Default in `lib/api/client.ts` is `http://localhost:3001` (works for Expo web and iOS simulator on the same machine).

---

## Known Constraints & Decisions

| # | Decision | Reason |
|---|----------|--------|
| D-M01 | Refresh token stored in `expo-secure-store`, not in a cookie | RN's `fetch` does not automatically manage cookies. We parse `Set-Cookie` headers manually after login/refresh. |
| D-M02 | Auto-refresh fires 2 minutes before the 15-minute access token expiry | Avoids a race condition where the token expires mid-request. The 2-minute window is generous for slow networks. |
| D-M03 | `logout()` calls the server but never throws | If the server is unreachable, we still clear local state. The old refresh token will expire naturally (7 days). |
| D-M04 | No deep link handler for email verification yet | `StubEmailService` logs to console in dev — no real email is sent. Deep link will be added when a real email service is wired (DEBT-006). |
| D-M05 | No loading state in `AuthContext.isLoading` after initial restore | Screens own their own loading state. The global flag is only for the cold-start check to avoid a flash of the login screen. |
