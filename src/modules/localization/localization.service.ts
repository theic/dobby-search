import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalizationService {
  private translations: { [key: string]: { [key: string]: string } } = {};
  private defaultLanguage: string;

  constructor(private configService: ConfigService) {
    this.defaultLanguage = this.configService.get<string>(
      'DEFAULT_LANGUAGE',
      'en',
    );
    this.loadTranslations();
  }

  private loadTranslations() {
    const localesPath = path.join(__dirname, '..', '..', '..', 'locales');
    fs.readdirSync(localesPath).forEach((file) => {
      if (file.endsWith('.json')) {
        const language = file.split('.')[0];
        this.translations[language] = JSON.parse(
          fs.readFileSync(path.join(localesPath, file), 'utf8'),
        );
      }
    });
  }

  translate(
    key: string,
    language?: string,
    params?: { [key: string]: string | number },
  ): string {
    const lang = language || this.defaultLanguage;
    let translation = this.translations[lang]?.[key] || key;

    if (params) {
      Object.keys(params).forEach((param) => {
        translation = translation.replace(
          `{${param}}`,
          params[param].toString(),
        );
      });
    }

    return translation;
  }
}
