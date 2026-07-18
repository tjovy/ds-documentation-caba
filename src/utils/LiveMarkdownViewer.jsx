import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LiveProvider, LiveError, LivePreview } from 'react-live';
import { transform } from 'sucrase';
import { normalizeCodeSnippetToVariables } from './codeSnippetNormalizer.js';
import { xmlTagsToMarkdown } from './xmlTagsToMarkdown.js';
import { CodePanesDisplay } from './CodePanes.jsx';

const liveEditorScope = { React };

const injectUnifiedPreviewFrame = (codeString) => {
  const cssVarMatch = codeString.match(/const\s+(css|__css|__injectedCss)\s*=/);
  if (!cssVarMatch || /<style>\{(?:css|__css|__injectedCss)\}<\/style>/.test(codeString)) {
    return codeString;
  }

  const cssVarName = cssVarMatch[1];
  return codeString.replace(
    /render\(\s*<Demo\s*\/>\s*\);?/,
    `render(<><style>{${cssVarName}}</style><Demo /></>);`
  );
};

const GENERIC_LIVE_FALLBACK = `
const boxStyle = {
  padding: '24px',
  borderRadius: '16px',
  border: '1px solid var(--color-border-default, #e5e7eb)',
  background: 'var(--color-bg-primary, #ffffff)',
  color: 'var(--color-text-primary, #111827)',
  fontFamily: 'var(--font-family-default, sans-serif)'
};

render(
  <div style={boxStyle}>
    <strong>Apercu indisponible</strong>
    <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary, #4b5563)' }}>
      Le snippet React fourni contient une erreur de syntaxe. Corrigez le bloc JSX pour retrouver le rendu live.
    </p>
  </div>
);
`;

const ensureRenderableLiveCode = (codeString) => {
  try {
    transform(codeString, { transforms: ['jsx', 'imports'] });
    return codeString;
  } catch (error) {
    return GENERIC_LIVE_FALLBACK;
  }
};

export const normalizeLiveCode = (children) => {
  let codeString = Array.isArray(children) ? children.join('') : String(children);
  codeString = codeString.replace(/\n$/, '');

  codeString = codeString
    .replace(/import\s+.*?from\s+['"].*?['"];?/gs, '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+/g, '')
    .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '');

  codeString = normalizeCodeSnippetToVariables(codeString);

  if (!codeString.includes('render(')) {
    const compMatch = codeString.match(/(?:const|let|var|function|class)\s+([A-Z][a-zA-Z0-9_]*)/);
    if (compMatch && compMatch[1]) {
      codeString += `\n\nrender(<div><${compMatch[1]} /></div>);`;
    }
  }

  return ensureRenderableLiveCode(injectUnifiedPreviewFrame(codeString));
};

export const LiveMarkdownViewer = ({ content }) => {
  if (!content) return null;

  // Convertir le format XML du workflow n8n en markdown si necessaire
  const normalizedContent = xmlTagsToMarkdown(content);

  return (
    <div className="zh-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');

            if (match) {
              const lang = match[1];

              if (['tsx', 'jsx', 'html', 'js'].includes(lang)) {
                const codeString = normalizeLiveCode(children);

                return (
                  <details open className="zh-live-block">
                    <summary className="zh-live-summary">Code interactif (Live Editor)</summary>
                    <div className="zh-live-body">
                      <LiveProvider code={codeString} scope={liveEditorScope} noInline={true}>
                        <div className="zh-live-stack">
                          <div className="zh-live-preview-shell">
                            <div className="zh-live-preview">
                              <LivePreview />
                            </div>
                          </div>

                          <div className="zh-live-editor-shell">
                            <CodePanesDisplay codeString={codeString} />
                          </div>
                          <LiveError className="zh-live-error" />
                        </div>
                      </LiveProvider>
                    </div>
                  </details>
                );
              }

              return (
                <pre className="zh-code-block">
                  <code className={className} {...rest}>{children}</code>
                </pre>
              );
            }

            return (
              <code className="zh-code-inline" {...rest}>
                {children}
              </code>
            );
          }
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};
