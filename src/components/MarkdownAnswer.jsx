import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';

// Only the languages the answers actually use, to keep the bundle small.
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('sql', sql);

const SUPPORTED = new Set(['python', 'javascript', 'js', 'bash', 'sh', 'shell', 'json', 'sql']);
const ALIASES = { js: 'javascript', sh: 'bash', shell: 'bash' };

const REMARK_PLUGINS = [remarkGfm];

const CODE_STYLE = {
  margin: 0,
  padding: '0.875rem 1rem',
  background: 'transparent',
  fontSize: '0.8125rem',
  lineHeight: 1.6,
  fontFamily: 'var(--font-mono)',
};

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard blocked (insecure context or denied permission): fall back
      // to a hidden textarea so the button still does something useful.
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      } catch {
        return;
      }
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  }, [code]);

  const resolved = ALIASES[language] || language;
  const highlight = SUPPORTED.has(language);

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-xl bg-[#1b2232] ring-1 ring-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] font-medium tracking-wide text-slate-400">
          {highlight ? resolved : 'code'}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {highlight ? (
        <SyntaxHighlighter language={resolved} style={oneDark} customStyle={CODE_STYLE} PreTag="div">
          {code}
        </SyntaxHighlighter>
      ) : (
        <pre style={CODE_STYLE} className="overflow-x-auto text-slate-200">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

/** Pulls the fenced block's language and raw text straight off the hast node. */
function Pre({ node, children }) {
  const codeNode = node?.children?.find((child) => child.tagName === 'code');
  if (!codeNode) return <pre>{children}</pre>;

  const classes = codeNode.properties?.className;
  const className = Array.isArray(classes) ? classes.join(' ') : String(classes || '');
  const language = (/language-([\w-]+)/.exec(className)?.[1] || 'text').toLowerCase();
  const code = (codeNode.children || [])
    .map((child) => child.value || '')
    .join('')
    .replace(/\n+$/, '');

  return <CodeBlock language={language} code={code} />;
}

const COMPONENTS = {
  pre: Pre,
  code: ({ children, ...props }) => (
    <code
      {...props}
      className="rounded-md px-1.5 py-0.5 font-mono text-[0.8125rem]"
      style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
    >
      {children}
    </code>
  ),
  p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: 'var(--text)' }}>
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h4 className="mt-3 mb-1 text-sm font-semibold">{children}</h4>,
  h2: ({ children }) => <h4 className="mt-3 mb-1 text-sm font-semibold">{children}</h4>,
  h3: ({ children }) => <h4 className="mt-3 mb-1 text-sm font-semibold">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote
      className="my-2 border-l-2 pl-3 italic"
      style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="underline underline-offset-2"
      style={{ color: 'var(--accent)' }}
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[0.8125rem]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th
      className="border px-2.5 py-1.5 font-semibold"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border px-2.5 py-1.5" style={{ borderColor: 'var(--border)' }}>
      {children}
    </td>
  ),
  hr: () => <hr className="my-3" style={{ borderColor: 'var(--border)' }} />,
};

/**
 * Renders an answer written in markdown. Raw HTML is deliberately not
 * enabled, so stored answers can never inject markup.
 */
function MarkdownAnswer({ children }) {
  return (
    <div className="text-[0.9375rem]" style={{ color: 'var(--text-secondary)' }}>
      <Markdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {children}
      </Markdown>
    </div>
  );
}

export default memo(MarkdownAnswer);
