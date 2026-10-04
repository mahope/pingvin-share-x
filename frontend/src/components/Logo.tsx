import { createStyles } from "@mantine/core";
import useConfig from "../hooks/config.hook";
import { tokens } from "../styles/mantine.style";

const useStyles = createStyles((theme) => ({
  root: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: "0.4em",
    whiteSpace: "nowrap",
    color: tokens(theme).ink,
  },
  wordmark: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.2em",
    fontFamily: theme.headings.fontFamily,
    fontWeight: 600,
    fontSize: 24,
    lineHeight: 1,
    letterSpacing: "-0.01em",
  },
  symbol: {
    position: "relative",
    top: "-0.025em",
    width: "1em",
    height: "1em",
    flexShrink: 0,
    alignSelf: "center",
  },
  suffix: {
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1,
    color: tokens(theme).ink3,
  },
}));

/**
 * Linje-M'et foran ordmærket "Mahoje" i Brygada 1918, som på mahoje.dk.
 * Symbolet følger tekstfarven. Efter ordmærket står appens navn uden
 * "Mahoje" (fx "Filer").
 */
const Logo = () => {
  const { classes } = useStyles();
  const config = useConfig();
  const appName: string = config.get("general.appName") ?? "";
  const suffix = appName.replace(/^mahoje\s*/i, "").trim();

  return (
    <span className={classes.root}>
      <span className={classes.wordmark}>
        <svg
          viewBox="0 0 512 512"
          aria-hidden="true"
          focusable="false"
          className={classes.symbol}
        >
          <polyline
            points="62,400 182,168 262,284 342,118 452,400"
            fill="none"
            stroke="currentColor"
            strokeWidth="46"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Mahoje
      </span>
      {suffix && <span className={classes.suffix}>{suffix}</span>}
    </span>
  );
};

export default Logo;
