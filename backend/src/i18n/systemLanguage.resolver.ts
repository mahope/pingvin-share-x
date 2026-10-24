import { ExecutionContext, Injectable } from "@nestjs/common";
import { I18nResolver } from "nestjs-i18n";
import { ConfigService } from "../config/config.service";

// Must match LANGUAGE_COOKIE and BRANDED_LANGUAGES in the frontend's i18n.util.ts.
const LANGUAGE_COOKIE = "mahoje-language";
const BRANDED_LANGUAGES = ["da-DK", "en-US"];

@Injectable()
export class SystemLanguageResolver implements I18nResolver {
  constructor(private readonly configService: ConfigService) {}

  // Answer API errors in the language the page is shown in: the visitor's own
  // choice, then Danish or English from the browser. Without a request (e.g.
  // emails sent from jobs) the configured default language is used.
  resolve(context: ExecutionContext): string | undefined {
    const request =
      context?.getType() === "http"
        ? context.switchToHttp().getRequest()
        : undefined;

    const cookieLanguage = request?.cookies?.[LANGUAGE_COOKIE];
    if (BRANDED_LANGUAGES.includes(cookieLanguage)) return cookieLanguage;

    const acceptLanguage: string | undefined =
      request?.headers?.["accept-language"];
    if (acceptLanguage) {
      const first = acceptLanguage
        .split(",")
        .map((l) => l.split(";")[0].trim().toLowerCase().split("-")[0])
        .find((l) => l === "da" || l === "en");
      return first === "da" ? "da-DK" : "en-US";
    }

    return this.configService.get("general.defaultLanguage");
  }
}
