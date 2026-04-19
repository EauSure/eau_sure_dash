import { readFile } from 'fs/promises';
import path from 'path';

type MessageTree = Record<string, unknown>;

const messagesDir = path.join(process.cwd(), 'messages');
const localeFiles = ['fr.json', 'en.json', 'ar.json'] as const;

function collectKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const pathKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return collectKeys(value as MessageTree, pathKey);
    }

    return [pathKey];
  });
}

function hasKeyPath(tree: MessageTree, keyPath: string): boolean {
  return keyPath.split('.').every((segment, index, segments) => {
    const currentPath = segments.slice(0, index + 1);
    let current: unknown = tree;

    for (const part of currentPath) {
      if (!current || typeof current !== 'object' || Array.isArray(current) || !(part in current)) {
        return false;
      }

      current = (current as MessageTree)[part];
    }

    return true;
  });
}

async function loadLocale(fileName: string) {
  const filePath = path.join(messagesDir, fileName);
  return JSON.parse(await readFile(filePath, 'utf8')) as MessageTree;
}

async function main() {
  const [frMessages, enMessages, arMessages] = await Promise.all(localeFiles.map(loadLocale));
  const referenceKeys = collectKeys(frMessages);

  const localeReports = [
    { locale: 'en', messages: enMessages },
    { locale: 'ar', messages: arMessages },
  ] as const;

  let hasMissingKeys = false;

  for (const { locale, messages } of localeReports) {
    const missingKeys = referenceKeys.filter((keyPath) => !hasKeyPath(messages, keyPath));

    if (missingKeys.length > 0) {
      hasMissingKeys = true;
      console.error(`Missing keys in ${locale}.json:`);
      for (const keyPath of missingKeys) {
        console.error(`  - ${keyPath}`);
      }
    }
  }

  if (hasMissingKeys) {
    process.exit(1);
  }

  console.log('Translation key check passed.');
}

void main();