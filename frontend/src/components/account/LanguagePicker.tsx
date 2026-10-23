import { Select } from "@mantine/core";
import { getCookie } from "cookies-next";
import { useState } from "react";
import useTranslate from "../../hooks/useTranslate.hook";
import { LOCALES } from "../../i18n/locales";
import i18nUtil, { LANGUAGE_COOKIE } from "../../utils/i18n.util";

const LanguagePicker = () => {
  const t = useTranslate();
  const [selectedLanguage, setSelectedLanguage] = useState(
    getCookie(LANGUAGE_COOKIE)?.toString(),
  );

  const languages = Object.values(LOCALES).map((locale) => ({
    value: locale.code,
    label: locale.name,
  }));
  return (
    <Select
      value={selectedLanguage}
      description={t("account.card.language.description")}
      onChange={(value) => {
        setSelectedLanguage(value ?? "en");
        i18nUtil.setLanguageCookie(value ?? "en");
        location.reload();
      }}
      data={languages}
    />
  );
};

export default LanguagePicker;
