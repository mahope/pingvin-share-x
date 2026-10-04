import { MantineTheme, MantineThemeOverride } from "@mantine/core";

// Mahoje "Blæk på papir": blåsort blæk på hvidt og varmt papir. Værdierne
// kommer fra mahoje-dk (src/app/globals.css). Lys er standard; mørk er samme
// blæk og papir vendt.
export const brand = {
  light: {
    ink: "#15181c",
    ink2: "#41454c",
    ink3: "#62666e",
    rule: "#e2e3e5",
    paper: "#f5f3ee",
    background: "#ffffff",
  },
  dark: {
    ink: "#f3f4f6",
    ink2: "#c4c8cf",
    ink3: "#9aa1ab",
    rule: "#2c3138",
    paper: "#1a1d21",
    background: "#121417",
  },
};

export const tokens = (theme: { colorScheme: string }) =>
  theme.colorScheme === "dark" ? brand.dark : brand.light;

const headingFont = `"Brygada 1918", Georgia, "Times New Roman", serif`;
const bodyFont =
  `"Schibsted Grotesk", "Schibsted Grotesk Fallback", Arial, sans-serif`;

// Mantine sætter hvid tekst på udfyldte primærflader. I mørk tilstand er
// primærfarven lys blæk, så teksten skal være mørk.
const onPrimary = (theme: MantineTheme, color?: string) =>
  theme.colorScheme === "dark" && (!color || color === theme.primaryColor)
    ? brand.dark.background
    : undefined;

export default <MantineThemeOverride>{
  colors: {
    // Primær: blæk. Lys tilstand bruger [9], mørk bruger [0].
    ink: [
      "#f3f4f6",
      "#e2e3e5",
      "#c4c8cf",
      "#9aa1ab",
      "#7d838c",
      "#62666e",
      "#41454c",
      "#2a2d32",
      "#000000",
      "#15181c",
    ],
    // Lys tilstands neutrale: papir, streg, dæmpet og brødtekst.
    gray: [
      "#f5f3ee",
      "#efede7",
      "#e8e8e9",
      "#e2e3e5",
      "#8b8f96",
      "#767a82",
      "#62666e",
      "#41454c",
      "#2a2d32",
      "#15181c",
    ],
    // Mørk tilstand: [0] tekst, [2] dæmpet, [4] feltkant, [5] streg,
    // [6] felt, [7] baggrund.
    dark: [
      "#f3f4f6",
      "#c4c8cf",
      "#9aa1ab",
      "#7d838c",
      "#5c626b",
      "#2c3138",
      "#1a1d21",
      "#121417",
      "#0e1013",
      "#0b0c0e",
    ],
  },
  primaryColor: "ink",
  primaryShade: { light: 9, dark: 0 },
  black: brand.light.ink,
  white: "#ffffff",
  fontFamily: bodyFont,
  fontFamilyMonospace: "ui-monospace, Consolas, monospace",
  headings: {
    fontFamily: headingFont,
    fontWeight: 400,
    sizes: {
      h1: { fontSize: "2.25rem", lineHeight: 1.1 },
      h2: { fontSize: "1.875rem", lineHeight: 1.1 },
      h3: { fontSize: "1.5rem", lineHeight: 1.15 },
      h4: { fontSize: "1.25rem", lineHeight: 1.2 },
    },
  },
  defaultRadius: 3,
  radius: { xs: "2px", sm: "3px", md: "3px", lg: "3px", xl: "3px" },
  focusRingStyles: {
    styles: (theme) => ({
      outlineOffset: 2,
      outline: `2px solid ${tokens(theme).ink}`,
    }),
    inputStyles: (theme) => ({
      outline: "none",
      borderColor: tokens(theme).ink,
    }),
  },
  globalStyles: (theme) => ({
    body: {
      backgroundColor: tokens(theme).background,
      color: tokens(theme).ink,
      WebkitFontSmoothing: "antialiased",
    },
    "h1, h2, h3, h4": {
      letterSpacing: "-0.02em",
    },
    "::selection": {
      backgroundColor: tokens(theme).ink,
      color: tokens(theme).background,
    },
  }),
  components: {
    Modal: {
      styles: (theme) => ({
        title: {
          fontFamily: headingFont,
          fontSize: theme.fontSizes.xl,
          fontWeight: 400,
        },
      }),
    },
    Button: {
      styles: (theme, params: { color?: string }, { variant }) => ({
        root: {
          fontWeight: 600,
          ...(variant === "filled" && onPrimary(theme, params.color)
            ? { color: onPrimary(theme, params.color) }
            : {}),
          // Mantines "light" bliver næsten usynlig med blæk i mørk tilstand.
          ...(variant === "light" &&
          theme.colorScheme === "dark" &&
          (!params.color || params.color === theme.primaryColor)
            ? {
                backgroundColor: brand.dark.rule,
                color: brand.dark.ink,
                "&:hover": { backgroundColor: "#3a4048" },
              }
            : {}),
        },
      }),
    },
    ActionIcon: {
      styles: (theme, params: { color?: string }, { variant }) => ({
        root:
          variant === "filled" && onPrimary(theme, params.color)
            ? { color: onPrimary(theme, params.color) }
            : {},
      }),
    },
    ThemeIcon: {
      styles: (theme, params: { color?: string }, { variant }) => ({
        root:
          variant === "filled" && onPrimary(theme, params.color)
            ? { color: onPrimary(theme, params.color) }
            : {},
      }),
    },
    Badge: {
      styles: (theme, params: { color?: string }, { variant }) => ({
        root: {
          textTransform: "none",
          letterSpacing: 0,
          ...(variant === "filled" && onPrimary(theme, params.color)
            ? { color: onPrimary(theme, params.color) }
            : {}),
        },
      }),
    },
    Checkbox: {
      styles: (theme, params: { color?: string }) => ({
        icon: onPrimary(theme, params.color)
          ? { color: `${onPrimary(theme, params.color)} !important` }
          : {},
      }),
    },
    Avatar: {
      styles: (theme) => ({
        placeholder: {
          backgroundColor: tokens(theme).paper,
          color: tokens(theme).ink,
        },
      }),
    },
    Anchor: {
      styles: (theme) => ({
        root: {
          color: tokens(theme).ink,
          textDecoration: "underline",
          textDecorationColor: tokens(theme).ink3,
          textUnderlineOffset: 3,
          "&:hover": { textDecorationColor: tokens(theme).ink },
        },
      }),
    },
  },
};
