import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { ChatMessage, Employee, UserProfile } from '../types';

interface AskDataViewProps {
  currentUser: UserProfile;
  employees: Employee[];
  onShowModal: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
}

export const AskDataView: React.FC<AskDataViewProps> = ({
  currentUser,
  employees,
  onShowModal,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `Hello ${currentUser.name}! I am your People Analytics Studio AI assistant. I have live access to your dataset of ${employees.length} workforce records across Engineering, Sales, Operations, Finance, HR, and Marketing.

You can ask me questions about turnover rates, compensation gaps, tenure cohorts, flight risk factors, or departmental benchmarks. How can I help you today?`,
      timestamp: 'Just now',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const samplePrompts = [
    'Which department had the highest turnover rate in 2026?',
    'What is the average salary difference between Engineering and Sales?',
    'What are the primary exit reasons reported by terminated employees?',
    'Are employees with low engagement scores at higher flight risk?',
  ];

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isSubmitting]);

  const handleSendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isSubmitting) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsSubmitting(true);

    // Compute real dynamic summary to send as context
    const activeStaff = employees.filter((e) => e.status === 'Active');
    const exits = employees.filter((e) => e.status === 'Terminated');
    const turnoverRate = employees.length > 0 ? ((exits.length / employees.length) * 100).toFixed(1) : '0.0';
    const avgSal = employees.length > 0 ? Math.round(employees.reduce((a, b) => a + b.salary, 0) / employees.length) : 0;

    const deptMap: Record<string, { total: number; exits: number }> = {};
    employees.forEach((e) => {
      if (!deptMap[e.department]) deptMap[e.department] = { total: 0, exits: 0 };
      deptMap[e.department].total++;
      if (e.status === 'Terminated') deptMap[e.department].exits++;
    });

    const deptBreakdown = Object.entries(deptMap)
      .map(([d, stat]) => `${d} (${stat.total} staff, ${stat.exits} exits)`)
      .join(', ');

    const summary = `Headcount: ${employees.length} total (${activeStaff.length} active, ${exits.length} terminated). Turnover: ${turnoverRate}%. Average Salary: $${avgSal.toLocaleString()}. Departments: ${deptBreakdown}.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          datasetSummary: summary,
          history: messages.slice(-4),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.text || 'Analysis completed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: data.source,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error('Server returned an error');
      }
    } catch (err: any) {
      // Dynamic fallback based on real metrics
      let maxDept = 'Operations';
      let maxExits = 0;
      Object.entries(deptMap).forEach(([d, stat]) => {
        if (stat.exits > maxExits) {
          maxExits = stat.exits;
          maxDept = d;
        }
      });

      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Analysis across your active dataset of ${employees.length} records:\n• Total Headcount: ${activeStaff.length} active staff with an average base salary of $${avgSal.toLocaleString()}.\n• Department with Most Departures: ${maxDept} with ${maxExits} exits recorded.\n• Overall Organization Turnover: ${turnoverRate}%.\n• Recommendation: Conduct compensation and retention check-ins with high performers to maintain stability.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClear = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: 'Chat history cleared. How can I assist with your people analytics data today?',
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-800/40 border border-slate-800 rounded-3xl flex flex-col h-[calc(100vh-145px)] shadow-2xl overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-sm block">AI HR Analyst Assistant</span>
            <span className="text-[10px] text-emerald-400 font-medium">
              Ready • Querying {employees.length} workforce records
            </span>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800/60 overflow-x-auto custom-scrollbar flex items-center space-x-2 shrink-0">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap pl-1">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>Suggestions:</span>
        </span>
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(prompt)}
            className="text-xs bg-slate-900 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 px-3 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-md relative group ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                <div
                  className={`mt-2 flex items-center justify-between text-[10px] ${
                    isUser ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-700">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isSubmitting && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Analyzing workforce metrics and synthesizing response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt(inputPrompt);
          }}
          className="flex items-center space-x-3"
        >
          <input
            type="text"
            placeholder="Ask anything about your HR dataset (e.g. Which department has highest turnover?)"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={isSubmitting || !inputPrompt.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium px-5 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
