// =========================================================================
// LUCKY GIFT FEEDBACK COINS & REWARD ENGINE (लक्की गिफ्ट क्यासब्याक इन्जिन)
// =========================================================================
// गिफ़्टर (Gifter) ले Face Live मा Host वा Party Live मा Host/Guest जसलाई
// लक्की गिफ्ट पठाए पनि:
// 1. Gifter लाई धेरैजसो (65.5% hit rate) Feedback Coins फिर्ता आउँछ।
// 2. १०० को गिफ्टमा randomly: 120, 135, 200, 525, 1123, 1890 देखि 5K (५,०००) सम्म ब्याक!
// 3. कहिलेकाहीँ (34.5%) ब्याक नआउने (0 coins)।
// 4. रिसिभर (Host वा Guest) ले १०० कोइन बराबर मात्र ३ Points (३%) प्राप्त गर्छ।
// 5. डेभलपरलाई ~20-22% सुरक्षित मुनाफा (Developer House Edge) सुनिश्चित हुने।
// =========================================================================

export interface LuckyGiftOutcome {
  isLucky: boolean;
  totalSpentCoins: number;
  isWin: boolean;
  winCoins: number;
  netCoinsChange: number; // winCoins - totalSpentCoins
  multiplierLabel: string; // e.g. "1.2x", "1.35x", "2x", "5.25x", "11.23x", "18.9x", "50x 💎", "0x"
  receiverPoints: number; // exactly 3 points per 100 coins
  developerProfitCoins: number;
  tier: 'loss' | 'partial' | 'small' | 'double' | 'big' | 'super' | 'mega' | 'jackpot';
  messageNp: string;
}

/**
 * Converts numbers to Nepali numerals string (e.g. 165 -> १६५)
 */
export function toNepaliDigits(num: number): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return num.toLocaleString('en-US').replace(/\d/g, d => nepaliDigits[parseInt(d, 10)]);
}

/**
 * Calculates the feedback coins and recipient points for a lucky gift transaction.
 * @param totalSpentCoins Total coins spent on this gift (gift.coins * multiplier * seats)
 */
