import { Anchor, Footer as MFooter, Group, Text } from "@mantine/core";
import useConfig from "../../hooks/config.hook";
import useTranslate from "../../hooks/useTranslate.hook";

const Footer = () => {
  const t = useTranslate();
  const config = useConfig();
  const hasImprint = !!(
    config.get("legal.imprintUrl") || config.get("legal.imprintText")
  );
  const hasPrivacy = !!(
    config.get("legal.privacyPolicyUrl") ||
    config.get("legal.privacyPolicyText")
  );
  const imprintUrl =
    (!config.get("legal.imprintText") && config.get("legal.imprintUrl")) ||
    "/imprint";
  const privacyUrl =
    (!config.get("legal.privacyPolicyText") &&
      config.get("legal.privacyPolicyUrl")) ||
    "/privacy";
  const showLegal = config.get("legal.enabled");

  return (
    <MFooter height="auto" py="sm" px="xl" zIndex={100}>
      <Group position="apart" spacing="xs" sx={{ rowGap: 4 }}>
        <Text size="sm">
          <Anchor size="sm" href="https://mahoje.dk">
            mahoje.dk
          </Anchor>
        </Text>
        <Group spacing="md" sx={{ rowGap: 4 }}>
          {showLegal && hasImprint && (
            <Anchor size="xs" href={imprintUrl}>
              {t("imprint.title")}
            </Anchor>
          )}
          {showLegal && hasPrivacy && (
            <Anchor size="xs" href={privacyUrl}>
              {t("privacy.title")}
            </Anchor>
          )}
          <Text size="xs" color="dimmed">
            Bygget på{" "}
            <Anchor
              size="xs"
              href="https://github.com/smp46/pingvin-share-x"
              target="_blank"
              rel="noopener"
              color="dimmed"
            >
              Pingvin Share X
            </Anchor>
          </Text>
        </Group>
      </Group>
    </MFooter>
  );
};

export default Footer;
