import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileText, Bot, User } from 'lucide-react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([{ id: 1, role: 'ai', content: '你好！我是你的 AI 助手。请上传图片/文件或直接提问。' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // API 配置（简化保留，非公开部署无需隐藏）
  const VOLCES_API_KEY = "4e8d4d0c-57b6-432c-9c5d-df9c1d447366";
  const VOLCES_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  const VOLCES_MODEL = "doubao-seed-1-6-vision-250815";

  // 自动滚动到底部
  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  // 文件转 Base64
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
  });

  // 选择文件
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(file));
      else setPreviewUrl(null);
    }
  };

  // 清除文件
  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    fileInputRef.current?.value = '';
  };

  // 发送消息
  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    // 新增用户消息
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: input,
      file: selectedFile ? { name: selectedFile.name, type: selectedFile.type, preview: previewUrl } : null
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const contentPayload = [];
      if (input.trim()) contentPayload.push({ type: "text", text: input });
      if (selectedFile?.type.startsWith('image/')) {
        const base64 = await fileToBase64(selectedFile);
        contentPayload.push({ type: "image_url", image_url: { url: base64 } });
      } else if (selectedFile) {
        contentPayload.push({ type: "text", text: `上传了文件：${selectedFile.name}` });
      }

      const res = await fetch(VOLCES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOLCES_API_KEY}` },
        body: JSON.stringify({ model: VOLCES_MODEL, messages: [{ role: 'user', content: contentPayload }] })
      });

      if (!res.ok) throw new Error('请求失败');
      const data = await res.json();
      const aiMsg = { id: Date.now() + 1, role: 'ai', content: data.choices[0]?.message?.content || '无回复' };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: `错误：${err.message}` }]);
    } finally {
      setIsLoading(false);
      clearFile();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* 头部 */}
      <div className="bg-white border-b px-6 py-4 flex items-center shadow-sm">
        <Bot className="w-6 h-6 text-blue-600 mr-2" />
        <h1 className="font-bold text-lg text-gray-800">AI 智能助手</h1>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* 头像 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-gray-800 mr-3'
              }`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
              </div>
              {/* 消息气泡 */}
              <div className={`p-4 rounded-2xl shadow-sm ${
                msg.role === 'user' ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-white border rounded-tl-none'
              }`}>
                {msg.file?.type.startsWith('image/') && (
                  <img src={msg.file.preview} alt="预览" className="max-w-full h-64 object-cover rounded-lg mb-3" />
                )}
                {msg.file && !msg.file.type.startsWith('image/') && (
                  <div className="flex items-center p-3 bg-gray-100 rounded-lg mb-3">
                    <FileText className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600 truncate">{msg.file.name}</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start ml-11">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          {/* 文件预览 */}
          {selectedFile && (
            <div className="flex items-center mb-2 p-2 bg-gray-50 rounded-lg border inline-block relative">
              {previewUrl ? <img src={previewUrl} alt="预览" className="w-12 h-12 object-cover rounded" /> : <FileText className="w-10 h-10 text-gray-500" />}
              <div className="ml-3 mr-6">
                <p className="text-xs font-medium text-gray-700 truncate max-w-[150px]">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={clearFile} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                <X size={12} />
              </button>
            </div>
          )}

          {/* 输入框与按钮 */}
          <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*, .pdf, .doc, .docx, .txt" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
              <Paperclip size={20} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="输入消息..."
              className="flex-1 bg-transparent border-none resize-none max-h-32 py-2 text-sm"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !selectedFile) || isLoading}
              className={`p-2 rounded-lg ${
                (!input.trim() && !selectedFile) || isLoading ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