export function calculateLuckyGiftResult(totalSpentCoins: number): LuckyGiftOutcome {
  const scale = totalSpentCoins / 100;
  // रिसिभरले १०० कोइनमा ठीक ३ पोइन्ट्स पाउँछन्
  const receiverPoints = Math.max(1, Math.round(scale * 3));

  // ०.० देखि १.० सम्मको यादृच्छिक संख्या (Random seed)
  const rand = Math.random();

  let isWin = false;
  let winCoins = 0;
  let multiplierLabel = '0x';
  let tier: LuckyGiftOutcome['tier'] = 'loss';
  let messageNp = 'अर्को पटक अवश्य भाग्य खुल्नेछ!';

  // =========================================================================
  // 확률 बाँडफाँड (Weighted Probability Distribution):
  // -------------------------------------------------------------------------
  // 1. 0.000 to 0.001 (0.1% chance) -> 50x BUMPER JACKPOT (5K / 5,000 coins)
  // 2. 0.001 to 0.005 (0.4% chance) -> 18.9x MEGA WIN (1,890 coins)
  // 3. 0.005 to 0.015 (1.0% chance) -> 11.23x SUPER WIN (1,123 coins)
  // 4. 0.015 to 0.045 (3.0% chance) -> 5.25x BIG WIN (525 coins)
  // 5. 0.045 to 0.125 (8.0% chance) -> 2.0x DOUBLE WIN (200 coins)
  // 6. 0.125 to 0.305 (18.0% chance) -> 1.2x - 1.35x SMALL PROFIT (120, 135 coins)
  // 7. 0.305 to 0.655 (35.0% chance) -> PARTIAL CASHBACK (35 - 85 coins)
  // 8. 0.655 to 1.000 (34.5% chance) -> BACK नआउने (0 coins / Try Next Time)
  // =========================================================================

  if (rand < 0.001) {
    // 1. 50x BUMPER JACKPOT (5,000 Coins)
    isWin = true;
    winCoins = Math.round(5000 * scale);
    multiplierLabel = '50x MEGA JACKPOT 💎';
    tier = 'jackpot';
    const totalCashback = totalSpentCoins + winCoins;
    messageNp = `🔥 बम्पर ज्याकपट! तपाईंलाई ${toNepaliDigits(totalCashback)} Case back आयो! 💎`;
  } else if (rand < 0.005) {
    // 2. 18.9x MEGA WIN (1,890 Coins)
    isWin = true;
    const variations = [1850, 1890, 1920];
    const picked = variations[Math.floor(Math.random() * variations.length)];
    winCoins = Math.round(picked * scale);
    multiplierLabel = '18.9x MEGA WIN 🔥';
    tier = 'mega';
    const totalCashback = totalSpentCoins + winCoins;
    messageNp = `💥 मेगा विन! तपाईंलाई ${toNepaliDigits(totalCashback)} Case back आयो! 🔥`;
  } else if (rand < 0.015) {
    // 3. 11.23x SUPER WIN (1,123 Coins)
    isWin = true;
    const variations = [1100, 1123, 1150];
    const picked = variations[Math.floor(Math.random() * variations.length)];
    winCoins = Math.round(picked * scale);
    multiplierLabel = '11.23x SUPER WIN 🚀';
    tier = 'super';
    const totalCashback = totalSpentCoins + winCoins;
    messageNp = `⚡ सुपर विन! तपाईंलाई ${toNepaliDigits(totalCashback)} Case back आयो! 🚀`;
  } else if (rand < 0.045) {
    // 4. 5.25x BIG WIN (525 Coins)
    isWin = true;
    const variations = [500, 525, 550];
    const picked = variations[Math.floor(Math.random() * variations.length)];
    winCoins = Math.round(picked * scale);
    multiplierLabel = '5.25x BIG WIN ✨';
    tier = 'big';
    const totalCashback = totalSpentCoins + winCoins;
    messageNp = `✨ बिग विन! तपाईंलाई ${toNepaliDigits(totalCashback)} Case back आयो! 🌟`;
  } else if (rand < 0.125) {
    // 5. 2.0x DOUBLE WIN (200 Coins)
    isWin = true;
    const variations = [190, 200, 210, 220];
    const picked = variations[Math.floor(Math.random() * variations.length)];
    winCoins = Math.round(picked * scale);
    multiplierLabel = '2.0x DOUBLE ✌️';
    tier = 'double';
    const totalCashback = totalSpentCoins + winCoins;
    messageNp = `✌️ डबल कोइन! तपाईंलाई ${toNepaliDigits(totalCashback)} Case back आयो! 🎉`;
  } else if (rand < 0.305) {
    // 6. 1.2x - 1.35x SMALL PROFIT (120, 135 Coins)
    isWin = true;
    const variations = [120, 125, 130, 135, 140];
    const picked = variations[Math.floor(Math.random() * variations.length)];
    winCoins = Math.round(picked * scale);
    const multi = (picked / 100).toFixed(2);
    multiplierLabel = `${multi}x WIN 🎁`;
    tier = 'small';
    const totalCashback = totalSpentCoins + winCoins;
    messageNp = `🎉 लक्की जीत! तपाईंलाई ${toNepaliDigits(totalCashback)} Case back आयो! (${multi}x)`;
  } else if (rand < 0.655) {
    // 7. PARTIAL CASHBACK (35 - 85 Coins) - धेरैजसो ब्याक आउने (e.g. 100 मा 65 -> 165 Case back)
    isWin = true;
    const variations = [35, 45, 55, 65, 75, 85];
    const picked = variations[Math.floor(Math.random() * variations.length)];
    winCoins = Math.round(picked * scale);
    multiplierLabel = 'क्यासब्याक 🪙';
    tier = 'partial';
    const totalCashback = totalSpentCoins + winCoins;
    messageNp = `🪙 लक्की क्यासब्याक! तपाईंलाई ${toNepaliDigits(totalCashback)} Case back आयो!`;
  } else {
    // 8. BACK नआउने (0 Coins)
    isWin = false;
    winCoins = 0;
    multiplierLabel = '0x ❌';
    tier = 'loss';
    messageNp = 'अर्को पटक अवश्य भाग्य खुल्नेछ!';
  }

  // Developer guaranteed margin calculation
  // Total Spent = winCoins (to gifter) + receiverPoints (to creator) + developerProfit
  const developerProfitCoins = Math.max(0, totalSpentCoins - (winCoins + receiverPoints));

  return {
    isLucky: true,
    totalSpentCoins,
    isWin,
    winCoins,
    netCoinsChange: winCoins - totalSpentCoins,
    multiplierLabel,
    receiverPoints,
    developerProfitCoins,
    tier,
    messageNp,
  };
}
