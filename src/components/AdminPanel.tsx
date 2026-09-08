import React, { useState, useEffect } from 'react';
import { GiftTransaction } from '../types';

interface WithdrawalItem {
  id: string;
  user: string;
  phone: string;
  amount: number;
  serviceCharge: number;
  netPayout: number;
  method: string;
  status: string;
}

interface AdminPanelProps {
  onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'gifts'>('withdrawals');

  // विथड्र रिक्वेस्टहरूको लिस्ट (डेटाबेसबाट आउने डेटा)
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalItem[]>([
    { id: 'w_req_001', user: 'Shambhu Lamsal', phone: '9812345678', amount: 500, serviceCharge: 40, netPayout: 460, method: 'eSewa', status: 'Pending' },
    { id: 'w2', user: 'Ram Sharma', phone: '9898765432', amount: 1000, serviceCharge: 80, netPayout: 920, method: 'Khalti', status: 'Pending' },
  ]);

  // लाइभ गिफ्ट कारोबारहरूको लिस्ट (User Provided Schema)
  const [giftTransactions, setGiftTransactions] = useState<GiftTransaction[]>([
    {
      transactionId: 'tx_987',
      senderId: 'user_A',
      senderName: 'Viewer A (समर्थक)',
      creatorId: 'creator_B',
      creatorName: 'Creator B (लाइभ होस्ट)',
      giftName: 'Car 🚗',
      giftPrice: 5000,
      platformCommission: 1500, // ३०% कमिसन (तपाईँको आम्दानी)
      creatorEarnings: 3500,   // ७०% क्रिएटरको भाग
      timestamp: '2026-06-05T12:30:00Z',
    }
  ]);

  // प्लेटफर्मको कुल आम्दानी (कमिसन र चार्जबाट उठेको)
  const [platformStats, setPlatformStats] = useState({
    totalCommissionFromGifts: 15400, // ३०% कमिसनबाट जम्मा भएको कोइन/रकम
    totalServiceChargeFromWithdraw: 1200, // ८% विथड्र चार्जबाट जम्मा भएको
    totalCreatorEarnings: 35900,
  });

  const [notification, setNotification] = useState<string>('');

  // Fetch real database records and merge them
  useEffect(() => {
    const fetchDbWithdrawals = async () => {
      try {
        const res = await fetch('/api/admin/withdrawals', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'user_admin',
            'x-admin-password': sessionStorage.getItem('tiktop_admin_password') || 'TikTopAdmin@2026',
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.withdrawals) && data.withdrawals.length > 0) {
            const mapped: WithdrawalItem[] = data.withdrawals.map((w: any) => {
              const amt = Number(w.requestedNPR || w.amountNpr || 500);
              const fee = Number(w.serviceCharge ?? w.serviceChargeNpr ?? (amt * 0.08).toFixed(2));
              const payout = Number(w.netPayout ?? w.finalPayoutNpr ?? (amt - fee).toFixed(2));
              let statusLabel = 'Pending';
              const s = String(w.status).toLowerCase();
              if (s === 'approved') statusLabel = 'Approved ✅';
              else if (s === 'rejected') statusLabel = 'Rejected ❌';

              return {
                id: w.requestId || w.id,
                user: w.userName || w.fullName || w.username || 'Creator',
                phone: w.phone || w.mobileNumber || '98XXXXXXXX',
                amount: amt,
                serviceCharge: fee,
                netPayout: payout,
                method: String(w.paymentMethod).toLowerCase() === 'khalti' ? 'Khalti' : 'eSewa',
                status: statusLabel
              };
            });

            // Keep default examples and prepend/merge real ones
            setWithdrawalRequests(prev => {
              const existingIds = new Set(mapped.map(m => m.id));
              const remainingDefaults = prev.filter(p => !existingIds.has(p.id));
              return [...mapped, ...remainingDefaults];
            });

            // Calculate live service charge
            const totalFeeCalculated = data.withdrawals.reduce((sum: number, w: any) => {
              const amt = Number(w.amountNpr || 500);
              const fee = Number(w.serviceChargeNpr ?? (amt * 0.08));
              return sum + fee;
            }, 1200);

            setPlatformStats(prev => ({
              ...prev,
              totalServiceChargeFromWithdraw: Math.round(totalFeeCalculated)
            }));
          }
        }
      } catch (err) {
        console.warn('Using local AdminPanel withdrawal state:', err);
      }
    };

