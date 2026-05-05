"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Code, 
  Eye, 
  Save, 
  Download, 
  Upload, 
  Plus,
  Braces,
  Smartphone,
  Monitor
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { message, Tooltip, Upload as AntUpload, Segmented } from "antd";
import beautify from 'prettier/standalone';
import parserHtml from 'prettier/plugins/html';

interface EmailEditorProps {
  template: any;
  onSave: (id: string, content: string) => Promise<void>;
  onBack: () => void;
}

// const MERGE_FIELDS = {
//   Employee: [
//     { label: "Full Name", value: "{{Employee_Name__c}}" },
//     { label: "Email", value: "{{Employee_Email__c}}" },
//     { label: "Role", value: "{{Role__c}}" },
//     { label: "Department", value: "{{Department__c}}" },
//     { label: "Employee ID", value: "{{Employee_ID__c}}" },
//     { label: "Reporting Manager", value: "{{Team_Lead__r.Name}}" },
//   ],
//   Leave: [
//     { label: "Leave Type", value: "{{Leave_Type__c}}" },
//     { label: "Start Date", value: "{{From_Date__c}}" },
//     { label: "End Date", value: "{{To_Date__c}}" },
//     { label: "Reason", value: "{{Reason__c}}" },
//     { label: "Status", value: "{{Status__c}}" },
//     { label: "Duration", value: "{{Days_Count__c}}" },
//   ],
//   General: [
//     { label: "Recipient Name", value: "{{recipientName}}" },
//     { label: "Current Date", value: "{{Current_Date}}" },
//     { label: "Company Name", value: "{{Company_Name}}" },
//     { label: "Login URL", value: "{{Login_URL}}" },
//   ]
// };

