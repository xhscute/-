import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, FileText, Bot, User } from 'lucide-react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', content: '你好！我是你的 AI 助手。我可以帮你分析图片或处理文档，请上传文件或直接提问。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // 用于图片预览
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ⚠️ 警告：真实项目中请勿将 API Key 暴露在前端。请务必通过后端转发。
  const VOLCES_API_KEY = "4e8d4d0c-57b6-432c-9c5d-df9c1d447366";
  const VOLCES_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  const VOLCES_MODEL = "doubao-seed-1-6-vision-250815"; // 你要使用的模型

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 将文件转为 Base64 编码的 Data URL
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file); // 读取文件为 Data URL (Base64)
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // 处理文件选择
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // 如果是图片，创建预览 URL
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        // 非图片文件清除预览
        setPreviewUrl(null);
      }
    }
  };

  // 清除选中的文件
  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = ''; // 清除 input file 的值
  };

  // 发送消息
  const handleSend = async () => {
    // 检查是否有内容或文件，且当前不在加载中
    if ((!input.trim() && !selectedFile) || isLoading) return;

    // 1. 构建用户消息对象用于前端展示
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      file: selectedFile ? {
        name: selectedFile.name,
        type: selectedFile.type,
        preview: previewUrl // 图片文件有预览，非图片文件为 null
      } : null
    };

    setMessages(prev => [...prev, userMessage]); // 添加用户消息到列表
    setInput(''); // 清空输入框
    setIsLoading(true); // 设置加载状态

    try {
      let contentPayload = [];

      // A. 如果有文本输入，添加文本内容到 payload
      if (input.trim()) {
        contentPayload.push({
          type: "text",
          text: input
        });
      }

      // B. 如果有选中的图片文件，将其转换为 Base64 并添加到 payload
      if (selectedFile && selectedFile.type.startsWith('image/')) {
        const base64Image = await fileToBase64(selectedFile); // 将文件转为 Base64 Data URL
        contentPayload.push({
          type: "image_url",
          image_url: {
            url: base64Image // Base64 Data URL 直接作为图片的 url
          }
        });
      } else if (selectedFile && !selectedFile.type.startsWith('image/')) {
        // 如果是其他类型文件，目前该视觉模型API不直接支持文件内容上传，
        // 只能提示用户或上传文件名称。这里我们仅提示文件已上传，不将其内容发送给Vision模型。
        // 如果后端需要处理，则需要另一个单独的API接口。
        contentPayload.push({
          type: "text",
          text: `我上传了文件：${selectedFile.name}。请根据我的文本消息进行回复。`
        });
      }
      
      // 如果没有任何文本或图片内容，但用户尝试发送，则不进行API调用
      if (contentPayload.length === 0) {
        throw new Error("没有可发送的文本或图片内容。");
      }

      // C. 构造最终的请求体，符合火山引擎 chat completions API 格式
      const payload = {
        model: VOLCES_MODEL,
        messages: [
          {
            role: "user",
            content: contentPayload
          }
        ]
      };

      // D. 发起请求
      const response = await fetch(VOLCES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VOLCES_API_KEY}` // 使用你的 API Key
        },
        body: JSON.stringify(payload) // 将 payload 对象转换为 JSON 字符串
      });

      if (!response.ok) {
        // 如果响应不成功，尝试解析错误信息
        const errData = await response.json();
        throw new Error(errData.error?.message || '网络请求失败');
      }

      const data = await response.json(); // 解析 JSON 响应

      // E. 解析返回结果并添加 AI 回复
      const aiContent = data.choices[0]?.message?.content || "AI 没有返回内容。";

      const aiMessage = {
        id: Date.now() + 1,
        role: 'ai',
        content: aiContent
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message to Volces API:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        content: `抱歉，处理您的请求时出现了错误: ${error.message}`
      }]);
    } finally {
      setIsLoading(false); // 结束加载状态
      clearFile(); // 清除选中的文件和预览
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* 头部 */}
      <div className="bg-white border-b px-6 py-4 flex items-center shadow-sm">
        <Bot className="w-6 h-6 text-blue-600 mr-2" />
        <h1 className="font-bold text-lg text-gray-800">AI 智能助手 (火山引擎 Vision)</h1>
      </div>

      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* 头像 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-gray-800 mr-3' // 互换颜色，让用户头像蓝色，AI头像灰色
              }`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
              </div>

              {/* 消息气泡 */}
              <div className={`p-4 rounded-2xl shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white rounded-tr-none' // 用户消息气泡使用蓝色背景
                  : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none' // AI 消息气泡使用白色背景
              }`}>
                {/* 如果有图片，显示图片 */}
                {msg.file && msg.file.type.startsWith('image/') && (
                  <div className="mb-3">
                    <img 
                      src={msg.file.preview} 
                      alt="Upload" 
                      className="max-w-full h-auto rounded-lg border max-h-64 object-cover" 
                    />
                  </div>
                )}
                
                {/* 如果是文件，显示文件卡片 */}
                {msg.file && !msg.file.type.startsWith('image/') && (
                   <div className="flex items-center p-3 bg-gray-100 rounded-lg mb-3">
                     <FileText className="w-5 h-5 text-gray-500 mr-2" />
                     <span className="text-sm text-gray-600 truncate">{msg.file.name}</span>
                   </div>
                )}

                <div className={`whitespace-pre-wrap text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-tl-none border shadow-sm ml-11">
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

      {/* 底部输入区域 */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          {/* 文件预览区域 (在输入框上方) */}
          {selectedFile && (
            <div className="flex items-center mb-2 p-2 bg-gray-50 rounded-lg border inline-block relative group">
              {previewUrl ? ( // 如果是图片显示图片预览
                <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
              ) : ( // 否则显示文件图标
                <FileText className="w-10 h-10 text-gray-500 p-1" />
              )}
              <div className="ml-3 mr-6">
                <p className="text-xs font-medium text-gray-700 truncate max-w-[150px]">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button 
                onClick={clearFile}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600 transition"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* 输入框与按钮 */}
          <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 ring-blue-100 transition-all">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden" // 隐藏默认的文件输入框
              accept="image/*, .pdf, .doc, .docx, .txt" // 限制接受的文件类型
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()} // 点击按钮触发隐藏的文件输入框
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition"
              title="上传图片或文件"
            >
              <Paperclip size={20} />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { // 回车发送，Shift+回车换行
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入消息..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-sm"
              rows={1} // 初始一行
              style={{ minHeight: '40px' }} // 最小高度
            />

            <button 
              onClick={handleSend}
              disabled={(!input.trim() && !selectedFile) || isLoading} // 禁用条件
              className={`p-2 rounded-lg transition-all ${
                (!input.trim() && !selectedFile) || isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">AI 可能会产生错误，请核对重要信息。</p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
