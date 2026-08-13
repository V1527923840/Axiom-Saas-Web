// Inter font configuration for Vite version.
//
// 字体加载改由 `@fontsource-variable/inter` npm 包提供 (main.tsx 顶层
// import),woff2 由 Vite 打进 bundle,不再走 Google Fonts CDN —— 国内生产
// 环境无代理时 fonts.googleapis.com / fonts.gstatic.com 被 GFW 阻断,会
// 导致首屏 fallback 到 system-ui。
//
// `@fontsource-variable/inter` 包默认 @font-family 是 'Inter Variable',
// 所以 src/index.css 里 `--font-inter` 变量需要把 'Inter Variable' 放在
// 'Inter' 之前。

export const interFontCSS = ''; // 留空以保持向后兼容;实际样式来自 main.tsx 引入的 npm 包

// CSS variable name to match Next.js version
export const interFontVariable = '--font-inter';

// Inter font family for direct CSS usage
export const interFontFamily = "'Inter Variable', 'Inter', system-ui, sans-serif";
