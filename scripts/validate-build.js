#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 验证构建输出...\n');

const requiredFiles = [
  'dist/index.js',
  'dist/hooks/session-start.js',
  'dist/hooks/post-tool-use.js',
  'dist/translator.js',
  'dist/config.js',
  'dist/types.js'
];

let allValid = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 未找到`);
    allValid = false;
  }
});

console.log('\n' + '='.repeat(40));

if (allValid) {
  console.log('🎉 构建验证通过！所有必要文件都已生成。');
  process.exit(0);
} else {
  console.log('❌ 构建验证失败！请检查 TypeScript 编译是否成功。');
  process.exit(1);
}
