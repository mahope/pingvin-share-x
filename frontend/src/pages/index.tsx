import {
  Box,
  Button,
  Container,
  createStyles,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import Meta from "../components/Meta";
import useUser from "../hooks/user.hook";
import useConfig from "../hooks/config.hook";
import useTranslate from "../hooks/useTranslate.hook";
import { tokens } from "../styles/mantine.style";

const useStyles = createStyles((theme) => ({
  inner: {
    paddingTop: 64,
    paddingBottom: 64,

    [theme.fn.smallerThan("sm")]: {
      paddingTop: 24,
      paddingBottom: 48,
    },
  },

  content: {
    maxWidth: 600,
  },

  title: {
    color: tokens(theme).ink,
    fontSize: 48,
    lineHeight: 1.06,
    letterSpacing: "-0.03em",

    [theme.fn.smallerThan("xs")]: {
      fontSize: 36,
    },
  },

  lead: {
    color: tokens(theme).ink2,
    fontSize: 18,
    lineHeight: 1.55,
    maxWidth: "36em",
  },

  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    borderTop: `2px solid ${tokens(theme).ink}`,
  },

  item: {
    padding: "16px 0",
    borderBottom: `1px solid ${tokens(theme).rule}`,
  },

  itemName: {
    color: tokens(theme).ink,
    fontWeight: 600,
    fontSize: 16,
  },

  itemText: {
    color: tokens(theme).ink2,
    fontSize: 16,
    lineHeight: 1.55,
    marginTop: 4,
  },

  control: {
    height: 54,
    paddingLeft: 28,
    paddingRight: 28,
    fontSize: 16,

    [theme.fn.smallerThan("xs")]: {
      width: "100%",
    },
  },
}));

export default function Home() {
  const { classes } = useStyles();
  const { refreshUser } = useUser();
  const router = useRouter();
  const config = useConfig();
  const t = useTranslate();
  const [signupEnabled, setSignupEnabled] = useState(true);

  // If user is already authenticated, redirect to the upload page
  useEffect(() => {
    refreshUser().then((user) => {
      if (user) {
        router.replace("/upload");
      }
    });

    // If registration is disabled, get started button should redirect to the sign in page
    try {
      const allowRegistration = config.get("share.allowRegistration");
      setSignupEnabled(allowRegistration !== false);
    } catch (error) {
      setSignupEnabled(true);
    }
  }, [config]);

  const getButtonHref = () => {
    return signupEnabled ? "/auth/signUp" : "/auth/signIn";
  };

  const items = ["a", "b", "c"];

  return (
    <>
      <Meta title={t("home.title")} />
      <Container px={0}>
        <div className={classes.inner}>
          <div className={classes.content}>
            <Title order={1} className={classes.title}>
              <FormattedMessage id="home.title" />
            </Title>
            <Text className={classes.lead} mt="lg">
              <FormattedMessage id="home.description" />
            </Text>

            <Box component="ul" className={classes.list} mt={40}>
              {items.map((key) => (
                <li key={key} className={classes.item}>
                  <div className={classes.itemName}>
                    <FormattedMessage id={`home.bullet.${key}.name`} />
                  </div>
                  <div className={classes.itemText}>
                    <FormattedMessage id={`home.bullet.${key}.description`} />
                  </div>
                </li>
              ))}
            </Box>

            <Box mt={40}>
              <Button
                component={Link}
                href={getButtonHref()}
                className={classes.control}
              >
                <FormattedMessage id="home.button.start" />
              </Button>
            </Box>
          </div>
        </div>
      </Container>
    </>
  );
}