export default function EmailEditor({ template, onSave, onBack }: EmailEditorProps) {
  const [content, setContent] = useState(template.Value__c || `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: sans-serif; }
</style>
</head>
<body>
  <h1>New Template</h1>
</body>
</html>`);
  
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [viewDevice, setViewDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update iframe content when content state changes
  useEffect(() => {
    if (iframeRef.current && mode === 'visual') {
       const doc = iframeRef.current.contentDocument;
       if (doc) {
           doc.open();
           doc.write(content);
           doc.close();
           
           // Inject contenteditable logic
           doc.body.contentEditable = "true";
           doc.designMode = "on";
           
           // Add simple styles for editing experience
           const style = doc.createElement('style');
           style.setAttribute('data-editor-style', 'true');
           style.textContent = `
             body { min-height: 100vh; outline: none; }
             *:hover { outline: 1px dashed #3b82f6; }
             /* Hide scrollbars for cleaner look if needed */
           `;
           doc.head.appendChild(style);

           // Listen for changes
           const observer = new MutationObserver(() => {
               // We only update state on specific events to avoid cursor jumping, 
               // but for raw editing, we might need a save button or blur event
           });
           observer.observe(doc.body, { subtree: true, childList: true, characterData: true, attributes: true });
           
           // Sync back to state on blur/input
           const handleInput = () => {
               // We don't auto-update state on every keystroke to prevent re-render flashing 
               // in this naive implementation. Ideally we'd use a more robust sync.
               // For now, let's rely on explicit "Sync" or just capture on Save.
               // But user expects state to be fresh.
               
               // Let's capture strictly on blur to be safe or use a debounced approach
           };
           
           doc.body.addEventListener('input', () => {
               // Optional: Auto-expand height? 
           });
           
           doc.body.addEventListener('blur', () => {
               // The visual editor might lose focus, so we sync changes.
               // We need to use a short timeout because syncContentFromIframe references iframeRef 
               // and if we execute it synchronously it might sometimes miss the latest keystroke.
               setTimeout(() => {
                   setContent(syncContentFromIframe());
               }, 10);
           });
       }
    }
  }, [mode]); // Re-run when switching to visual to refresh iframe

  // Sync content from iframe before saving or switching
  const syncContentFromIframe = () => {
    if (iframeRef.current && iframeRef.current.contentDocument) {
      const doc = iframeRef.current.contentDocument;

      const clone = doc.documentElement.cloneNode(true) as HTMLElement;

      // Remove editor styles from clone only
      clone.querySelectorAll('style[data-editor-style]').forEach(el => el.remove());
      clone.querySelectorAll('[contenteditable]').forEach(el => {
        el.removeAttribute('contenteditable');
      });

      const html = clone.outerHTML;      
      return `<!DOCTYPE html>\n${html}`;
    }    
    return content;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentContent = syncContentFromIframe();
      await onSave(template.Id, currentContent);
      message.success("Template saved successfully");
    } catch (e) {
      console.error(e);
      message.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const insertMergeField = (field: string) => {
    if (mode === 'visual' && iframeRef.current?.contentDocument) {
        const doc = iframeRef.current.contentDocument;
        doc.execCommand('insertText', false, field);
        message.success(`Inserted ${field}`);
    } else {
        navigator.clipboard.writeText(field);
        message.info(`Copied ${field} to clipboard.`);
    }
  };

  const formatCode = async () => {
      try {
        let textToFormat = mode === 'visual' ? syncContentFromIframe() : content;
        
        const formatted = await beautify.format(textToFormat, {
            parser: 'html',
            plugins: [parserHtml],
            htmlWhitespaceSensitivity: 'ignore'
        });
        
        setContent(formatted);
        if (mode === 'visual' && iframeRef.current?.contentDocument) {
             iframeRef.current.contentDocument.open();
             iframeRef.current.contentDocument.write(formatted);
             iframeRef.current.contentDocument.close();
             iframeRef.current.contentDocument.body.contentEditable = "true";
        }
        message.success("Code formatted");
      } catch(e) {
          message.error("Could not format code");
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh)] bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{template.MasterLabel}</h2>
            <p className="text-xs text-slate-500 font-mono">{template.DeveloperName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            {mode === 'visual' && (
                <div className="bg-slate-200 p-1 rounded-lg flex">
                    <button 
                        onClick={() => setViewDevice('desktop')}
                        className={`p-2 rounded-md transition ${viewDevice === 'desktop' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Desktop View"
                    >
                        <Monitor className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setViewDevice('mobile')}
                        className={`p-2 rounded-md transition ${viewDevice === 'mobile' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Mobile View"
                    >
                        <Smartphone className="w-4 h-4" />
                    </button>
                </div>
            )}

           <div className="bg-slate-200 p-1 rounded-lg flex text-sm font-medium text-slate-600">
               <button 
                onClick={() => {
                    if(mode === 'code') {
                         // Going to visual, content state is already fresh from Monaco onChange
                    } 
                    setMode("visual");
                }}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition ${mode === "visual" ? "bg-white shadow-sm text-blue-600" : "hover:text-slate-900"}`}
               >
                   <Eye className="w-4 h-4" /> Visual
               </button>
               <button 
                onClick={() => {
                     // Going to code, sync from iframe first
                     if(mode === 'visual') {
                         setContent(syncContentFromIframe());
                     }
                     setMode("code");
                }}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition ${mode === "code" ? "bg-white shadow-sm text-blue-600" : "hover:text-slate-900"}`}
               >
                   <Code className="w-4 h-4" /> Code
               </button>
           </div>
           
           <button 
                onClick={formatCode}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                title="Format Code / Prettify"
           >
                <Braces className="w-5 h-5" />
           </button>

           <div className="h-6 w-px bg-slate-300 mx-2"></div>
           
           <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-semibold transition shadow-lg disabled:opacity-50"
           >
               {saving ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
               Save
           </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col relative bg-slate-100/50">
            {mode === 'visual' ? (
                <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                    <div 
                        className={`bg-white shadow-2xl transition-all duration-300 overflow-hidden ${
                            viewDevice === 'mobile' ? 'w-[375px] h-[667px] rounded-3xl border-4 border-slate-800' : 'w-full max-w-[800px] h-full rounded-md border border-slate-200'
                        }`}
                    >
                        <iframe 
                            ref={iframeRef}
                            className="w-full h-full"
                            title="Email Preview"
                            frameBorder="0"
                        />
                    </div>
                </div>
            ) : (
                <div className="flex-1 relative">
                    <Editor 
                        height="100%"
                        defaultLanguage="html"
                        value={content}
                        onChange={(value) => setContent(value || "")}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            wordWrap: 'on',
                            theme: 'vs-light',
                            padding: { top: 20, bottom: 20 },
                            formatOnPaste: true,
                            formatOnType: true
                        }}
                    />
                </div>
            )}
        </div>

        {/* Sidebar: Merge Fields */}
        {/* <div className="bg-white border-l border-slate-200 flex flex-col z-10 shadow-lg">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Braces className="w-4 h-4 text-purple-500" /> Merge Fields
                </h3>
                <p className="text-xs text-slate-500 mt-1">Click to insert dynamic values</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                 {Object.entries(MERGE_FIELDS).map(([category, fields]) => (
                     <div key={category} className="mb-4">
                         <h4 className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">{category}</h4>
                         <div className="space-y-1">
                             {fields.map(field => (
                                 <button 
                                    key={field.value}
                                    onClick={() => insertMergeField(field.value)}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition group flex items-center justify-between"
                                 >
                                     <span className="truncate">{field.label}</span>
                                     <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-400" />
                                 </button>
                             ))}
                         </div>
                     </div>
                 ))}
            </div>
        </div> */}
      </div>
    </div>
  );
}
