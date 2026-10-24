# Issue drafts for smp46/pingvin-share-x

Found while running the fork on filer.mahoje.dk (Oct 2026). Checked against upstream `main`
at e10d4b6. Upstream's AI_USAGE_POLICY requires PRs and PR descriptions to be written by a
human, so these are issue drafts only: edit them in your own words before posting, and say
which AI tools helped (the policy asks for that disclosure).

---

## Issue 1: Browser language is never used because `general.defaultLanguage` always wins

**Subject of the issue**

In #43 the intended behaviour was described as "unless set in the user's profile, the
language is inherited from the browser", with a system-wide default added later. In
practice the browser language is never used:

- `frontend/src/pages/_app.tsx` resolves `cookies["language"] || defaultLanguage || requestLanguage`.
  `general.defaultLanguage` has a default value (`en-US`), so it is always truthy and
  `requestLanguage` (from `Accept-Language`) is unreachable.
- On the first visit the client stores the resolved language in the `language` cookie for a
  year (`setLanguageCookie` in `_app.tsx`). If the default was used, visitors stay pinned to it
  even after the default changes.
- The backend's `SystemLanguageResolver` only returns `general.defaultLanguage`, so API error
  messages are also always in the default language.

**Steps to reproduce**

1. Set `general.defaultLanguage` to `da-DK`.
2. Open the instance in a clean browser with `Accept-Language: it-IT,it;q=0.9,en;q=0.8`.
3. The UI is Danish, not Italian/English. A wrong-password login returns the Danish error message.

**Expected behaviour**

Cookie (explicit user choice) → browser language if supported → `general.defaultLanguage`.
Optionally only set the cookie when the user actually picks a language, so the automatic
choice isn't frozen.

**Why it matters**

On a reverse-share upload page an external uploader sees the admin's language. In our case an
Italian client read the Danish "Del" (share) button as "delete" and never uploaded.

---

## Issue 2: Small i18n bugs (toast language, empty language picker, missing `lang`)

1. `translateOutsideContext` in `frontend/src/hooks/useTranslate.hook.ts` falls back to
   `navigator.language.split("-")[0]`, e.g. `da`. Locale codes are `da-DK`, so
   `getLocaleByCode("da")` returns English: toasts shown outside React context are English
   for a Danish browser when no cookie is set.
2. `LanguagePicker` (`frontend/src/components/account/LanguagePicker.tsx`) initialises from the
   `language` cookie only, so the select is empty when no cookie exists. Initialising from the
   active locale (`useIntl().locale`) would fix it.
3. `frontend/src/pages/_document.tsx` renders `<Html>` without a `lang` attribute. Screen readers
   and the browser's translate prompt then guess the language. `pageProps.language` is
   available in `this.props.__NEXT_DATA__` and could be used for `lang`.

---

Not reported upstream (fork-specific): restricting languages to da/en, the header language
toggle, the Mahoje branding, Plausible tracking. The unused `User` import lint error is
already fixed on upstream `main`.
