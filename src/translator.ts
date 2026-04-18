import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Translations, TranslationMap } from './types';

const TRANSLATIONS_DIR = path.join(__dirname, '..', 'translations');
const USER_DATA_DIR = path.join(os.homedir(), '.claude', 'plugins', 'config', 'claude-i18n');
const USER_DICT_FILE = path.join(USER_DATA_DIR, 'user-dictionary.json');
const PENDING_FILE = path.join(USER_DATA_DIR, 'pending-translations.json');

export class Translator {
  private translations: Map<string, Translations> = new Map();
  private reverseMaps: Map<string, TranslationMap> = new Map();
  // Cached sorted pairs per target language for fuzzy matching
  private cachedPairs: Map<string, { original: string; translated: string }[]> = new Map();
  // User dictionary: English → Chinese (higher priority than built-in)
  private userDict: Map<string, string> = new Map();
  // Pending: texts collected but not yet translated
  private pending: Set<string> = new Set();

  constructor() {
    this.loadTranslations();
    this.loadUserDictionary();
    this.loadPending();
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

  private loadUserDictionary(): void {
    try {
      if (fs.existsSync(USER_DICT_FILE)) {
        const content = fs.readFileSync(USER_DICT_FILE, 'utf-8');
        const data = JSON.parse(content);
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string' && value) {
            this.userDict.set(key, value);
          }
        }
      }
    } catch {
      // User dict is optional, ignore errors
    }
  }

  private loadPending(): void {
    try {
      if (fs.existsSync(PENDING_FILE)) {
        const content = fs.readFileSync(PENDING_FILE, 'utf-8');
        const arr = JSON.parse(content);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (typeof item === 'string' && item.trim()) {
              this.pending.add(item);
            }
          }
        }
      }
    } catch {
      // Pending file is optional
    }
  }

  /** Get pending translations (for session-start to instruct Claude) */
  getPending(): string[] {
    return Array.from(this.pending);
  }

  /** Get the path to user-dictionary.json (for Claude to write translations) */
  getUserDictPath(): string {
    return USER_DICT_FILE;
  }

  /** Get the path to pending-translations.json */
  getPendingPath(): string {
    return PENDING_FILE;
  }

  /** Clear pending after they've been translated */
  clearPending(translated: string[]): void {
    for (const t of translated) {
      this.pending.delete(t);
    }
    this.savePending();
  }

  /**
   * After a translation attempt, collect untranslated segments.
   * Compares original vs translated to find what wasn't translated.
   */
  collectUntranslated(original: string, translated: string): void {
    // Skip short text
    if (original.trim().length < 5) return;
    // Skip if already has Chinese (already translated or Chinese source)
    if (/[\u4e00-\u9fff]/.test(original)) return;
    // Skip if it's in user dict already
    if (this.userDict.has(original)) return;

    const segments = this.extractUntranslatedSegments(original, translated);
    let added = false;

    for (const seg of segments) {
      const trimmed = seg.trim();
      // Only collect meaningful English segments
      if (trimmed.length >= 5 && !this.pending.has(trimmed) && !this.userDict.has(trimmed)) {
        // Skip if it's just a path, number, or code
        if (/^[\d\s\-_.\/\\:]+$/.test(trimmed)) continue;
        // Skip if it looks like a file path
        if (/^(\/|\.\/|\.\.\/|~\/|[A-Z]:\\)/.test(trimmed)) continue;
        this.pending.add(trimmed);
        added = true;
      }
    }

    if (added) {
      this.savePending();
    }
  }

  /**
   * Extract English segments that weren't translated from a partially translated result.
   */
  private extractUntranslatedSegments(original: string, translated: string): string[] {
    const segments: string[] = [];

    if (original === translated) {
      // Completely untranslated — try splitting into meaningful parts
      // Split by lines first
      const lines = original.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines) {
        if (line.length <= 80 && /^[a-zA-Z]/.test(line)) {
          segments.push(line);
        } else if (line.length > 80) {
          // Long lines: split by sentence-ending punctuation
          const sentences = line.split(/(?<=[.:;!?])\s+/);
          for (const s of sentences) {
            const st = s.trim();
            if (st.length >= 5 && /^[a-zA-Z]/.test(st)) {
              segments.push(st);
            }
          }
        }
      }
      // If nothing extracted, add the whole thing if short enough
      if (segments.length === 0 && original.trim().length <= 200) {
        segments.push(original.trim());
      }
    } else {
      // Partially translated — find English-only chunks
      // Split by Chinese characters and common delimiters
      const parts = translated.split(/[\u4e00-\u9fff…]+/);
      for (const part of parts) {
        const trimmed = part.trim().replace(/^[:;,\s]+|[:;,\s]+$/g, '');
        if (trimmed.length >= 5 && /^[a-zA-Z]/.test(trimmed)) {
          segments.push(trimmed);
        }
      }

      // Also check the original for phrases not present in any form
      // Split original into words/phrases and find untranslated ones
      const words = original.split(/\s+/);
      let currentPhrase = '';
      for (const word of words) {
        // Skip common words that don't need translation
        if (['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
             'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
             'would', 'shall', 'should', 'may', 'might', 'must', 'can',
             'could', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
             'from', 'as', 'into', 'through', 'during', 'before', 'after',
             'above', 'below', 'between', 'out', 'off', 'over', 'under',
             'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor',
             'not', 'so', 'yet', 'both', 'either', 'neither', 'each',
             'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some',
             'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very',
             'just', 'because', 'if', 'when', 'where', 'how', 'what',
             'which', 'who', 'whom', 'this', 'that', 'these', 'those',
             'it', 'its'].includes(word.toLowerCase())) {
          currentPhrase += (currentPhrase ? ' ' : '') + word;
          continue;
        }
        // Check if this word/phrase was translated
        const testPhrase = currentPhrase ? currentPhrase + ' ' + word : word;
        const testTranslated = this.fuzzyTranslate(testPhrase, 'zh-CN');
        if (testTranslated === testPhrase) {
          // Not translated
          currentPhrase = testPhrase;
        } else {
          if (currentPhrase.length >= 5 && !this.pending.has(currentPhrase)) {
            segments.push(currentPhrase);
          }
          currentPhrase = '';
        }
      }
      if (currentPhrase.length >= 5 && !this.pending.has(currentPhrase)) {
        segments.push(currentPhrase);
      }
    }

    return segments;
  }

  private savePending(): void {
    try {
      if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
      }
      const arr = Array.from(this.pending);
      fs.writeFileSync(PENDING_FILE, JSON.stringify(arr, null, 2), 'utf-8');
    } catch {
      // Best effort
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
   */
  translate(text: string, toLang: string, fromLang?: string): string {
    const targetTranslation = this.translations.get(toLang);
    if (!targetTranslation) return text;

    // 1. Check user dictionary first (highest priority)
    const userTrans = this.userDict.get(text);
    if (userTrans) return userTrans;

    // 2. Try direct key lookup
    const directTranslation = this.getNestedValue(targetTranslation, text);
    if (directTranslation) return directTranslation;

    // 3. Try reverse map lookup
    if (fromLang) {
      const sourceReverse = this.reverseMaps.get(fromLang);
      if (sourceReverse && sourceReverse[text]) {
        const key = sourceReverse[text];
        const translated = this.getNestedValue(targetTranslation, key);
        if (translated) return translated;
      }
    } else {
      for (const [lang, reverseMap] of this.reverseMaps) {
        if (lang === toLang) continue;
        if (reverseMap[text]) {
          const key = reverseMap[text];
          const translated = this.getNestedValue(targetTranslation, key);
          if (translated) return translated;
        }
      }
    }

    // 4. Fuzzy match (includes user dict entries)
    return this.fuzzyTranslate(text, toLang);
  }

  /**
   * Build and cache sorted translation pairs for a given target language.
   * Includes BOTH built-in translations and user dictionary entries.
   */
  private getSortedPairs(toLang: string): { original: string; translated: string }[] {
    const cached = this.cachedPairs.get(toLang);
    if (cached) return cached;

    const targetTranslation = this.translations.get(toLang);
    if (!targetTranslation) return [];

    const allPairs: { original: string; translated: string }[] = [];

    // Built-in translations
    const collect = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
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

    // Add user dictionary entries
    for (const [english, chinese] of this.userDict) {
      allPairs.push({ original: english, translated: chinese });
    }

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

  private preserveCase(original: string, replacement: string): string {
    if (original === original.toUpperCase() && original.length > 1) {
      return replacement;
    }
    return replacement;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 生成双语显示文本
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
