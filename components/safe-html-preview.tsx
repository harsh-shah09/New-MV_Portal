"use client";

import { useEffect, useRef } from "react";

interface SafeHTMLPreviewProps {
  html: string;
  className?: string;
}

export default function SafeHTMLPreview({ html, className }: SafeHTMLPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        // Reset styles for the iframe content to prevent browser defaults affecting layout too much in preview
        doc.write(`
          <style>
            body { 
                margin: 0; 
                padding: 0; 
                overflow: hidden; 
                transform-origin: top left;
                /* Scale down content to fit */
            }
            /* Scrollbar hiding */
            ::-webkit-scrollbar { display: none; }
          </style>
        `);
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className={className}
      title="Preview"
      sandbox="allow-same-origin" // Restrict scripts, strictly mostly for display
      scrolling="no"
    />
  );
}
