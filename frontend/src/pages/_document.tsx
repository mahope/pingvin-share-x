import { createGetInitialProps } from "@mantine/next";
import Document, { Head, Html, Main, NextScript } from "next/document";
import { PLAUSIBLE_INIT, PLAUSIBLE_SCRIPT } from "../utils/analytics.util";

const getInitialProps = createGetInitialProps();

export default class _Document extends Document {
  static getInitialProps = getInitialProps;

  render() {
    // Match the language chosen in _app, so English visitors aren't offered
    // a "translate from Danish" prompt.
    const language: string | undefined =
      this.props.__NEXT_DATA__.props?.pageProps?.language;
    return (
      <Html lang={language?.split("-")[0] ?? "da"}>
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" href="/img/favicon.ico" sizes="48x48" />
          <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />
          <link rel="apple-touch-icon" href="/img/icons/apple-touch-icon.png" />
          <link
            rel="preload"
            href="/fonts/brygada-1918-latin.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />

          <meta name="robots" content="noindex" />
          <script async src={PLAUSIBLE_SCRIPT} />
          <script dangerouslySetInnerHTML={{ __html: PLAUSIBLE_INIT }} />
          <meta
            name="theme-color"
            content="#ffffff"
            media="(prefers-color-scheme: light)"
          />
          <meta
            name="theme-color"
            content="#121417"
            media="(prefers-color-scheme: dark)"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
