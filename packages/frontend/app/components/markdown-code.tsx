import { useRef } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { abyss } from '@uiw/codemirror-theme-abyss';

// langs
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

// search
import {
  searchKeymap,
  highlightSelectionMatches,
  openSearchPanel,
  search,
} from '@codemirror/search';
import { keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

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
  const viewRef = useRef<EditorView | null>(null);

  return (
    <CodeMirror
      value={content}
      height="calc(100vh - 80px)"
      theme={abyss}
      extensions={[
        ...Object.values(languageExtensions),
        highlightSelectionMatches(),
        keymap.of(searchKeymap),
        EditorState.readOnly.of(true), // ✅ makes document read-only but UI still works
        search({ top: true }),
      ]}
      // DO NOT use editable={false}, it blocks search panel input
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
      onCreateEditor={(view) => {
        viewRef.current = view;
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
          e.preventDefault();
          if (viewRef.current) {
            openSearchPanel(viewRef.current); // ✅ works in read-only mode
          }
        }
      }}
    />
  );
}
