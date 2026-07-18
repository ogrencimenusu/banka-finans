import React, { useRef, useEffect } from 'react';

const RichTextEditor = React.memo(({ value, onChange, placeholder, className, onBlur }) => {
  const editorRef = useRef(null);

  // Update editor content only if it's different from the value prop
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      if (currentHtml !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const execCommand = (command) => {
    document.execCommand(command, false, null);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className={`border rounded-4 bg-white overflow-hidden w-100 ${className || ''}`}>
      <div className="d-flex align-items-center gap-1 p-2 bg-light border-bottom">
        <button type="button" className="btn btn-sm btn-light text-secondary rounded-2" onClick={() => execCommand('bold')} title="Kalın"><i className="bi bi-type-bold"></i></button>
        <button type="button" className="btn btn-sm btn-light text-secondary rounded-2" onClick={() => execCommand('italic')} title="İtalik"><i className="bi bi-type-italic"></i></button>
        <button type="button" className="btn btn-sm btn-light text-secondary rounded-2" onClick={() => execCommand('underline')} title="Altı Çizili"><i className="bi bi-type-underline"></i></button>
        <button type="button" className="btn btn-sm btn-light text-secondary rounded-2" onClick={() => execCommand('strikethrough')} title="Üstü Çizili"><i className="bi bi-type-strikethrough"></i></button>
        <div className="border-start mx-1 opacity-25" style={{ height: '20px' }}></div>
        <button type="button" className="btn btn-sm btn-light text-secondary rounded-2" onClick={() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const container = selection.getRangeAt(0).commonAncestorContainer;
            const node = container.nodeType === 3 ? container.parentNode : container;
            if (node.closest('blockquote')) {
              document.execCommand('formatBlock', false, 'p');
            } else {
              document.execCommand('formatBlock', false, 'blockquote');
            }
            if (editorRef.current) onChange(editorRef.current.innerHTML);
          }
        }} title="Alıntı"><i className="bi bi-quote"></i></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="form-control border-0 p-3 shadow-none"
        style={{ minHeight: '120px', outline: 'none' }}
        placeholder={placeholder}
        onInput={(e) => onChange(e.target.innerHTML)}
        onKeyUp={(e) => onChange(e.target.innerHTML)}
        onBlur={(e) => {
          onChange(e.target.innerHTML);
          if (onBlur) onBlur(e);
        }}
      />
    </div>
  );
});

export default RichTextEditor;
