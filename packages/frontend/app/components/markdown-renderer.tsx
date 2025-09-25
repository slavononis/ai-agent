import 'highlight.js/styles/github-dark.css';

import { Check, Copy } from 'lucide-react';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

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

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
}) => {
  const [copied, setCopied] = useState(false);

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

  return (
    <ReactMarkdown
      children={content}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-4xl font-bold mb-2 last:mb-0 text-white font-arima">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-3xl mb-2 text-white last:mb-0 font-arima">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-2xl mb-2 text-white last:mb-0 font-arima">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-xl mb-2 text-white last:mb-0 font-arima">
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5 className="text-lg mb-2 text-white last:mb-0 font-arima">
            {children}
          </h5>
        ),
        h6: ({ children }) => (
          <h6 className="text-base text-white mb-2 last:mb-0 font-arima">
            {children}
          </h6>
        ),
        p: ({ children }) => (
          <p className="mb-3.5 last:mb-0 text-[#DCD6D1] text-sm/[22px]">
            {children}
          </p>
        ),
        span: ({ children }) => (
          <span className="text-[#DCD6D1] text-xs">{children}</span>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3.5 last:mb-0 text-[#DCD6D1] text-sm/[21px]">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3.5 last:mb-0 text-[#DCD6D1] text-sm/[21px]">
            {children}
          </ol>
        ),
        em: ({ children }) => <em className="text-white">{children}</em>,
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        hr: () => <hr className="my-3.5 bg-[#423E39]" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 rounded-l border-[#423E39] pl-3.5 mb-3.5 last:mb-0 text-[#DCD6D1] text-sm/[21px]">
            {children}
          </blockquote>
        ),
        table: ({ children }) => {
          return (
            <div className="overflow-x-auto">
              <table
                className="w-full mb-3.5 last:mb-0 text-sm/[21px] border-separate border-spacing-0 [&>tbody>tr:last-child>td:first-child]:rounded-bl-lg
                    [&>tbody>tr:last-child>td:last-child]:rounded-br-lg "
              >
                {children}
              </table>
            </div>
          );
        },
        thead: ({ children }) => (
          <thead className="text-white">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="text-left font-bold px-3.5 py-2  bg-[#2C1810] border-t border-r border-b first:border-l border-[#423E39] first:rounded-tl-lg last:rounded-tr-lg">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="text-left px-3.5 py-2 text-[#DCD6D1]  border-r border-b first:border-l border-[#423E39]">
            {children}
          </td>
        ),

        a: ({ node, children, ...props }) => (
          <a
            {...props}
            className="text-[#D08700] hover:text-[#D08700]/90 transition-colors visited:text-[#D08700]/50 underline underline-offset-2  items-center"
            target="_blank"
            rel="noreferrer"
          >
            {children}
          </a>
        ),
        img: ({ node, ...props }) => (
          <img
            {...props}
            className="max-w-full h-auto rounded-md border border-[#364153] mt-4 mb-2 last:mb-0"
            loading="lazy"
          />
        ),

        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match?.[1] : '';

          return !language ? (
            <code
              {...props}
              className="border border-[#364153] bg-[#1E2939] text-[#FF6467] py-0.5 px-1.5 rounded-[4px] text-xs"
            >
              {children}
            </code>
          ) : (
            <>
              <span className="top-0 z-10 flex items-center justify-between w-full sticky border border-[#423E39] border-b-0 rounded-t-md p-3.5 pb-0 !bg-[#281B10]  !text-[#99A1AF] text-xs">
                <span>{language}</span>
                <Tooltip>
                  <TooltipTrigger>
                    {copied ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy
                        className="size-3"
                        onClick={() => handleCopy(children)}
                      />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>
              </span>
              <code
                className={cn(
                  className,
                  'relative border border-[#423E39] border-t-0 rounded-b-md !p-3.5 !bg-[#281B10] [&_*]:!text-[#DF9305] !text-[#DF9305] text-sm !pt-2 mb-2'
                )}
                {...props}
              >
                {children}
              </code>
            </>
          );
        },
      }}
    />
  );
};
