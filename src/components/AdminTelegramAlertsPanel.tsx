import React, { useState } from 'react';
import { Send, BellRing, Bot, MessageSquare, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, Key, Hash, Smartphone, RefreshCw, ExternalLink } from 'lucide-react';
import { AdSettings } from '../types';

interface AdminTelegramAlertsPanelProps {
  adSettings: AdSettings;
  onUpdateSettings: (newSettings: Partial<AdSettings>) => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  triggerToast: (msg: string) => void;
}

export const AdminTelegramAlertsPanel: React.FC<AdminTelegramAlertsPanelProps> = ({
  adSettings,
  onUpdateSettings,
  getAuthHeaders,
  triggerToast,
}) => {
  const [botToken, setBotToken] = useState(adSettings.telegramBotToken || '');
  const [chatId, setChatId] = useState(adSettings.telegramChatId || '');
  const [alertsEnabled, setAlertsEnabled] = useState(adSettings.telegramAlertsEnabled !== false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    timestamp?: string;
  } | null>(null);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateSettings({
        telegramBotToken: botToken.trim(),
        telegramChatId: chatId.trim(),
        telegramAlertsEnabled: alertsEnabled,
      });
      triggerToast('✅ Telegram Bot सेटिङहरू सफलतापूर्वक सुरक्षित गरियो!');
    } catch {
      triggerToast('❌ सेटिङहरू सेभ गर्न सकिएन।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestAlert = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setTestResult({
        success: false,
        error: 'कृपया परीक्षण सन्देश पठाउनुअघि Bot Token र Chat ID दुवै भर्नुहोस्।',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          botToken: botToken.trim(),
          chatId: chatId.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: 'तपाईंको फोनमा Telegram मार्फत सफलतापूर्वक टेस्ट नोटिफिकेसन पठाइयो! 🚀',
          timestamp: new Date().toLocaleTimeString(),
        });
        triggerToast('🚀 टेलिग्राममा टेस्ट नोटिफिकेसन सफलतापूर्वक पठाइयो!');
      } else {
        setTestResult({
          success: false,
          error: data.error || 'टेलिग्राम बोटमा जडान हुन सकेन। कृपया Token र Chat ID जाँच गर्नुहोस्।',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err?.message || 'सर्भरमा जडान गर्दा त्रुटि उत्पन्न भयो।',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl text-xs">
      
      {/* Header Banner */}
      <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-zinc-900/60 to-zinc-900/90 p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white sm:text-xl">
                  Telegram Instant Withdrawal Alerts
                </h2>
                <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
                  लाइभ अलर्ट
                </span>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">
                कुनै प्रयोगकर्ताले ५ लाख पोइन्ट पुर्याएर eSewa वा Khalti मा विथड्र गर्दा तपाईंको टेलिग्राममा तुरुन्तै म्यासेज आउँछ।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-zinc-800/80 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={e => setAlertsEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-sky-500"
              />
              <span className="font-bold text-zinc-200 text-xs">अलर्ट सक्रिय (Enabled)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Grid: Form & Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Setup (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSave} className="rounded-2xl border border-white/10 bg-zinc-900/90 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-white text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-sky-400" />
                <span>बोट क्रेडिसियल (Bot Configuration)</span>
              </h3>
              <span className="text-[11px] text-zinc-400">Nepal Time Alerts</span>
            </div>

            {/* Telegram Bot Token */}
            <div>
              <label className="block font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-sky-400" />
                <span>१. Telegram Bot Token</span>
              </label>
              <p className="text-zinc-400 text-[11px] mb-2 leading-relaxed">
                Telegram को <span className="text-sky-300 font-bold">@BotFather</span> बाट प्राप्त भएको <code className="text-amber-300 font-mono">123456:ABC-DEF...</code> जस्तो टोकन यहाँ पेस्ट गर्नुहोस्।
              </p>
              <input
                type="text"
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                placeholder="उदा: 7891234567:AAFlm3N6Xqabcdef123456789"
                className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>

            {/* Telegram Chat ID */}
            <div>
              <label className="block font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-emerald-400" />
                <span>२. तपाईंको व्यक्तिगत Telegram Chat ID</span>
              </label>
              <p className="text-zinc-400 text-[11px] mb-2 leading-relaxed">
                जुन टेलिग्राम खातामा तपाईं अलर्ट पाउन चाहनुहुन्छ, त्यसको च्याट ID (उदा: <code className="text-emerald-300 font-mono">987654321</code>)।
              </p>
              <input
                type="text"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="उदा: 5432109876"
                className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>

            {/* Test Alert Feedback */}
            {testResult && (
              <div className={`rounded-xl p-3.5 text-xs flex items-start gap-2.5 border ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">{testResult.success ? testResult.message : testResult.error}</p>
                  {testResult.timestamp && (
                    <p className="text-[10px] opacity-75">समय: {testResult.timestamp}</p>
                  )}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={isTesting}
                className="flex-1 rounded-xl border border-sky-500/40 bg-sky-500/10 py-2.5 px-4 text-xs font-bold text-sky-300 hover:bg-sky-500/20 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>परीक्षण सन्देश पठाउँदै...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Test Alert (परीक्षण गर्नुहोस्)</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:from-sky-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>सेभ हुँदैछ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Save Settings (सुरक्षित गर्नुहोस्)</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Setup Guide Card */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 space-y-3">
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>१ मिनेटमा Telegram Bot बनाउने तरिका (Quick Setup Guide):</span>
            </h4>
            
            <ol className="list-decimal list-inside space-y-2 text-zinc-400 text-[11px] leading-relaxed">
              <li>
                Telegram खोल्नुहोस् र सर्च बारमा <span className="text-sky-300 font-bold">@BotFather</span> खोल्नुहोस्।
              </li>
              <li>
                <code className="bg-zinc-800 text-amber-300 px-1.5 py-0.5 rounded">/newbot</code> कमाण्ड पठाउनुहोस् र बोटको नाम दिनुहोस् (उदा: <code className="text-zinc-200">TikTopAlertBot</code>)।
              </li>
              <li>
                BotFather ले दिने <span className="text-amber-300 font-bold">API Token</span> कपी गरी माथिको १ नं. मा पेस्ट गर्नुहोस्।
              </li>
              <li>
                आफ्नो Chat ID थाहा पाउन Telegram मा <span className="text-sky-300 font-bold">@userinfobot</span> मा <code className="bg-zinc-800 text-zinc-200 px-1 py-0.5 rounded">/start</code> थिच्नुहोस् र प्राप्त भएको <span className="text-emerald-300 font-bold">Id</span> माथिको २ नं. मा हाल्नुहोस्।
              </li>
              <li>
                अन्त्यमा तपाईंले बनाएको बोटमा गएर <code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded">/start</code> थिच्नुहोस् र यहाँ <span className="text-sky-300 font-bold">Send Test Alert</span> थिच्नुहोस्!
              </li>
            </ol>
          </div>
        </div>

        {/* Right Column: Live Notification Phone Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-white text-xs flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-sky-400" />
                <span>फोनमा आउने नोटिफिकेसनको नमुना (Live Alert Preview)</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                HTML Format
              </span>
            </div>

            {/* Mock Telegram Bubble */}
            <div className="rounded-2xl border border-sky-500/30 bg-[#17212b] p-4 text-white shadow-xl space-y-2 font-sans">
              <div className="flex items-center justify-between text-[11px] text-sky-400 border-b border-white/10 pb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" />
                  TikTop Notification Bot
                </span>
                <span className="text-[10px] text-zinc-400">अहिले भर्खरै</span>
              </div>

              <div className="text-xs space-y-1.5 leading-relaxed pt-1">
                <div className="font-bold text-sm text-rose-400 flex items-center gap-1.5">
                  <span>🚨</span>
                  <span>नयाँ विथड्रल अलर्ट (TikTop Withdrawal Alert) 🇳🇵</span>
                </div>
                <div className="h-px w-full bg-white/10 my-1" />
                
                <p className="text-zinc-300 text-[11px]">
                  👤 <b>प्रयोगकर्ता:</b> @rajesh_kumar (<code>user_rajesh99</code>)
                </p>
                <p className="text-zinc-300 text-[11px]">
                  📝 <b>पूरा नाम:</b> राजेश कुमार श्रेष्ठ
                </p>
                <p className="text-emerald-300 font-bold text-xs">
                  💰 <b>रकम:</b> <b>रु. 500 NPR</b>
                </p>
                <p className="text-zinc-300 text-[11px]">
                  💎 <b>काटिएको पोइन्ट:</b> 500,000 Points
                </p>
                <p className="text-zinc-300 text-[11px]">
                  💳 <b>भुक्तानी माध्यम:</b> 🟢 eSewa
                </p>
                <p className="text-zinc-300 text-[11px]">
                  📱 <b>खाता / मोबाइल नं:</b> <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">9841234567</code>
                </p>
                <p className="text-zinc-400 text-[10px]">
                  🆔 <b>अनुरोध ID:</b> <code>wreq_1725200000</code>
                </p>
                <p className="text-zinc-400 text-[10px]">
                  ⏱ <b>समय (Nepal Time):</b> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-amber-400 text-[11px] font-semibold">
                  📊 <b>स्थिति:</b> ⏳ Pending (प्रतिक्षारत)
                </p>

                <div className="h-px w-full bg-white/10 my-1" />
                <p className="text-[10px] text-zinc-400 italic">
                  👉 TikTop Admin Panel मा लगइन गरी भुक्तानी स्वीकृत (Approve) वा अस्वीकृत (Reject) गर्नुहोस्।
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-800/60 p-3 text-[11px] text-zinc-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>विथड्रल रिक्वेस्ट हुने बित्तिकै ०.२ सेकेन्डभित्र टेलिग्राममा पुश नोटिफिकेसन डेलिभर हुन्छ।</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