    const fetchDbGifts = async () => {
      try {
        const res = await fetch('/api/gift-transactions');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.transactions) && data.transactions.length > 0) {
            setGiftTransactions(data.transactions);
            if (data.stats) {
              setPlatformStats(prev => ({
                ...prev,
                totalCommissionFromGifts: Math.max(prev.totalCommissionFromGifts, data.stats.totalPlatformCommission || 0),
                totalCreatorEarnings: data.stats.totalCreatorEarnings || prev.totalCreatorEarnings,
              }));
            }
          }
        }
      } catch (err) {
        console.warn('Using local AdminPanel gifts state:', err);
      }
    };

    fetchDbWithdrawals();
    fetchDbGifts();
  }, []);

  // विथड्र अप्रुभ गर्ने फंक्सन
  const handleApprove = async (id: string, netPayout: number) => {
    setWithdrawalRequests(prev => 
      prev.map(req => req.id === id ? { ...req, status: 'Approved ✅' } : req)
    );

    // Update backend if it's a real withdrawal ID
    if (!id.startsWith('w1') && !id.startsWith('w2')) {
      try {
        await fetch(`/api/admin/withdrawals/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'user_admin',
            'x-admin-password': sessionStorage.getItem('tiktop_admin_password') || 'TikTopAdmin@2026',
          },
          body: JSON.stringify({
            status: 'approved',
            adminNotes: `Approved via Secret Admin Panel. Net payout: Rs. ${netPayout}`
          })
        });
      } catch (e) {
        console.error('Failed to sync approval to database:', e);
      }
    }

    setNotification(`✅ सफलता: रु. ${netPayout} भुक्तानीको लागि अप्रुभ गरियो!`);
    setTimeout(() => setNotification(''), 4000);
  };

  // विथड्र रिजेक्ट गर्ने फंक्सन
  const handleReject = async (id: string) => {
    setWithdrawalRequests(prev => 
      prev.map(req => req.id === id ? { ...req, status: 'Rejected ❌' } : req)
    );

    // Update backend if it's a real withdrawal ID
    if (!id.startsWith('w1') && !id.startsWith('w2')) {
      try {
        await fetch(`/api/admin/withdrawals/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'user_admin',
            'x-admin-password': sessionStorage.getItem('tiktop_admin_password') || 'TikTopAdmin@2026',
          },
          body: JSON.stringify({
            status: 'rejected',
            adminNotes: 'Rejected via Secret Admin Panel'
          })
        });
      } catch (e) {
        console.error('Failed to sync reject to database:', e);
      }
    }

    setNotification(`❌ विथड्र अनुरोध रद्द गरियो!`);
    setTimeout(() => setNotification(''), 3000);
  };

  // नयाँ Car 🚗 गिफ्ट कारोबार सिमुलेट गर्ने (३०% प्लेटफर्म कमिसन = १५००, ७०% क्रिएटर भाग = ३५००)
  const handleSimulateGiftTxn = async () => {
    const newTxnId = `tx_${Math.floor(100 + Math.random() * 900)}`;
    const giftPrice = 5000;
    const platformCommission = Math.round(giftPrice * 0.30); // 1500
    const creatorEarnings = Math.round(giftPrice * 0.70);   // 3500
    const nowIso = new Date().toISOString();

    const newTxn: GiftTransaction = {
      transactionId: newTxnId,
      senderId: 'user_A',
      senderName: 'Viewer A (समर्थक)',
      creatorId: 'creator_B',
      creatorName: 'Creator B (लाइभ होस्ट)',
      giftName: 'Car 🚗',
      giftPrice,
      platformCommission,
      creatorEarnings,
      timestamp: nowIso
    };

    // Update local state immediately
    setGiftTransactions(prev => [newTxn, ...prev]);
    setPlatformStats(prev => ({
      ...prev,
      totalCommissionFromGifts: prev.totalCommissionFromGifts + platformCommission,
      totalCreatorEarnings: prev.totalCreatorEarnings + creatorEarnings,
    }));

    setNotification(`🚗 Car 🚗 गिफ्ट कारोबार सम्पन्न! ३०% प्लेटफर्म कमिसन (रु. ${platformCommission}) थपियो!`);
    setTimeout(() => setNotification(''), 4000);

    // Sync to backend API
    try {
      await fetch('/api/live/send-gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_A',
        },
        body: JSON.stringify({
          transactionId: newTxnId,
          creatorId: 'creator_B',
          giftName: 'Car 🚗',
          giftPrice,
          timestamp: nowIso
        })
      });
    } catch (err) {
      console.warn('Simulated gift sent locally:', err);
    }
  };

  return (
    <div id="secret-admin-panel" style={{ padding: '20px', background: '#111', color: '#fff', borderRadius: '10px', maxWidth: '820px', margin: '0 auto', fontFamily: 'sans-serif', border: '1px solid #222' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 'bold' }}>🔐 TikTop Secret Admin Panel</h2>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            यो प्यानल केवल एडमिनको लागि मात्र गोप्य राखिएको छ। विथड्र भुक्तानी र ३०% लाइभ गिफ्ट कमिसन व्यवस्थापन।
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: '#222', border: '1px solid #444', color: '#aaa', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            बन्द गर्नुहोस्
          </button>
        )}
      </div>

      {notification && (
        <div style={{ background: '#003322', color: '#00ffcc', padding: '10px 14px', borderRadius: '6px', marginTop: '14px', fontSize: '13px', border: '1px solid #00ffcc' }}>
          {notification}
        </div>
      )}

      {/* १. ड्यासबोर्ड एनालिटिक्स (कमाईको विवरण) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '20px 0' }}>
        <div style={{ background: '#222', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #00ffcc' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#aaa' }}>कुल गिफ्ट कमिसन (३०%)</h4>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#00ffcc', margin: 0 }}>
            रु. {platformStats.totalCommissionFromGifts.toLocaleString()}
          </p>
          <span style={{ fontSize: '11px', color: '#888' }}>तपाईँको शुद्ध आम्दानी</span>
        </div>
        <div style={{ background: '#222', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ffcc00' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#aaa' }}>कुल विथड्र चार्ज (८%)</h4>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffcc00', margin: 0 }}>
            रु. {platformStats.totalServiceChargeFromWithdraw.toLocaleString()}
          </p>
          <span style={{ fontSize: '11px', color: '#888' }}>विथड्र गर्दा काटिएको</span>
        </div>
        <div style={{ background: '#222', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ff44aa' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#aaa' }}>कुल क्रिएटर आम्दानी (७०%)</h4>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff44aa', margin: 0 }}>
            रु. {platformStats.totalCreatorEarnings.toLocaleString()}
          </p>
          <span style={{ fontSize: '11px', color: '#888' }}>क्रिएटरको खातामा गएको</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: '10px' }}>
        <button
          onClick={() => setActiveTab('withdrawals')}
          style={{
            background: activeTab === 'withdrawals' ? '#ffcc00' : '#222',
            color: activeTab === 'withdrawals' ? '#000' : '#ccc',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          📋 विथड्र अनुरोधहरू ({withdrawalRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('gifts')}
          style={{
            background: activeTab === 'gifts' ? '#00ffcc' : '#222',
            color: activeTab === 'gifts' ? '#000' : '#ccc',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          🎁 लाइभ गिफ्ट कमिसन ({giftTransactions.length})
        </button>
      </div>

      {/* २. विथड्र रिक्वेस्टहरूको म्यानेजमेन्ट टेबल */}
      {activeTab === 'withdrawals' && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#ffcc00' }}>
              📋 Withdrawal Requests Management (८% Service Charge)
            </h3>
            <span style={{ fontSize: '12px', color: '#888' }}>
              Pending: {withdrawalRequests.filter(w => w.status.includes('Pending')).length}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#222', color: '#ffcc00' }}>
                  <th style={{ padding: '10px' }}>Req ID / User / Phone</th>
                  <th style={{ padding: '10px' }}>Requested</th>
                  <th style={{ padding: '10px' }}>Charge (8%)</th>
                  <th style={{ padding: '10px' }}>Net Payout</th>
                  <th style={{ padding: '10px' }}>Method</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#777', fontFamily: 'monospace' }}>{req.id}</span><br />
                      <strong>{req.user}</strong><br />
                      <span style={{ fontSize: '11px', color: '#aaa' }}>{req.phone}</span>
                    </td>
                    <td style={{ padding: '10px' }}>रु. {req.amount}</td>
                    <td style={{ padding: '10px', color: '#ffcc00' }}>रु. {req.serviceCharge}</td>
                    <td style={{ padding: '10px', color: '#00ffcc', fontWeight: 'bold' }}>रु. {req.netPayout}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: req.method.toLowerCase() === 'esewa' ? '#143621' : '#2b103e',
                        color: req.method.toLowerCase() === 'esewa' ? '#52b788' : '#c77dff',
                        fontWeight: 'bold'
                      }}>
                        {req.method}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        background: req.status === 'Pending' ? '#332200' : req.status.includes('Approved') ? '#003322' : '#330000',
                        color: req.status === 'Pending' ? '#ffcc00' : req.status.includes('Approved') ? '#00ffcc' : '#ff4444'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {req.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            id={`approve-btn-${req.id}`}
                            onClick={() => handleApprove(req.id, req.netPayout)}
                            style={{ background: '#00ffcc', color: '#000', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                          >
                            Approve
                          </button>
                          <button 
                            id={`reject-btn-${req.id}`}
                            onClick={() => handleReject(req.id)}
                            style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#777' }}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ३. गिफ्ट ट्रान्जेक्शन म्यानेजमेन्ट (tx_987 - ३०% कमिसन, ७०% क्रिएटर भाग) */}
      {activeTab === 'gifts' && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#00ffcc' }}>
              🎁 Live Gift Transactions & Commission Split (३०% / ७०%)
            </h3>
            <button
              onClick={handleSimulateGiftTxn}
              style={{
                background: 'linear-gradient(90deg, #ff007f, #7928ca)',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🚗 कार गिफ्ट (5000 Coins) सिमुलेट गर्नुहोस्
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#222', color: '#00ffcc' }}>
                  <th style={{ padding: '10px' }}>Txn ID / Time</th>
                  <th style={{ padding: '10px' }}>Sender ➡️ Creator</th>
                  <th style={{ padding: '10px' }}>Gift Name & Price</th>
                  <th style={{ padding: '10px' }}>३०% कमिसन (Admin)</th>
                  <th style={{ padding: '10px' }}>७०% क्रिएटर भाग</th>
                </tr>
              </thead>
              <tbody>
                {giftTransactions.map((tx) => (
                  <tr key={tx.transactionId} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '10px' }}>
                      <strong style={{ color: '#00ffcc', fontFamily: 'monospace' }}>{tx.transactionId}</strong><br />
                      <span style={{ fontSize: '11px', color: '#888' }}>
                        {new Date(tx.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ color: '#eee' }}>{tx.senderName || tx.senderId}</span>
                      <span style={{ color: '#888', margin: '0 4px' }}>➡️</span>
                      <strong style={{ color: '#ffcc00' }}>{tx.creatorName || tx.creatorId}</strong>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{tx.giftName}</span><br />
                      <span style={{ fontSize: '11px', color: '#aaa' }}>{tx.giftPrice.toLocaleString()} Coins</span>
                    </td>
                    <td style={{ padding: '10px', color: '#00ffcc', fontWeight: 'bold' }}>
                      +रु. {tx.platformCommission.toLocaleString()}
                      <div style={{ fontSize: '10px', color: '#55a882', fontWeight: 'normal' }}>३०% कमिसन</div>
                    </td>
                    <td style={{ padding: '10px', color: '#ff44aa', fontWeight: 'bold' }}>
                      +रु. {tx.creatorEarnings.toLocaleString()}
                      <div style={{ fontSize: '10px', color: '#b56d94', fontWeight: 'normal' }}>७०% क्रिएटर कमाई</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '16px', borderTop: '1px solid #222', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', flexWrap: 'wrap', gap: '6px' }}>
        <span>🔒 सुरक्षित भुक्तानी म्यानेजर (Safe Net Payouts & Commission Engine)</span>
        <span>TikTop Admin System v2.7 • {withdrawalRequests.length} Withdrawals • {giftTransactions.length} Gift Txns</span>
      </div>
    </div>
  );
};

export default AdminPanel;
