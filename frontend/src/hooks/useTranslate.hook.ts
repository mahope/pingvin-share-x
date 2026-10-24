import { getCookie } from "cookies-next";
import { createIntl, createIntlCache, useIntl } from "react-intl";
import i18nUtil, {
  BRANDED_LANGUAGES,
  LANGUAGE_COOKIE,
} from "../utils/i18n.util";

const useTranslate = () => {
  const intl = useIntl();
  return (
    id: string,
    values?: Parameters<typeof intl.formatMessage>[1],
    opts?: Parameters<typeof intl.formatMessage>[2],
  ) => {
    const result = intl.formatMessage({ id }, values, opts);
    return typeof result === "string" ? result : String(result);
  };
};

const cache = createIntlCache();

export const translateOutsideContext = () => {
  const cookieLanguage = getCookie(LANGUAGE_COOKIE)?.toString();
  const locale =
    cookieLanguage && BRANDED_LANGUAGES.includes(cookieLanguage)
      ? cookieLanguage
      : i18nUtil.getBrandedLanguage(navigator.languages);

  const intl = createIntl(
    {
      locale,
      messages: i18nUtil.getLocaleByCode(locale)?.messages,
      defaultLocale: "en",
    },
    cache,
  );
  return (
    id: string,
    values?: Parameters<typeof intl.formatMessage>[1],
    opts?: Parameters<typeof intl.formatMessage>[2],
  ) => {
    const result = intl.formatMessage({ id }, values, opts);
    return typeof result === "string" ? result : String(result);
  };
};

export default useTranslate;
