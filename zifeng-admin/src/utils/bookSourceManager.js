const checkRuleFormat = (source) => {
  const allRules = [
    ...Object.values(source.ruleSearch || {}),
    ...Object.values(source.ruleBookInfo || {}),
    ...Object.values(source.ruleToc || {}),
    ...Object.values(source.ruleContent || {}),
    source.searchUrl || '',
    source.header || ''
  ];

  let hasJs = false;
  let hasCss = false;
  let hasJsonPath = false;

  for (const rule of allRules) {
    if (typeof rule !== 'string') continue;
    if (rule.includes('<js>') || rule.includes('</js>') || rule.includes('@js:')) hasJs = true;
    if (/^(class\.|tag\.|id\.|attr\.|text|html|src|href|content)/.test(rule) || /@(text|html|src|href|content|tag\.|class\.|id\.|attr\.|img)/.test(rule)) hasCss = true;
    if (rule.startsWith('$.') || rule.startsWith('$..') || rule.startsWith('{{$.')) hasJsonPath = true;
  }

  return { hasJs, hasCss, hasJsonPath };
};

export const detectSourceType = (source) => {
  const { hasCss, hasJsonPath, hasJs } = checkRuleFormat(source);

  if (hasCss && !hasJsonPath) return 1;
  if (hasJsonPath && !hasCss) return 0;
  if (hasCss && hasJsonPath) return 1;

  const searchUrl = source.searchUrl || '';
  const ruleSearchStr = source.ruleSearch ? JSON.stringify(source.ruleSearch) : '';
  if (searchUrl.includes('class.') || searchUrl.includes('tag.') || ruleSearchStr.includes('class.') || ruleSearchStr.includes('tag.')) return 1;
  if (searchUrl.includes('$.') || ruleSearchStr.includes('$.')) return 0;

  if (source.bookSourceType !== undefined && source.bookSourceType !== null) {
    return source.bookSourceType;
  }

  return 0;
};
