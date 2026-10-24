import { Select } from "@mantine/core";
import { useState } from "react";
import { useIntl } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";
import { LOCALES } from "../../i18n/locales";
import i18nUtil, { BRANDED_LANGUAGES } from "../../utils/i18n.util";

const LanguagePicker = () => {
  const t = useTranslate();
  const intl = useIntl();
  // Start from the language in use, so the picker isn't blank without a cookie.
  const [selectedLanguage, setSelectedLanguage] = useState(intl.locale);

  const languages = Object.values(LOCALES)
    .filter((locale) => BRANDED_LANGUAGES.includes(locale.code))
    .map((locale) => ({
      value: locale.code,
      label: locale.name,
    }));
  return (
    <Select
      value={selectedLanguage}
      description={t("account.card.language.description")}
      onChange={(value) => {
        setSelectedLanguage(value ?? "en-US");
        i18nUtil.setLanguageCookie(value ?? "en-US");
        location.reload();
      }}
      data={languages}
    />
  );
};

export default LanguagePicker;
