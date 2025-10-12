import 'highlight.js/styles/github-dark.css';

import {
  Check,
  Copy,
  FileIcon,
  MessageSquareCode,
  ScanEye,
} from 'lucide-react';
import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { displayToastError } from '@/helpers/display-toast';
import { cn } from '@/lib/utils';

type MarkdownRendererProps = {
  content: string;
};

const getTextFromReactNode = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getTextFromReactNode).join('');
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return getTextFromReactNode(element.props.children);
  }

  return '';
};

const CodeRenderer: React.FC<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
> = ({ className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const [viewSvg, setViewSvg] = useState(false);

  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match?.[1] : '';
  const isSVG = language === 'svg';

  const handleCopy = async (content: React.ReactNode) => {
    try {
      const text = getTextFromReactNode(content);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      displayToastError('Failed to copy to clipboard');
    }
  };

  return !language ? (
    <code
      {...props}
      className="border border-color-border bg-primary/10 text-color-accent py-0.5 px-1.5 rounded-md text-xs font-mono whitespace-break-spaces"
    >
      {children}
    </code>
  ) : (
    <>
      <span className="top-0 z-40 flex items-center justify-between w-full sticky border border-color-border border-b-0 rounded-t-md !py-2 !px-3 pb-0 bg-muted/80 text-color-muted-foreground text-xs">
        <span>{language}</span>
        <div className="flex gap-2">
          {isSVG && (
            <Tooltip>
              <TooltipTrigger>
                {viewSvg ? (
                  <MessageSquareCode
                    className="size-3"
                    onClick={() => setViewSvg(false)}
                  />
                ) : (
                  <ScanEye
                    className="size-3"
                    onClick={() => setViewSvg(true)}
                  />
                )}
              </TooltipTrigger>
              <TooltipContent>View Image</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger>
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" onClick={() => handleCopy(children)} />
              )}
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
        </div>
      </span>
      {viewSvg ? (
        <span
          className="block w-full relative border border-color-border border-t-0 rounded-b-md !p-3.5 !bg-background/80 !text-sm !pt-2 mb-2"
          dangerouslySetInnerHTML={{
            __html: getTextFromReactNode(children),
          }}
        />
      ) : (
        <code
          className={cn(
            className,
            'relative border border-color-border border-t-0 rounded-b-md !p-3.5 !bg-background/80 !text-sm !pt-2 mb-2'
          )}
          {...props}
        >
          {children}
        </code>
      )}
    </>
  );
};

const _MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="break-words">
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-4xl font-bold mb-2 last:mb-0 text-color-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl mb-2 font-bold last:mb-0 text-color-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl mb-2 font-bold last:mb-0 text-color-foreground">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xl mb-2 font-bold last:mb-0 text-color-foreground ">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-lg mb-2 font-bold last:mb-0 text-color-foreground ">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-base mb-2 font-bold last:mb-0 text-color-foreground ">
              {children}
            </h6>
          ),

          p: ({ children }) => (
            <p className="mb-3.5 last:mb-0 text-color-muted-foreground text-sm/[22px] font-body break-words">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3.5 last:mb-0 text-color-muted-foreground text-sm/[21px]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3.5 last:mb-0 text-color-muted-foreground text-sm/[21px] font-body">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          em: ({ children }) => (
            <em className="text-color-foreground font-body">{children}</em>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-color-foreground font-body">
              {children}
            </strong>
          ),
          hr: () => <hr className="my-3.5 border-color-border" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-color-border pl-3.5 mb-3.5 last:mb-0 text-color-muted-foreground text-sm/[21px] font-body rounded-l-md bg-color-muted/20">
              {children}
            </blockquote>
          ),

          table: ({ children }) => (
            <div className="overflow-x-auto mb-3.5 last:mb-0">
              <table
                className="w-full mb-3.5 last:mb-0 text-sm/[21px] border-separate border-spacing-0 [&>tbody>tr:last-child>td:first-child]:rounded-bl-lg
                    [&>tbody>tr:last-child>td:last-child]:rounded-br-lg "
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="text-color-foreground">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left font-bold px-3.5 py-2 bg-color-card border-t border-r border-b first:border-l border-color-border first:rounded-tl-lg last:rounded-tr-lg">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="text-left px-3.5 py-2 text-color-muted-foreground border-r border-b first:border-l border-color-border">
              {children}
            </td>
          ),

          a: ({ node, children, ...props }) => (
            <a
              {...props}
              className="text-color-accent hover:text-color-accent/90 visited:text-color-accent/50 underline underline-offset-2 transition-colors font-body"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ node, ...props }) => {
            if (props.src === 'internal-file')
              return (
                <div className="flex">
                  <div className="flex flex-col gap-1 items-start">
                    <FileIcon className="size-40" />
                    <span className="text-xs truncate max-w-[160px]">
                      {props.alt}
                    </span>
                  </div>
                </div>
              );
            return (
              <img
                {...props}
                alt={'Image'}
                src={props.src || props.alt}
                className="max-w-xs w-full aspect-video object-cover rounded-md border border-color-border mt-4 mb-2 last:mb-0 shadow-sm"
                loading="lazy"
              />
            );
          },

          code({ node, ...props }) {
            return <CodeRenderer {...props} />;
          },
        }}
      />
    </div>
  );
};

export const MarkdownRenderer = memo(
  _MarkdownRenderer,
  (prevProps, nextProps) => prevProps.content === nextProps.content
);
