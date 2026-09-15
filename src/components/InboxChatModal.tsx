import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Gift,
  Coins,
  PlusCircle,
  Sparkles,
  ArrowLeft,
  CheckCheck,
  Heart,
  Smile
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { LIVE_GIFTS } from '../data/liveData';
import { LiveGift } from '../types';
import { liveAudio } from '../utils/liveAudio';
import { CoinRechargeModal } from './CoinRechargeModal';

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  text?: string;
  gift?: {
    nameNp: string;
    icon: string;
    imageUrl?: string;
    coins: number;
    multiplier: number;
  };
  createdAt: string;
  isMe: boolean;
}

interface InboxChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  } | null;
}

export const InboxChatModal: React.FC<InboxChatModalProps> = ({
  isOpen,
  onClose,
  recipient,
}) => {
  const { currentUser, updateUserCoins, updateUserPoints } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<LiveGift>(LIVE_GIFTS[0]);
  const [giftMultiplier, setGiftMultiplier] = useState<number>(1);
  const [selectedGiftCategory, setSelectedGiftCategory] = useState<string>('all');
  const [floatingDeduction, setFloatingDeduction] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const coinBalance = currentUser?.coinBalance ?? 5000;

  // Load chat history from localStorage
  useEffect(() => {
    if (!isOpen || !recipient || !currentUser) return;
    const storageKey = `tiktok_dm_${currentUser.id}_${recipient.id}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        setMessages(JSON.parse(saved));
        return;
      } catch {}
    }

    // Default friendly ice-breaker messages
    const defaultDMs: DirectMessage[] = [
      {
        id: `dm_init_1_${recipient.id}`,
        senderId: recipient.id,
        senderName: recipient.displayName,
        recipientId: currentUser.id,
        text: `नमस्ते @${currentUser.username}! मेरो भिडियो मन पराइदिनुभएकोमा धेरै धेरै धन्यवाद 🙏🇳🇵`,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        isMe: false,
      },
    ];
    setMessages(defaultDMs);
  }, [isOpen, recipient, currentUser]);

  // Persist messages
  const saveMessages = (newMsgs: DirectMessage[]) => {
    setMessages(newMsgs);
    if (!recipient || !currentUser) return;
    const storageKey = `tiktok_dm_${currentUser.id}_${recipient.id}`;
    localStorage.setItem(storageKey, JSON.stringify(newMsgs));
  };

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !recipient || !currentUser) return null;

  const totalGiftCost = (selectedGift?.coins || 0) * giftMultiplier;
  const isInsufficientCoins = coinBalance < totalGiftCost;

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: DirectMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      recipientId: recipient.id,
      text: inputText.trim(),
      createdAt: new Date().toISOString(),
      isMe: true,
    };

    const updated = [...messages, newMsg];
    saveMessages(updated);
    setInputText('');

    // Simulated quick response
    setTimeout(() => {
      const replies = [
        'धेरै धेरै धन्यवाद हजुर! 🙏❤️',
        'तपाईंको सन्देश पाएर धेरै खुसी लाग्यो 😊✨',
        'हजुरको दिन शुभ रहोस्! सधैं साथ दिनुहोला है 🇳🇵',
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const botMsg: DirectMessage = {
        id: `msg_${Date.now() + 1}`,
        senderId: recipient.id,
        senderName: recipient.displayName,
        recipientId: currentUser.id,
        text: randomReply,
        createdAt: new Date().toISOString(),
        isMe: false,
      };
      saveMessages([...updated, botMsg]);
    }, 1500);
  };

  const handleSendGiftInChat = () => {
    if (!selectedGift) return;

    if (isInsufficientCoins) {
      setIsRechargeModalOpen(true);
      return;
    }

    const newCoins = Math.max(0, coinBalance - totalGiftCost);
    updateUserCoins(newCoins);
    if (updateUserPoints) {
      updateUserPoints(-totalGiftCost * 100);
    }

    // Floating animation
    setFloatingDeduction(totalGiftCost);
    setTimeout(() => setFloatingDeduction(null), 1200);

    // Audio & Confetti
    try {
      liveAudio.playGiftSound('rose');
    } catch {}

    confetti({
      particleCount: totalGiftCost >= 1000 ? 100 : 50,
      spread: 70,
      origin: { y: 0.6 },
    });

    const giftMsg: DirectMessage = {
      id: `dm_gift_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      recipientId: recipient.id,
      gift: {
        nameNp: selectedGift.nameNp,
        icon: selectedGift.icon,
        imageUrl: selectedGift.imageUrl,
        coins: selectedGift.coins,
        multiplier: giftMultiplier,
      },
      createdAt: new Date().toISOString(),
      isMe: true,
    };

    const updated = [...messages, giftMsg];
    saveMessages(updated);
    setIsGiftDrawerOpen(false);

    // Recipient instant thank-you response for the gift
    setTimeout(() => {
      const thankYouMsgs = [
        `वाह! @${currentUser.username}, यति राम्रो ${selectedGift.nameNp} ${selectedGift.icon} उपहार पठाउनुभएकोमा धेरै धेरै धन्यवाद! ❤️🙏`,
        `उपहारको लागि कृतज्ञ छु! हजुरको साथको कदर गर्छु 🎁✨`,
        `Amazing! ${selectedGift.nameNp} को लागि मुरी मुरी धन्यवाद! 🥰`,
      ];
      const randomThankYou = thankYouMsgs[Math.floor(Math.random() * thankYouMsgs.length)];
      const botThankYouMsg: DirectMessage = {
        id: `dm_reply_${Date.now()}`,
        senderId: recipient.id,
        senderName: recipient.displayName,
        recipientId: currentUser.id,
        text: randomThankYou,
        createdAt: new Date().toISOString(),
        isMe: false,
      };
      saveMessages([...updated, botThankYouMsg]);
    }, 1800);
  };

  const filteredGifts = LIVE_GIFTS.filter(g => {
    if (selectedGiftCategory === 'all') return true;
    return g.category === selectedGiftCategory;
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md h-full sm:h-[88vh] rounded-none sm:rounded-3xl border border-white/10 bg-zinc-950 text-white shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="p-3 sm:p-4 border-b border-white/10 bg-zinc-900/90 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="relative shrink-0">
              <img
                src={recipient.avatarUrl}
                alt={recipient.displayName}
                className="h-9 w-9 rounded-full object-cover border border-white/20"
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
            </div>

            <div className="truncate">
              <h3 className="text-xs font-black text-white truncate flex items-center gap-1">
                <span>{recipient.displayName}</span>
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">@{recipient.username}</p>
            </div>
          </div>

          {/* Real-time Recharged Coin Badge & Quick Recharge Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-1">
              <Coins className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span className="text-[11px] font-black text-amber-300 font-mono">
                {coinBalance.toLocaleString()}
              </span>

              {/* Floating deduction animation in header */}
              {floatingDeduction !== null && (
                <span className="absolute -top-3 right-0 text-[10px] font-black text-rose-400 bg-black/90 px-1 py-0.2 rounded-full border border-rose-500/40 animate-bounce shadow-md">
                  -{floatingDeduction.toLocaleString()} 🪙
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsRechargeModalOpen(true)}
              className="flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-2 py-1 text-[10px] font-black shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              title="कोइन रिचार्ज (Recharge Coins)"
            >
              <PlusCircle className="h-3 w-3 stroke-[2.5]" />
              <span>रिचार्ज</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGiftDrawerOpen(true)}
              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white px-2.5 py-1 text-[10px] font-black shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-rose-400/40"
              title="उपहार पठाउनुहोस् (Send Gift)"
            >
              <Gift className="h-3 w-3" />
              <span>उपहार</span>
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          
          <div className="text-center my-2">
            <span className="text-[10px] text-zinc-500 bg-zinc-900/80 px-2.5 py-1 rounded-full border border-white/5 font-semibold">
              सुरक्षित प्रत्यक्ष सन्देश (End-to-End Encrypted SMS)
            </span>
          </div>

          {messages.map(msg => {
            if (msg.gift) {
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%] rounded-2xl p-3 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-pink-500/20 border border-amber-500/40 shadow-xl space-y-2 animate-scale-up">
                    <div className="flex items-center gap-2">
                      {msg.gift.imageUrl ? (
                        <img src={msg.gift.imageUrl} alt={msg.gift.nameNp} className="h-8 w-8 object-cover rounded-md border border-amber-400/60 shadow-md" />
                      ) : (
                        <span className="text-3xl filter drop-shadow-md">{msg.gift.icon}</span>
                      )}
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-amber-300">
                            {msg.gift.nameNp}
                          </span>
                          {msg.gift.multiplier > 1 && (
                            <span className="text-[9px] font-extrabold bg-amber-400 text-black px-1 py-0.2 rounded-full">
                              x{msg.gift.multiplier}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-300">
                          {msg.isMe
                            ? `तपाईंले @${recipient.username} लाई उपहार पठाउनुभयो`
                            : `@${recipient.username} ले उपहार पठाउनुभयो`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/10">
                      <span className="font-mono font-bold text-amber-400">
                        🪙 {(msg.gift.coins * msg.gift.multiplier).toLocaleString()} Coins
                      </span>
                      <span className="text-zinc-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed shadow-sm ${
                    msg.isMe
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-br-xs'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-xs border border-white/10'
                  }`}
                >
                  <p>{msg.text}</p>
                  <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${msg.isMe ? 'text-white/70' : 'text-zinc-500'}`}>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.isMe && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Chat Bar with Text Input and Gift Trigger */}
        <div className="p-3 border-t border-white/10 bg-zinc-950 shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            
            {/* Quick Gift Trigger Button */}
            <button
              type="button"
              onClick={() => setIsGiftDrawerOpen(prev => !prev)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="उपहार पठाउनुहोस् (Send Gift)"
            >
              <Gift className="h-5 w-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`@${recipient.username} लाई सन्देश लेख्नुहोस्...`}
              className="flex-1 rounded-2xl bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md hover:bg-rose-500 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* In-Chat Gift Selection Drawer */}
        {isGiftDrawerOpen && (
          <div className="border-t border-white/15 bg-zinc-900/95 p-3 space-y-3 animate-slide-up shrink-0 max-h-[50vh] flex flex-col">
            
            {/* Drawer Header with Real-Time Balance */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-rose-400" />
                <span className="text-xs font-black text-white">
                  @{recipient.username} लाई उपहार दिनुहोस्
                </span>
              </div>

              {/* Continuous Live Coin Display */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <Coins className="h-3 w-3 text-amber-400" />
                  <span>{coinBalance.toLocaleString()}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(true)}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  + रिचार्ज
                </button>

                <button
                  type="button"
                  onClick={() => setIsGiftDrawerOpen(false)}
                  className="rounded-full bg-zinc-800 p-1 text-zinc-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Gift Categories Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              {[
                { id: 'all', label: 'सबै' },
                { id: 'romantic', label: '❤️ माया' },
                { id: 'greeting', label: '👋 अभिवादन' },
                { id: 'nepal', label: '🇳🇵 नेपाल' },
                { id: 'luxury', label: '👑 लक्जरी' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedGiftCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all whitespace-nowrap ${
                    selectedGiftCategory === cat.id
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Gifts Grid */}
            <div className="grid grid-cols-4 gap-2 overflow-y-auto max-h-36 pr-1">
              {filteredGifts.map(gift => {
                const isSelected = selectedGift.id === gift.id;
                return (
                  <div
                    key={gift.id}
                    onClick={() => setSelectedGift(gift)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/20 shadow-md ring-1 ring-rose-500'
                        : 'border-white/10 bg-zinc-950/80 hover:bg-zinc-800'
                    }`}
                  >
                    {gift.imageUrl ? (
                      <img src={gift.imageUrl} alt={gift.nameNp} className="h-7 w-7 object-cover rounded-md border border-amber-400/40 mb-0.5" />
                    ) : (
                      <span className="text-2xl filter drop-shadow">{gift.icon}</span>
                    )}
                    <span className="text-[10px] font-bold text-white truncate max-w-full text-center">
                      {gift.nameNp}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-amber-400">
                      🪙 {gift.coins}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Real-time Math Breakdown & Action Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-zinc-400">कम्बो:</span>
                {[1, 5, 10].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setGiftMultiplier(m)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      giftMultiplier === m ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    x{m}
                  </button>
                ))}
              </div>

              {/* Total Cost & Remaining preview */}
              <div className="text-right text-[10px]">
                <span className="text-zinc-400">खर्च: </span>
                <span className="font-mono font-black text-amber-300">🪙 {totalGiftCost.toLocaleString()}</span>
                <span className="text-zinc-500 ml-1">
                  (बाँकी: 🪙 {Math.max(0, coinBalance - totalGiftCost).toLocaleString()})
                </span>
              </div>

              {isInsufficientCoins ? (
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(true)}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-3 py-1.5 text-xs font-black shadow hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <Coins className="h-3.5 w-3.5" />
                  <span>रिचार्ज गर्नुहोस्</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendGiftInChat}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-1.5 text-xs font-black shadow hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>पठाउनुहोस्</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Coin Recharge Store Modal */}
      <CoinRechargeModal
        isOpen={isRechargeModalOpen}
        onClose={() => setIsRechargeModalOpen(false)}
      />
    </div>
  );
};
