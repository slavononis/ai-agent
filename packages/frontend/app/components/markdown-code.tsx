import CodeMirror from '@uiw/react-codemirror';
import { abyss } from '@uiw/codemirror-theme-abyss';

// Official langs
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { php } from '@codemirror/lang-php';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { sql } from '@codemirror/lang-sql';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';

// map of supported langs
const languageExtensions: Record<string, any> = {
  javascript: javascript({ jsx: true }),
  typescript: javascript({ typescript: true, jsx: true }),
  js: javascript(),
  ts: javascript({ typescript: true }),
  python: python(),
  py: python(),
  java: java(),
  cpp: cpp(),
  c: cpp(),
  rust: rust(),
  go: go(),
  php: php(),
  html: html(),
  css: css(),
  json: json(),
  sql: sql(),
  md: markdown(),
  xml: xml(),
  yaml: yaml(),
  yml: yaml(),
  markdown: markdown({ base: markdownLanguage, codeLanguages: languages }),
};

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownCode({ content }: MarkdownRendererProps) {
  return (
    <CodeMirror
      value={content}
      height="calc(100vh - 56px)"
      theme={abyss}
      extensions={Object.values(languageExtensions)}
      editable={false}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      style={{
        padding: 0,
        borderRadius: '0.5rem',
        fontSize: '14px',
        overflow: 'hidden',
      }}
    />
  );
}
