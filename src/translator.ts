import * as fs from 'fs';
import * as path from 'path';
import { Translations, TranslationMap } from './types';

const TRANSLATIONS_DIR = path.join(__dirname, '..', 'translations');

export class Translator {
  private translations: Map<string, Translations> = new Map();
  private reverseMaps: Map<string, TranslationMap> = new Map();
  // Cached sorted pairs per target language for fuzzy matching
  private cachedPairs: Map<string, { original: string; translated: string }[]> = new Map();

  constructor() {
    this.loadTranslations();
  }

  private loadTranslations(): void {
    const files = ['zh-CN.json', 'en-US.json'];
    for (const file of files) {
      const filePath = path.join(TRANSLATIONS_DIR, file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const translation = JSON.parse(content) as Translations;
          const lang = translation.metadata.language;
          this.translations.set(lang, translation);

          // 构建反向映射（用于从目标语言找回原文）
          this.buildReverseMap(lang, translation);
        } catch (e) {
          console.error(`加载翻译文件 ${file} 失败:`, e);
        }
      }
    }
  }

  private buildReverseMap(lang: string, translation: Translations): void {
    const reverseMap: TranslationMap = {};

    const flatten = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
          reverseMap[value] = fullKey;
        } else if (typeof value === 'object' && value !== null) {
          flatten(value, fullKey);
        }
      }
    };

    flatten(translation);
    this.reverseMaps.set(lang, reverseMap);
  }

  private getNestedValue(obj: any, key: string): string | undefined {
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return typeof current === 'string' ? current : undefined;
  }

  /**
   * 翻译文本到目标语言
   * @param text 原文
   * @param toLang 目标语言
   * @param fromLang 源语言（可选，自动检测）
   */
  translate(text: string, toLang: string, fromLang?: string): string {
    const targetTranslation = this.translations.get(toLang);
    if (!targetTranslation) return text;

    // 先尝试按键查找
    const directTranslation = this.getNestedValue(targetTranslation, text);
    if (directTranslation) return directTranslation;

    // 尝试从其他语言的反向映射中找到键
    if (fromLang) {
      const sourceReverse = this.reverseMaps.get(fromLang);
      if (sourceReverse && sourceReverse[text]) {
        const key = sourceReverse[text];
        const translated = this.getNestedValue(targetTranslation, key);
        if (translated) return translated;
      }
    } else {
      // 遍历所有语言的反向映射
      for (const [lang, reverseMap] of this.reverseMaps) {
        if (lang === toLang) continue;
        if (reverseMap[text]) {
          const key = reverseMap[text];
          const translated = this.getNestedValue(targetTranslation, key);
          if (translated) return translated;
        }
      }
    }

    // 模糊匹配 - 尝试翻译部分文本
    return this.fuzzyTranslate(text, toLang);
  }

  /**
   * Build and cache sorted translation pairs for a given target language.
   * Looks up ALL reverse maps (not just en-US) to find original strings
   * for each translated value.
   */
  private getSortedPairs(toLang: string): { original: string; translated: string }[] {
    const cached = this.cachedPairs.get(toLang);
    if (cached) return cached;

    const targetTranslation = this.translations.get(toLang);
    if (!targetTranslation) return [];

    const allPairs: { original: string; translated: string }[] = [];

    const collect = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
          // Look up ALL reverse maps to find the original text for this key
          for (const [lang, reverseMap] of this.reverseMaps) {
            if (lang === toLang) continue;
            for (const [srcText, srcKey] of Object.entries(reverseMap)) {
              if (srcKey === fullKey && srcText !== value) {
                allPairs.push({ original: srcText, translated: value });
                break;
              }
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          collect(value, fullKey);
        }
      }
    };

    collect(targetTranslation);

    // Sort by original length descending (prefer replacing longer matches first)
    allPairs.sort((a, b) => b.original.length - a.original.length);

    this.cachedPairs.set(toLang, allPairs);
    return allPairs;
  }

  private fuzzyTranslate(text: string, toLang: string): string {
    const allPairs = this.getSortedPairs(toLang);
    if (allPairs.length === 0) return text;

    // Protect text that already contains Chinese characters from further replacement
    if (/[\u4e00-\u9fff]/.test(text)) return text;

    let result = text;

    for (const { original, translated } of allPairs) {
      // Skip very short entries (length < 3) to avoid replacing "a", "is", etc.
      if (original.length < 3) continue;

      // Determine if original is a pure ASCII/English word
      const isAsciiWord = /^[a-zA-Z\s]+$/.test(original);

      // Build regex with word boundaries for ASCII words to prevent partial matches
      const escaped = this.escapeRegex(original);
      const pattern = isAsciiWord ? `\\b${escaped}\\b` : escaped;

      const regex = new RegExp(pattern, 'gi');
      result = result.replace(regex, (match: string): string => {
        return this.preserveCase(match, translated);
      });
    }

    return result;
  }

  /**
   * Preserve the original text's casing when applying the translated word.
   * - ALL CAPS -> apply translated as-is (no case concept in CJK)
   * - Title Case -> capitalized match (for non-CJK targets)
   * - lower case -> as-is
   */
  private preserveCase(original: string, replacement: string): string {
    if (original === original.toUpperCase() && original.length > 1) {
      // Original is ALL CAPS — no case transformation needed for CJK
      return replacement;
    }
    // For CJK replacements, casing doesn't apply; return as-is
    return replacement;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 生成双语显示文本
   * @param text 原始文本
   * @param primaryLang 目标翻译语言（将文本翻译成此语言）
   * @param _secondaryLang 未使用，保留以兼容接口
   * @param order 显示顺序：original-first 为原文在前，translated-first 为译文在前
   */
  getBilingualText(text: string, primaryLang: string, _secondaryLang: string, order: 'original-first' | 'translated-first'): string {
    const translated = this.translate(text, primaryLang);

    if (text === translated) return text;

    if (order === 'original-first') {
      return `${text}\n${translated}`;
    } else {
      return `${translated}\n${text}`;
    }
  }
}

export const translator = new Translator();
