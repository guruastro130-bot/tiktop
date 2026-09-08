import React, { useState, useEffect } from 'react';
import { LuckyGiftSystem } from './LuckyGiftSystem';

// गिफ्टहरूको सूची (Gift Catalog)
export const GIFT_LIST = [
  { id: 'g1', name: 'Rose 🌹', price: 10000, icon: '🌹' }, // १ लाख पोइन्टको अनुपात अनुसार
  { id: 'g2', name: 'Heart ❤️', price: 50000, icon: '❤️' },
  { id: 'g3', name: 'Car 🚗', price: 200000, icon: '🚗' },
  { id: 'g4', name: 'Castle 🏰', price: 500000, icon: '🏰' },
];

export interface TikTopAppProps {
  onClose?: () => void;
  initialTab?: 'live' | 'gift' | 'withdraw' | 'lucky';
}

const TikTopApp: React.FC<TikTopAppProps> = ({ onClose, initialTab = 'live' }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'gift' | 'withdraw' | 'lucky'>(initialTab); // 'live', 'gift', 'withdraw', 'lucky'
  
  // १. लाइभ स्ट्रिम रिवार्ड स्टेटहरू
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const MAX_SECONDS = 7200; // २ घण्टा
  const MAX_POINTS = 10000;

  // २. वालेट र गिफ्ट स्टेटहरू
  const [userWalletBalance, setUserWalletBalance] = useState(250000); // कोइन ब्यालेन्स
  const [selectedGift, setSelectedGift] = useState<{ id: string; name: string; price: number; icon: string } | null>(null);
  
  // ३. विथड्र स्टेटहरू (१ लाख पोइन्ट = $1, न्यूनतम $5 वा ५ लाख पोइन्ट)
  const [userTotalPoints, setUserTotalPoints] = useState(600000); 
  const [withdrawUSD, setWithdrawUSD] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('eSewa');
  const [accountNumber, setAccountNumber] = useState('');
  
  const [message, setMessage] = useState('');

  // ----------------------------------------------------
  // १. लाइभ स्ट्रिम टाइमर र एन्टि-चिट लजिक
  // ----------------------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsLiveActive(false);
      } else {
        setIsLiveActive(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    let timer: NodeJS.Timeout | undefined;
    if (isLiveActive && !limitReached && activeTab === 'live') {
      timer = setInterval(() => {
        setLiveSeconds((prevSeconds) => {
          if (prevSeconds >= MAX_SECONDS) {
            setLimitReached(true);
            clearInterval(timer);
            return MAX_SECONDS;
          }

          const nextSeconds = prevSeconds + 1;

          if (nextSeconds % 72 === 0) {
            setEarnedPoints((prevPoints) => {
              const updatedPoints = prevPoints + 100;
              return updatedPoints > MAX_POINTS ? MAX_POINTS : updatedPoints;
            });
          }

          return nextSeconds;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLiveActive, limitReached, activeTab]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ----------------------------------------------------
  // २. गिफ्ट पठाउने र ३०% कमिसन लजिक
  // ----------------------------------------------------
  const handleSendGift = (gift: { id: string; name: string; price: number; icon: string }) => {
    if (userWalletBalance < gift.price) {
      setMessage('❌ तपाईंको वालेटमा पर्याप्त कोइन छैन!');
      return;
    }

    const platformCommission = gift.price * 0.30; // ३०% प्लेटफर्मको भाग
    const creatorEarnings = gift.price * 0.70;    // ७०% क्रिएटरको भाग

    setUserWalletBalance(prev => prev - gift.price);
    setMessage(`🎉 सफलतापूर्वक ${gift.name} पठाइयो! (कमिसन: ${platformCommission}, क्रिएटर: ${creatorEarnings})`);
  };

  // ----------------------------------------------------
  // ३. विथड्र र ८% सर्भिस चार्ज लजिक ($1 = १ लाख पोइन्ट, मिनिमम $5)
  // ----------------------------------------------------
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountUSD = parseFloat(withdrawUSD);
    const MIN_WITHDRAW_USD = 5; // न्यूनतम $5
    const POINTS_PER_USD = 100000; // १ लाख पोइन्ट = $1

    if (!amountUSD || amountUSD < MIN_WITHDRAW_USD) {
      setMessage(`❌ न्यूनतम विथड्र रकम $${MIN_WITHDRAW_USD} (५ लाख पोइन्ट) हुनुपर्छ!`);
      return;
    }

    const requiredPoints = amountUSD * POINTS_PER_USD;
    if (userTotalPoints < requiredPoints) {
      setMessage('❌ तपाईंसँग विथड्र गर्न पर्याप्त पोइन्ट छैन!');
      return;
    }

    if (!accountNumber) {
      setMessage('❌ इसेवा वा खल्ती नम्बर प्रविष्ट गर्नुहोस्!');
      return;
    }

    const serviceChargeUSD = amountUSD * 0.08; // ८% सर्भिस चार्ज
    const finalPayoutUSD = amountUSD - serviceChargeUSD; // खुद पाउने रकम ($)

    setUserTotalPoints(prev => prev - requiredPoints);
    setMessage(`✅ विथड्र सफल! माग: $${amountUSD} | चार्ज (८%): $${serviceChargeUSD.toFixed(2)} | तपाईंले पाउने: $${finalPayoutUSD.toFixed(2)}`);
  };

  return (
    <div id="tiktop-dashboard-container" style={{ padding: '20px', background: '#111', color: '#fff', borderRadius: '10px', maxWidth: '450px', margin: '0 auto', fontFamily: 'sans-serif', border: '1px solid #222', position: 'relative' }}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: '#222',
            border: '1px solid #444',
            color: '#aaa',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}
          title="बन्द गर्नुहोस्"
        >
          ✕
        </button>
      )}

      <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '19px', fontWeight: 'bold' }}>🚀 TikTop Dashboard ($1 = 1L Points)</h2>
      
      {/* ट्याब बटनहरू */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
        <button 
          id="tiktop-tab-live"
          onClick={() => setActiveTab('live')} 
          style={{ flex: 1, padding: '8px', background: activeTab === 'live' ? '#00ffcc' : '#333', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
        >
          Live Reward
        </button>
        <button 
          id="tiktop-tab-gift"
          onClick={() => setActiveTab('gift')} 
          style={{ flex: 1, padding: '8px', background: activeTab === 'gift' ? '#00ffcc' : '#333', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
        >
          Gifts
        </button>
        <button 
          id="tiktop-tab-lucky"
          onClick={() => setActiveTab('lucky')} 
          style={{ flex: 1.2, padding: '8px', background: activeTab === 'lucky' ? '#f59e0b' : '#333', color: activeTab === 'lucky' ? '#000' : '#f59e0b', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
        >
          🎰 Lucky
        </button>
        <button 
          id="tiktop-tab-withdraw"
          onClick={() => setActiveTab('withdraw')} 
          style={{ flex: 1, padding: '8px', background: activeTab === 'withdraw' ? '#00ffcc' : '#333', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
        >
          Withdraw
        </button>
      </div>

      {/* सेक्शन १: लाइभ स्ट्रिम रिवार्ड */}
      {activeTab === 'live' && (
        <div id="tiktop-section-live" style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>🔴 Live Streaming Reward</h3>
          <p style={{ margin: '6px 0' }}>लाइभ समय: <strong>{formatTime(liveSeconds)}</strong></p>
          <p style={{ margin: '6px 0' }}>कमाएको पोइन्ट: <strong style={{ color: '#00ffcc' }}>{earnedPoints} / {MAX_POINTS} Pts</strong></p>
          {!isLiveActive && <p style={{ color: '#ff4444', fontSize: '12px', margin: '8px 0 0 0' }}>⚠️ एप ब्याकग्राउन्डमा भएकाले पोइन्ट रोकियो!</p>}
          {limitReached && <p style={{ color: '#ffcc00', fontSize: '12px', margin: '8px 0 0 0' }}>🎉 आजको २ घण्टे लाइभ सीमा पूरा भयो!</p>}
        </div>
      )}

      {/* सेक्शन २: भर्चुअल गिफ्टिङ */}
      {activeTab === 'gift' && (
        <div id="tiktop-section-gift" style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>🎁 Virtual Gifts (30% Commission)</h3>
          <p style={{ fontSize: '13px', margin: '4px 0 12px 0' }}>वालेट कोइन: <strong style={{ color: '#00ffcc' }}>{userWalletBalance.toLocaleString()} Coins</strong></p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', margin: '15px 0' }}>
            {GIFT_LIST.map((gift) => (
              <div 
                key={gift.id}
                id={`tiktop-gift-${gift.id}`}
                onClick={() => setSelectedGift(gift)}
                style={{
                  padding: '10px',
                  background: selectedGift?.id === gift.id ? '#333' : '#222',
                  border: selectedGift?.id === gift.id ? '2px solid #00ffcc' : '1px solid #444',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '20px' }}>{gift.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{gift.name}</div>
                <div style={{ fontSize: '11px', color: '#ffcc00' }}>{gift.price.toLocaleString()} Pts</div>
              </div>
            ))}
          </div>

          <button 
            id="tiktop-send-gift-btn"
            onClick={() => selectedGift && handleSendGift(selectedGift)}
            disabled={!selectedGift}
            style={{ 
              width: '100%', 
              padding: '8px', 
              background: selectedGift ? '#00ffcc' : '#555', 
              color: '#000', 
              fontWeight: 'bold', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: selectedGift ? 'pointer' : 'not-allowed' 
            }}
          >
            Send Gift 🚀
          </button>
        </div>
      )}

      {/* सेक्शन ३: लक्की गिफ्ट (ज्याकपट सिस्टम) */}
      {activeTab === 'lucky' && (
        <div id="tiktop-section-lucky" style={{ margin: '0 -8px' }}>
          <LuckyGiftSystem 
            userBalance={userWalletBalance}
            onBalanceChange={(newBal) => setUserWalletBalance(newBal)}
            creatorName="Creator B (लाइभ होस्ट)"
            onSendToCreator={(earnings, giftName) => {
              setMessage(`🎉 ${giftName} पठाइयो! क्रिएटरले ७०% (+${earnings} Pts) सुरक्षित पाए।`);
            }}
          />
        </div>
      )}

      {/* सेक्शन ४: विथड्र सिस्टम ($5 Minimum) */}
      {activeTab === 'withdraw' && (
        <div id="tiktop-section-withdraw" style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>💸 Cash Withdrawal ($5 Min, 8% Fee)</h3>
          <p style={{ fontSize: '13px', margin: '4px 0 4px 0' }}>कुल पोइन्ट: <strong style={{ color: '#00ffcc' }}>{userTotalPoints.toLocaleString()} Pts</strong></p>
          <p style={{ fontSize: '12px', color: '#ffcc00', marginBottom: '10px' }}>बराबरको डलर: <strong>${(userTotalPoints / 100000).toFixed(2)}</strong></p>

          <form onSubmit={handleWithdrawSubmit}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>विथड्र रकम (USD - मिनिमम $5):</label>
              <input 
                id="tiktop-withdraw-usd-amount"
                type="number" 
                step="any"
                placeholder="जस्तै: 5, 10, 20"
                value={withdrawUSD}
                onChange={(e) => setWithdrawUSD(e.target.value)}
                style={{ width: '100%', padding: '6px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>माध्यम:</label>
              <select 
                id="tiktop-withdraw-payment-method"
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '6px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="eSewa">eSewa</option>
                <option value="Khalti">Khalti</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>इसेवा / खल्ती नम्बर:</label>
              <input 
                id="tiktop-withdraw-account-number"
                type="text" 
                placeholder="98XXXXXXXX"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                style={{ width: '100%', padding: '6px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              id="tiktop-request-withdraw-btn"
              type="submit"
              style={{ width: '100%', padding: '8px', background: '#00ffcc', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              Request Withdrawal ($5+) 🚀
            </button>
          </form>
        </div>
      )}

      {/* म्यासेज डिस्प्ले */}
      {message && <p id="tiktop-dashboard-message" style={{ marginTop: '12px', fontSize: '12px', color: '#ffcc00', textAlign: 'center', lineHeight: '1.4' }}>{message}</p>}
    </div>
  );
};

export { TikTopApp };
export default TikTopApp;
