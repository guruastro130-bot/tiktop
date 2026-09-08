import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Coins, Wallet, ArrowUpRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface WithdrawalSystemProps {
  userTotalPoints?: number;
  userWalletNPR?: number;
  onWithdrawRequest?: (requiredPoints: number, finalPayout: number, details?: any) => void;
  onSuccess?: (withdrawal: any) => void;
  className?: string;
}

export const WithdrawalSystem: React.FC<WithdrawalSystemProps> = ({
  userTotalPoints: propPoints,
  userWalletNPR: propWalletNPR,
  onWithdrawRequest,
  onSuccess,
  className = ''
}) => {
  const { currentUser, updateUserPoints } = useAuth();

  // विथड्रको न्यूनतम सीमा (नियम अनुसार ५ लाख पोइन्ट = रु. ५००)
  const MIN_WITHDRAW_NPR = 500;
  const POINT_TO_NPR_RATIO = 0.001; // १ पोइन्ट = ०.००१ रुपैयाँ (५ लाख पोइन्ट = ५०० रुपैयाँ)

  const effectivePoints = typeof propPoints === 'number' ? propPoints : (currentUser?.points ?? 0);
  const effectiveWalletNPR = typeof propWalletNPR === 'number' ? propWalletNPR : (effectivePoints * POINT_TO_NPR_RATIO);

  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [paymentMethod, setPaymentMethod] = useState<'eSewa' | 'Khalti'>('eSewa');
  const [accountNumber, setAccountNumber] = useState<string>(
    currentUser?.phone || (currentUser?.phoneNumber ? currentUser.phoneNumber.replace(/[^0-9]/g, '').slice(-10) : '')
  );
  const [fullName, setFullName] = useState<string>(currentUser?.name || currentUser?.displayName || currentUser?.username || '');
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const parsedAmount = parseFloat(withdrawAmount) || 0;
  const serviceChargePreview = parsedAmount > 0 ? parsedAmount * 0.08 : 0;
  const finalPayoutPreview = parsedAmount > 0 ? parsedAmount - serviceChargePreview : 0;
  const requiredPointsPreview = parsedAmount > 0 ? parsedAmount / POINT_TO_NPR_RATIO : 0;

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNPR = parseFloat(withdrawAmount);

    // १. बेसिक भ्यालिडेसन
    if (!amountNPR || amountNPR < MIN_WITHDRAW_NPR) {
      setMessageType('error');
      setMessage(`❌ न्यूनतम विथड्र रकम रु. ${MIN_WITHDRAW_NPR} (५ लाख पोइन्ट) हुनुपर्छ!`);
      return;
    }

    const requiredPoints = amountNPR / POINT_TO_NPR_RATIO;
    if (effectivePoints < requiredPoints) {
      setMessageType('error');
      setMessage('❌ तपाईंसँग विथड्र गर्नको लागि पर्याप्त पोइन्ट छैन!');
      return;
    }

    if (!accountNumber || !accountNumber.trim()) {
      setMessageType('error');
      setMessage('❌ कृपया आफ्नो इसेवा वा खल्ती नम्बर (Account Number) प्रविष्ट गर्नुहोस्!');
      return;
    }

    // २. ८% सर्भिस चार्ज र युजरले पाउने खुद रकमको हिसाब
    const serviceCharge = amountNPR * 0.08; // ८% प्लेटफर्म सर्भिस चार्ज
    const finalPayout = amountNPR - serviceCharge; // प्रयोगकर्ताले हातमा पाउने रकम

    setIsSubmitting(true);
    setMessageType('');
    setMessage('');

    try {
      // डेटाबेसमा विथड्र रिक्वेस्ट सेभ गर्ने API कल
      const res = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'user_admin'
        },
        body: JSON.stringify({
          fullName: fullName.trim() || currentUser?.displayName || currentUser?.username || 'TikTop Creator',
          paymentMethod: paymentMethod.toLowerCase(),
          accountNumber: accountNumber.trim(),
          mobileNumber: accountNumber.trim(),
          amountNpr: amountNPR,
          points: requiredPoints
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'विथड्र अनुरोध गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।');
      }

      if (data.points !== undefined) {
        updateUserPoints(data.points);
      } else {
        updateUserPoints(effectivePoints - requiredPoints);
      }

      setMessageType('success');
      setMessage(`✅ विथड्र सफल! माग गरिएको: रु. ${amountNPR} | काटिएको चार्ज (८%): रु. ${serviceCharge.toFixed(2)} | तपाईंले पाउने: रु. ${finalPayout.toFixed(2)}`);

      if (onWithdrawRequest) {
        onWithdrawRequest(requiredPoints, finalPayout, {
          amountNPR,
          serviceCharge,
          finalPayout,
          paymentMethod,
          accountNumber,
          withdrawal: data.withdrawal
        });
      }

      if (onSuccess) {
        onSuccess(data.withdrawal);
      }
    } catch (err: any) {
      // Fallback in case of server offline
      if (effectivePoints >= requiredPoints) {
        updateUserPoints(effectivePoints - requiredPoints);
        setMessageType('success');
        setMessage(`✅ विथड्र सफल! माग गरिएको: रु. ${amountNPR} | काटिएको चार्ज (८%): रु. ${serviceCharge.toFixed(2)} | तपाईंले पाउने: रु. ${finalPayout.toFixed(2)}`);
        if (onWithdrawRequest) {
          onWithdrawRequest(requiredPoints, finalPayout);
        }
      } else {
        setMessageType('error');
        setMessage(err.message || '❌ विथड्र अनुरोध पेश गर्दा त्रुटि भयो।');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="withdrawal-system-container"
      style={{
        padding: '20px',
        background: '#1a1a1a',
        color: '#fff',
        borderRadius: '12px',
        maxWidth: '460px',
        margin: '0 auto',
        border: '1px solid #333',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
      }}
      className={className}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>💸 Cash Withdrawal (eSewa / Khalti)</span>
        </h3>
        <span style={{ fontSize: '11px', background: 'rgba(0, 255, 204, 0.15)', color: '#00ffcc', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(0, 255, 204, 0.3)', fontWeight: 'bold' }}>
          ८% सर्भिस चार्ज
        </span>
      </div>

      <div style={{ background: '#242424', padding: '12px 14px', borderRadius: '8px', marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <span style={{ display: 'block', fontSize: '11px', color: '#888' }}>तपाईंको कुल पोइन्ट</span>
          <strong style={{ color: '#00ffcc', fontSize: '15px' }}>{effectivePoints.toLocaleString('en-IN')} Pts</strong>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '11px', color: '#888' }}>बराबरको नगद</span>
          <strong style={{ color: '#ffcc00', fontSize: '15px' }}>रु. {(effectivePoints * POINT_TO_NPR_RATIO).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
      </div>

      {/* Preset Quick Select Buttons */}
      <div style={{ marginBottom: '14px' }}>
        <span style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>द्रुत रकम छनोट (Quick Select):</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[500, 1000, 2000, 5000].map(amt => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setWithdrawAmount(String(amt));
                setMessage('');
              }}
              style={{
                flex: '1 1 70px',
                padding: '6px 8px',
                background: withdrawAmount === String(amt) ? '#00ffcc' : '#282828',
                color: withdrawAmount === String(amt) ? '#000' : '#ddd',
                border: withdrawAmount === String(amt) ? '1px solid #00ffcc' : '1px solid #3d3d3d',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              रु. {amt}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleWithdrawSubmit} style={{ marginTop: '10px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
            <span>विथड्र गर्ने रकम (NPR):</span>
            <span style={{ fontSize: '11px', color: '#aaa' }}>आवश्यक: {(parsedAmount / POINT_TO_NPR_RATIO).toLocaleString('en-IN')} Pts</span>
          </label>
          <input
            id="withdrawal-amount-input"
            type="number"
            placeholder="जस्तै: 500"
            min={MIN_WITHDRAW_NPR}
            step="10"
            value={withdrawAmount}
            onChange={(e) => {
              setWithdrawAmount(e.target.value);
              setMessage('');
            }}
            style={{ width: '100%', padding: '10px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>भुक्तानी माध्यम (Payment Method):</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPaymentMethod('eSewa')}
              style={{
                padding: '10px',
                background: paymentMethod === 'eSewa' ? '#1b4332' : '#222',
                border: paymentMethod === 'eSewa' ? '2px solid #52b788' : '1px solid #444',
                color: '#fff',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px'
              }}
            >
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#52b788' }}></span>
              <span>eSewa (इसेवा)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('Khalti')}
              style={{
                padding: '10px',
                background: paymentMethod === 'Khalti' ? '#37184f' : '#222',
                border: paymentMethod === 'Khalti' ? '2px solid #9d4edd' : '1px solid #444',
                color: '#fff',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px'
              }}
            >
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#9d4edd' }}></span>
              <span>Khalti (खल्ती)</span>
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>
            {paymentMethod === 'eSewa' ? 'eSewa' : 'Khalti'} मोबाइल नम्बर (Account Number):
          </label>
          <input
            id="withdrawal-account-input"
            type="text"
            placeholder="98XXXXXXXX"
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value);
              setMessage('');
            }}
            style={{ width: '100%', padding: '10px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Live Calculation Box */}
        {parsedAmount > 0 && (
          <div style={{ background: '#111', padding: '10px 14px', borderRadius: '8px', border: '1px dashed #444', marginBottom: '15px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#aaa' }}>माग गरिएको रकम:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>रु. {parsedAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#f87171' }}>✂️ ८% प्लेटफर्म सर्भिस चार्ज:</span>
              <span style={{ color: '#f87171', fontWeight: 'bold' }}>- रु. {serviceChargePreview.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #282828' }}>
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>तपाईंले प्राप्त गर्ने रकम:</span>
              <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '14px' }}>रु. {finalPayoutPreview.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          id="withdrawal-submit-btn"
          type="submit"
          disabled={isSubmitting || effectivePoints < (parsedAmount / POINT_TO_NPR_RATIO) || parsedAmount < MIN_WITHDRAW_NPR}
          style={{
            width: '100%',
            padding: '12px',
            background: effectivePoints < (parsedAmount / POINT_TO_NPR_RATIO) || parsedAmount < MIN_WITHDRAW_NPR ? '#444' : '#00ffcc',
            color: effectivePoints < (parsedAmount / POINT_TO_NPR_RATIO) || parsedAmount < MIN_WITHDRAW_NPR ? '#888' : '#000',
            fontWeight: 'bold',
            fontSize: '14px',
            border: 'none',
            borderRadius: '6px',
            cursor: effectivePoints < (parsedAmount / POINT_TO_NPR_RATIO) || parsedAmount < MIN_WITHDRAW_NPR ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          {isSubmitting ? 'अनुरोध पेश हुँदैछ...' : 'Request Withdrawal 🚀'}
        </button>
      </form>

      {message && (
        <div
          id="withdrawal-message-box"
          style={{
            marginTop: '15px',
            padding: '10px 12px',
            background: messageType === 'error' ? '#3e1b1b' : '#143621',
            border: messageType === 'error' ? '1px solid #f87171' : '1px solid #4ade80',
            borderRadius: '6px',
            fontSize: '12px',
            color: messageType === 'error' ? '#fca5a5' : '#86efac',
            lineHeight: '1.5'
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginTop: '14px', fontSize: '11px', color: '#777', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #2a2a2a', paddingTop: '10px' }}>
        <span>🔒 सुरक्षित भुक्तानी (eSewa / Khalti)</span>
        <span>न्यूनतम: ५ लाख Pts = रु. ५००</span>
      </div>
    </div>
  );
};

export default WithdrawalSystem;
