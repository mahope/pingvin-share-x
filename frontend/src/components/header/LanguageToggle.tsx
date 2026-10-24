import { UnstyledButton } from "@mantine/core";
import { useIntl } from "react-intl";
import i18nUtil from "../../utils/i18n.util";

// Switches between the two branded languages. The label is the language you
// switch to, written in that language, so it is readable for either audience.
export const useLanguageToggle = () => {
  const intl = useIntl();
  const isDanish = intl.locale.startsWith("da");
  return {
    label: isDanish ? "English" : "Dansk",
    lang: isDanish ? "en" : "da",
    toggle: () => {
      i18nUtil.setLanguageCookie(isDanish ? "en-US" : "da-DK");
      location.reload();
    },
  };
};

const LanguageToggle = ({ className }: { className?: string }) => {
  const { label, lang, toggle } = useLanguageToggle();
  return (
    <UnstyledButton className={className} lang={lang} onClick={toggle}>
      {label}
    </UnstyledButton>
  );
};

export default LanguageToggle;
