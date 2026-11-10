import React, { useMemo } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  BlockQuote,
  Table,
  TableToolbar,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageUpload,
  SimpleUploadAdapter,
  Autoformat,
  MediaEmbed,
  CodeBlock,
  HorizontalLine,
  Alignment,
  type EditorConfig,
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useAuthStore } from '../../store/useAuthStore';

interface CKEditor5Props {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CKEditor5: React.FC<CKEditor5Props> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung bài viết tin tức tại đây...',
  disabled = false,
}) => {
  const storeToken = useAuthStore((state) => state.token);
  const token = storeToken || localStorage.getItem(STORAGE_KEYS.TOKEN) || '';

  const editorConfig: EditorConfig = useMemo(() => {
    return {
      licenseKey: 'GPL',
      placeholder,
      plugins: [
        Essentials,
        Paragraph,
        Heading,
        Bold,
        Italic,
        Underline,
        Strikethrough,
        Link,
        List,
        BlockQuote,
        Table,
        TableToolbar,
        Image,
        ImageToolbar,
        ImageCaption,
        ImageStyle,
        ImageResize,
        ImageUpload,
        SimpleUploadAdapter,
        Autoformat,
        MediaEmbed,
        CodeBlock,
        HorizontalLine,
        Alignment,
      ],
      toolbar: {
        items: [
          'undo',
          'redo',
          '|',
          'heading',
          '|',
          'bold',
          'italic',
          'underline',
          'strikethrough',
          '|',
          'alignment',
          '|',
          'bulletedList',
          'numberedList',
          '|',
          'link',
          'uploadImage',
          'insertTable',
          'blockQuote',
          'codeBlock',
          'horizontalLine',
          'mediaEmbed',
        ],
        shouldNotGroupWhenFull: true,
      },
      heading: {
        options: [
          { model: 'paragraph' as const, title: 'Đoạn văn (Paragraph)', class: 'ck-heading_paragraph' },
          { model: 'heading1' as const, view: 'h1', title: 'Tiêu đề 1 (H1)', class: 'ck-heading_heading1' },
          { model: 'heading2' as const, view: 'h2', title: 'Tiêu đề 2 (H2)', class: 'ck-heading_heading2' },
          { model: 'heading3' as const, view: 'h3', title: 'Tiêu đề 3 (H3)', class: 'ck-heading_heading3' },
        ],
      },
      image: {
        toolbar: [
          'imageStyle:inline',
          'imageStyle:block',
          'imageStyle:side',
          '|',
          'toggleImageCaption',
          'imageTextAlternative',
          '|',
          'linkImage',
        ],
      },
      table: {
        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
      },
      simpleUpload: {
        uploadUrl: '/api/admin/articles/upload-image',
        headers: (token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}) as Record<string, string>,
      },
    };
  }, [placeholder, token]);

  return (
    <div className="ckeditor-wrapper prose max-w-none [&_.ck-editor__editable]:min-h-[320px] [&_.ck-editor__editable]:max-h-[600px] [&_.ck-editor__editable]:overflow-y-auto [&_.ck-toolbar]:border-slate-300 [&_.ck-toolbar]:bg-slate-50/70 [&_.ck-editor__editable]:bg-white [&_.ck-editor__editable]:text-slate-800 [&_.ck-content]:font-sans [&_.ck-content]:text-sm [&_.ck-content_h2]:text-xl [&_.ck-content_h2]:font-bold [&_.ck-content_h2]:text-slate-900 [&_.ck-content_h2]:mt-4 [&_.ck-content_h2]:mb-2 [&_.ck-content_h3]:text-lg [&_.ck-content_h3]:font-bold [&_.ck-content_h3]:text-slate-800 [&_.ck-content_p]:mb-3 [&_.ck-content_p]:leading-relaxed [&_.ck-content_ul]:list-disc [&_.ck-content_ul]:pl-5 [&_.ck-content_ol]:list-decimal [&_.ck-content_ol]:pl-5 [&_.ck-content_blockquote]:border-l-4 [&_.ck-content_blockquote]:border-blue-500 [&_.ck-content_blockquote]:pl-4 [&_.ck-content_blockquote]:italic [&_.ck-content_blockquote]:text-slate-600 [&_.ck-content_img]:rounded-xl [&_.ck-content_img]:my-3 [&_.ck-content_img]:shadow-sm">
      <CKEditor
        editor={ClassicEditor}
        config={editorConfig}
        data={value}
        disabled={disabled}
        onChange={(_event: any, editor: any) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
    </div>
  );
};

export default CKEditor5;
