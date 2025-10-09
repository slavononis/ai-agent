import {
  DataContentBlock,
  HumanMessage,
  MessageContentComplex,
} from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
// @ts-ignore - Not support TS
import { Blob } from 'blob-polyfill';
import { AppMimeType, ALLOWED_MIME_TYPES } from './utils';

export async function createHumanMessage(
  text: string,
  files?: Express.Multer.File[]
): Promise<HumanMessage> {
  const content: (MessageContentComplex | DataContentBlock)[] = [
    { type: 'text', text: text },
  ];

  if (files) {
    for (const file of files) {
      const mime = (file.mimetype || '') as AppMimeType;
      const isImage = mime.startsWith('image/');
      const isAllowedDoc = ALLOWED_MIME_TYPES.has(mime as AppMimeType);

      if (!isImage && !isAllowedDoc) {
        continue;
      }

      if (isImage && file.buffer) {
        const base64 = file.buffer.toString('base64');
        content.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${base64}` },
        });
      } else {
        try {
          const buffer = file.buffer;
          if (!buffer) continue;

          const filename = file.originalname || 'unknown';
          const blob = new Blob([buffer], { type: mime });
          const createFileContent = (docs: Document<Record<string, any>>[]) => {
            const extracted = docs
              .map((doc: any) => doc.pageContent)
              .join('\n\n');
            content.push({
              type: 'file',
              filename,
              text: `--- Content of ${filename} ---\n${extracted}`,
            });
          };
          switch (mime) {
            case 'application/pdf': {
              const pdfLoader = new PDFLoader(blob, {
                pdfjs: () => import('pdfjs-dist/legacy/build/pdf.mjs'),
              });
              const docs = await pdfLoader.load();
              createFileContent(docs);
              break;
            }

            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
              const docxLoader = new DocxLoader(blob);
              const docs = await docxLoader.load();
              createFileContent(docs);
              break;
            }

            case 'text/csv': {
              const csvLoader = new CSVLoader(blob);
              const docs = await csvLoader.load();
              createFileContent(docs);
              break;
            }

            case 'text/plain': {
              const textLoader = new TextLoader(blob);
              const docs = await textLoader.load();
              createFileContent(docs);
              break;
            }

            case 'application/json': {
              const jsonLoader = new JSONLoader(blob);
              const docs = await jsonLoader.load();
              createFileContent(docs);
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error(`Error extracting ${file.originalname}:`, e);
        }
      }
    }
  }

  return new HumanMessage({ content });
}
