import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  Loader2, 
  ShoppingBag, 
  Check,
  Camera 
} from 'lucide-react';
import type { Article, ChatMessage } from '../types';
import { askAssistant, searchByVision, resolveImageUrl } from '../services/api';

interface AiAssistantWidgetProps {
  onAddToCart: (article: Article) => void;
  cartArticleIds: Set<number>;
}

const INITIAL_PROMPTS = [
  "📸 Rechercher par photo",
  "Légumes frais ?",
  "Smartphones & tech",
];

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({
  onAddToCart,
  cartArticleIds,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Bonjour ! Je suis l'assistant intelligent de Lafi. Dites-moi ce que vous cherchez, je vous aide à trouver les meilleurs produits au bon prix dans les boutiques d'Abidjan.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputValue('');
    setLoading(true);

    try {
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await askAssistant(text, history);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
        recommended_articles: res.recommended_articles,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            "Désolé, je rencontre une petite difficulté pour consulter les boutiques actuellement. Réessayez dans un instant.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessImage = async (file: File) => {
    if (loading) return;
    const previewUrl = URL.createObjectURL(file);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: 'Recherche par photo',
      image_url: previewUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await searchByVision(file);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          res.reply ||
          "J'ai analysé votre photo avec notre modèle visuel. Voici les articles correspondants trouvés :",
        recommended_articles: res.recommended_articles,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            err.message ||
            "Désolé, je n'ai pas pu analyser cette photo. Essayez avec une image plus nette ou décrivez l'article par écrit.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImage(file);
    }
  };

  const handlePromptClick = (prompt: string) => {
    if (prompt.includes('photo')) {
      fileInputRef.current?.click();
    } else {
      handleSendMessage(prompt);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleProcessImage(file);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-2xl hover:shadow-blue-600/40 transition-all duration-300 transform hover:scale-105 border-0 cursor-pointer"
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold leading-tight">Assistant IA Lafi</p>
            <p className="text-[10px] text-blue-100">Conseil d'achat en direct</p>
          </div>
        </button>
      )}

      {/* Floating Chat Window Sans Contour Tout en Blanc (Style Fiche Produit) */}
      {isOpen && (
        <div className="bg-white rounded-3xl shadow-2xl border-0 ring-0 w-[92vw] sm:w-[350px] h-[480px] max-h-[82vh] flex flex-col overflow-hidden animate-slideUp">
          {/* Header Tout en Blanc Sans Bannière (style Fiche Produit) */}
          <div className="p-4 pb-3 bg-white flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs text-slate-900">Assistant IA Lafi</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[10px] text-slate-500">Conseil d'achat en direct</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition border-0 cursor-pointer"
              title="Fermer"
              aria-label="Fermer l'assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Flow */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F8FAFC]"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 rounded-bl-none shadow-sm border-0'
                  }`}
                >
                  {/* Image soumise par l'utilisateur */}
                  {msg.image_url && (
                    <div className="mb-2 overflow-hidden rounded-xl bg-black/10">
                      <img
                        src={msg.image_url}
                        alt="Photo envoyée"
                        className="w-full max-h-36 object-cover rounded-xl"
                      />
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Recommended Products Carousel/List inside message */}
                  {msg.recommended_articles && msg.recommended_articles.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Articles trouvés pour vous :
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                        {msg.recommended_articles.map((art) => {
                          const inCart = cartArticleIds.has(art.id);
                          return (
                            <div
                              key={art.id}
                              className="flex items-center gap-2 p-1.5 bg-[#F8FAFC] hover:bg-slate-100 rounded-xl transition border-0"
                            >
                              <img
                                src={resolveImageUrl(art.photo_url)}
                                alt={art.name}
                                className="w-9 h-9 rounded-lg object-cover bg-white shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-slate-900 truncate">{art.name}</p>
                                <p className="text-[10px] font-black text-blue-600">
                                  {new Intl.NumberFormat('fr-FR').format(art.price)} FCFA
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onAddToCart(art)}
                                className={`p-1.5 rounded-lg text-xs transition border-0 cursor-pointer ${
                                  inCart
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                                title={inCart ? "Dans le panier" : "Ajouter au panier"}
                              >
                                {inCart ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-2.5 bg-white rounded-2xl rounded-bl-none shadow-sm border-0 w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span className="text-[11px] text-slate-500">L'IA analyse votre photo ou consulte les rayons...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
              {INITIAL_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePromptClick(prompt)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-full whitespace-nowrap transition border-0 text-[10px] font-semibold cursor-pointer shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Hidden File Input for Image Search */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/*"
            className="hidden"
          />

          {/* Input Area */}
          <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-full transition border-0 shrink-0 cursor-pointer disabled:opacity-40"
              title="Rechercher par photo (IA MobileNetV2)"
              aria-label="Rechercher par photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Question ou photo..."
              className="flex-1 px-3.5 py-2 bg-slate-100 text-xs rounded-full border-0 focus:outline-none focus:bg-slate-50 transition text-slate-900 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || loading}
              className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full transition shadow-md shadow-blue-600/20 border-0 shrink-0 cursor-pointer"
              title="Envoyer"
              aria-label="Envoyer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
