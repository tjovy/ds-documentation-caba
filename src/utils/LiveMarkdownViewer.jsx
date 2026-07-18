import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LiveProvider, LiveError, LivePreview } from 'react-live';
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

export const normalizeLiveCode = (children) => {
  const codeString = (Array.isArray(children) ? children.join('') : String(children)).replace(/\n$/, '');
  return injectUnifiedPreviewFrame(codeString);
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
                const sourceCode = (Array.isArray(children) ? children.join('') : String(children)).replace(/\n$/, '');
                const codeString = normalizeLiveCode(sourceCode);

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
                            <CodePanesDisplay codeString={sourceCode} />
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
