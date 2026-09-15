import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Award,
  AlertTriangle,
  UserX,
  UserCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Lock,
  RotateCcw,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { liveAudio } from '../../utils/liveAudio';
import { getDailyLiveRecord } from '../../utils/dailyLiveTracker';

interface LiveRewardAndSafetyControllerProps {
  isHost: boolean;
  onCloseRoom: () => void;
  isPersonDetected: boolean;
  setIsPersonDetected: (detected: boolean) => void;
  liveSeconds: number;
  setLiveSeconds: React.Dispatch<React.SetStateAction<number>>;
  absentSeconds: number;
  setAbsentSeconds: React.Dispatch<React.SetStateAction<number>>;
  streamType?: 'video' | 'voice';
}

export const LiveRewardAndSafetyController: React.FC<LiveRewardAndSafetyControllerProps> = ({
  isHost,
  onCloseRoom,
  isPersonDetected,
  setIsPersonDetected,
  liveSeconds,
  setLiveSeconds,
  absentSeconds,
  setAbsentSeconds,
  streamType = 'video',
}) => {
  const { currentUser, claimLiveReward, banUserLive, banUserAccount, resetUserBans } = useAuth();

  const [claimedMilestone1, setClaimedMilestone1] = useState<boolean>(() => {
    const record = getDailyLiveRecord(currentUser?.id || 'guest_creator');
    return record.claimedMilestone1;
  });
  const [claimedMilestone2, setClaimedMilestone2] = useState<boolean>(() => {
    const record = getDailyLiveRecord(currentUser?.id || 'guest_creator');
    return record.claimedMilestone2;
  });
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  // Sync claimed states if user or date changes (e.g. 12:00 AM reset)
  useEffect(() => {
    const record = getDailyLiveRecord(currentUser?.id || 'guest_creator');
    setClaimedMilestone1(record.claimedMilestone1);
    setClaimedMilestone2(record.claimedMilestone2);
  }, [currentUser?.id, liveSeconds === 0]);

  // Warning and Penalty States
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [graceCountdown, setGraceCountdown] = useState<number>(15);
  const [activeBanModal, setActiveBanModal] = useState<{
    type: 'live_24h' | 'account_3d';
    title: string;
    message: string;
    duration: string;
  } | null>(null);

  // Reward unlocked celebration modal
  const [rewardCelebration, setRewardCelebration] = useState<{
    milestone: 1 | 2;
    points: number;
    title: string;
    description: string;
  } | null>(null);

  const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(false);

  // Sound alert tracker
  const warningPlayedRef = useRef<boolean>(false);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 1-minute (60 seconds) Absence Detection (ONLY for Video / Face Live!)
  useEffect(() => {
    if (!isHost || streamType === 'voice') return;

    if (absentSeconds >= 60 && !showWarningModal && !activeBanModal) {
      setShowWarningModal(true);
      setGraceCountdown(15);
      if (!warningPlayedRef.current) {
        warningPlayedRef.current = true;
        try {
          liveAudio.playSoundboard('horn');
        } catch {
          // ignore
        }
      }
    }

    if (isPersonDetected) {
      // If person returns, clear the warning modal and reset grace
      if (showWarningModal) {
        setShowWarningModal(false);
        warningPlayedRef.current = false;
      }
    }
  }, [absentSeconds, isPersonDetected, isHost, showWarningModal, activeBanModal]);

  // Grace Countdown Timer when Warning is Active
  useEffect(() => {
    if (!showWarningModal || activeBanModal) return;

    const interval = setInterval(() => {
      setGraceCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleExecutePenalty();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarningModal, activeBanModal]);

  // Execute Penalty: 24h Live Ban or 3-day Account Ban (if repeated)
  const handleExecutePenalty = async () => {
    setShowWarningModal(false);
    const priorViolations = currentUser?.liveViolationsCount || 0;

    // Rule: खुले पछि पनि बारम्बार एकै गल्ती दोहोरियो भने account ३ दिनको लागि बन्द गर्ने
    if (priorViolations >= 1) {
      await banUserAccount(3, 'लाइभमा बारम्बार क्यामेरा छोडेर मानिस नदेखिएको उल्लङ्घन (Repeated Violation: 3-Day Account Ban)');
      setActiveBanModal({
        type: 'account_3d',
        title: '🚫 खाता ३ दिनको लागि निलम्बित (Account Banned for 3 Days)',
        message: 'लाइभ स्ट्रिममा बारम्बार १ मिनेटभन्दा बढी मानिस नदेखिएर क्यामेरा खाली छोडेको गम्भीर उल्लङ्घनका कारण तपाईंको खाता ३ दिनका लागि बन्द गरिएको छ।',
        duration: '३ दिन (७२ घण्टा)',
      });
    } else {
      // Rule: मानिस १ मिनेट सम्म नदेखिएको भए warning सन्देश दिने बारम्बार गल्ती गरिरहे २४ hour live band गरिदिने
      await banUserLive(24, 'लाइभमा १ मिनेटभन्दा बढी मानिस नदेखिएको उल्लङ्घन (First Violation: 24-Hour Live Ban)');
      setActiveBanModal({
        type: 'live_24h',
        title: '🚫 २४ घण्टा लाइभ प्रतिबन्ध (24-Hour Live Ban)',
        message: 'क्यामेरा अगाडि १ मिनेटसम्म कोही पनि मानिस नदेखिएकाले र समयमै उपस्थित नभएकाले तपाईंलाई २४ घण्टाको लागि लाइभ बस्न प्रतिबन्ध गरिएको छ।',
        duration: '२४ घण्टा',
      });
    }
  };

  // Milestone 1: 1 Hour (3,600s) = 1K points
  useEffect(() => {
    if (!isHost || claimedMilestone1) return;
    if (liveSeconds >= 3600) {
      handleAutoClaimMilestone(1);
    }
  }, [liveSeconds, isHost, claimedMilestone1]);

  // Milestone 2: 2 Hours (7,200s) = +1K points (Total 2K pts, Cap)
  useEffect(() => {
    if (!isHost || claimedMilestone2) return;
    if (liveSeconds >= 7200) {
      handleAutoClaimMilestone(2);
    }
  }, [liveSeconds, isHost, claimedMilestone2]);

  const handleAutoClaimMilestone = async (milestone: 1 | 2) => {
    setIsClaiming(true);
    try {
      const res = await claimLiveReward(milestone, liveSeconds);
      if (res.success) {
        if (milestone === 1) {
          setClaimedMilestone1(true);
          setRewardCelebration({
            milestone: 1,
            points: 1000,
            title: '🎉 १ घण्टा लाइभ पूरा भयो!',
            description: 'बधाई छ! तपाईंले १ घण्टा निरन्तर लाइभ बसे बापत १,००० (1K) पोइन्ट प्राप्त गर्नुभएको छ।',
          });
        } else if (milestone === 2) {
          setClaimedMilestone2(true);
          setRewardCelebration({
            milestone: 2,
            points: 1000,
            title: '🏆 २ घण्टा लाइभ पूरा भयो (+1K Cap)!',
            description: 'बधाई छ! तपाईंले २ घण्टा लाइभ पूरा गरे बापत थप १,००० (+1K) पोइन्ट प्राप्त गर्नुभएको छ। अब अधिकतम २ घण्टाको रिवार्ड क्याप पूरा भएको छ।',
          });
        }
        try {
          liveAudio.playSoundboard('cheer');
        } catch {
          // ignore
        }
      }
    } finally {
      setIsClaiming(false);
    }
  };

  // Manual Claim Button Handler
  const handleManualClaim = async (milestone: 1 | 2) => {
    if (isClaiming) return;
    await handleAutoClaimMilestone(milestone);
  };

  // Fast Test Helpers
  const handleFastForward = (secondsToAdd: number) => {
    setLiveSeconds(prev => prev + secondsToAdd);
  };

  const handleSimulateAbsenceWarning = () => {
    setIsPersonDetected(false);
    setAbsentSeconds(60);
  };

  const handleSimulateRepeatedViolationBan = async () => {
    await banUserAccount(3, 'परिक्षण: बारम्बार क्यामेरा छोडेको उल्लङ्घन (3-Day Ban Test)');
    setActiveBanModal({
      type: 'account_3d',
      title: '🚫 खाता ३ दिनको लागि निलम्बित (Account Banned for 3 Days)',
      message: 'लाइभ स्ट्रिममा बारम्बार क्यामेरा खाली छोडेको गम्भीर उल्लङ्घनका कारण तपाईंको खाता ३ दिनका लागि बन्द गरिएको छ।',
      duration: '३ दिन (७२ घण्टा)',
    });
  };

  const handleResetBansTest = async () => {
    await resetUserBans();
    setActiveBanModal(null);
    setShowWarningModal(false);
    setIsPersonDetected(true);
    setAbsentSeconds(0);
  };

  // Percentage calculations for milestones
  const progress1Hr = Math.min(100, Math.round((liveSeconds / 3600) * 100));
  const progress2Hr = Math.min(100, Math.max(0, Math.round(((liveSeconds - 3600) / 3600) * 100)));
  const isCapReached = liveSeconds >= 7200;

  return (
    <>
      {/* --- 1-MINUTE WARNING MODAL (६० सेकेन्ड मानिस नदेखिएपछि आउने चेतावनी) --- */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border-2 border-rose-500 bg-zinc-950 p-5 shadow-2xl text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 border border-rose-500 text-rose-500 animate-bounce">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h3 className="text-lg font-black text-rose-400 mb-1">
              ⚠️ कडा चेतावनी (Safety Warning)
            </h3>
            <p className="text-xs font-bold text-white mb-2">
              क्यामेरा अगाडि १ मिनेटदेखि कोही पनि मानिस देखिएको छैन!
            </p>

            <div className="rounded-xl bg-rose-950/50 border border-rose-500/30 p-3 mb-4 text-left">
              <p className="text-[11px] text-zinc-300 leading-relaxed mb-1.5">
                • लाइभ समय गणना र विज्ञापन तुरुन्त रोकिएको छ।
              </p>
              <p className="text-[11px] text-zinc-300 leading-relaxed mb-1.5">
                • यदि तपाईं क्यामेरा अगाडि आउनुभएन भने <strong className="text-rose-300">२४ घण्टाका लागि लाइभ बन्द र प्रतिबन्ध</strong> गरिनेछ।
              </p>
              <p className="text-[11px] text-rose-300 leading-relaxed font-semibold">
                • फेरि दोहोरिएमा तपाईंको खाता <strong className="text-white underline">३ दिनका लागि पूर्ण बन्द (Account Ban)</strong> हुनेछ।
              </p>
            </div>

            {/* Grace Countdown */}
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-900/60 border border-rose-400 px-3 py-1 font-mono text-sm font-black text-rose-200 animate-pulse">
                <Clock className="h-4 w-4" />
                <span>समय बाँकी: {graceCountdown} सेकेन्ड</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPersonDetected(true);
                  setAbsentSeconds(0);
                  setShowWarningModal(false);
                }}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 font-black text-white text-sm shadow-lg hover:brightness-110 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <UserCheck className="h-4 w-4" />
                <span>म क्यामेरा अगाडि उपस्थित भएँ ✅</span>
              </button>

              <button
                type="button"
                onClick={handleExecutePenalty}
                className="w-full rounded-xl bg-zinc-800 py-2 font-bold text-zinc-400 text-xs hover:bg-zinc-700"
              >
                उल्लङ्घन स्वीकार गरी लाइभ बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BAN EXECUTION MODAL (24-Hour Live Ban or 3-Day Account Ban) --- */}
      {activeBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-lg animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border-2 border-red-600 bg-zinc-950 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20 border border-red-500 text-red-500">
              <ShieldAlert className="h-10 w-10" />
            </div>

            <h3 className="text-lg font-black text-red-400 mb-2">
              {activeBanModal.title}
            </h3>

            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              {activeBanModal.message}
            </p>

            <div className="rounded-xl bg-red-950/60 border border-red-500/40 p-3 mb-4 text-xs">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span>प्रतिबन्ध अवधि:</span>
                <span className="font-bold text-red-300">{activeBanModal.duration}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>कारण:</span>
                <span className="font-bold text-zinc-200">क्यामेरामा मानिस नदेखिएको</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveBanModal(null);
                  onCloseRoom();
                }}
                className="w-full rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-sm font-black text-white shadow-lg active:scale-95"
              >
                सम्झौता स्वीकार गरी बाहिरिनुहोस् (Exit)
              </button>

              {/* Developer / Tester Unban Button */}
              <button
                type="button"
                onClick={handleResetBansTest}
                className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 py-1.5 text-[11px] font-bold text-zinc-300 flex items-center justify-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> परिक्षणका लागि प्रतिबन्ध फुकाउनुहोस् (Test Unban)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MILESTONE REWARD CELEBRATION MODAL --- */}
      {rewardCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 animate-pulse">
              <Award className="h-10 w-10" />
            </div>

            <span className="inline-block rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-black text-amber-300 mb-2 border border-amber-400/30">
              {rewardCelebration.milestone === 1 ? 'माइलस्टोन १ पूरा' : 'माइलस्टोन २ (क्याप)'}
            </span>

            <h3 className="text-lg font-black text-white mb-2">
              {rewardCelebration.title}
            </h3>

            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              {rewardCelebration.description}
            </p>

            <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3 mb-5 flex items-center justify-around">
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 font-bold uppercase">प्राप्त रिवार्ड</p>
                <p className="text-xl font-black text-amber-300">
                  +{rewardCelebration.points.toLocaleString()} Points
                </p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 font-bold uppercase">लाइभ समय</p>
                <p className="text-sm font-black text-white font-mono">
                  {formatTime(liveSeconds)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRewardCelebration(null)}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-black text-white text-sm shadow-lg hover:brightness-110 active:scale-95"
            >
              धन्यवाद! लाइभ जारी राख्नुहोस् 🚀
            </button>
          </div>
        </div>
      )}
    </>
  );
};
