import { SupportedCountryCode, LocalWalletConfig } from '../types';

export interface CountryInfo {
  code: SupportedCountryCode;
  name: string;
  nativeName: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  ratePerNpr: number; // 1 NPR = ratePerNpr in local currency
  minWithdrawalLocal: number;
  wallets: LocalWalletConfig[];
}

export interface CoinRechargePackage {
  id: string;
  coins: number;
  bonusCoins?: number;
  tag?: string;
  priceNpr: number;
}

export const COIN_PACKAGES: CoinRechargePackage[] = [
  { id: 'pack_1', coins: 500, priceNpr: 50 },
  { id: 'pack_2', coins: 1200, bonusCoins: 50, tag: 'लोकप्रिय (Popular)', priceNpr: 120 },
  { id: 'pack_3', coins: 3500, bonusCoins: 200, priceNpr: 350 },
  { id: 'pack_4', coins: 7000, bonusCoins: 500, tag: 'बेस्ट भ्यालु (Best Value)', priceNpr: 700 },
  { id: 'pack_5', coins: 17500, bonusCoins: 1500, priceNpr: 1750 },
  { id: 'pack_6', coins: 35000, bonusCoins: 4000, tag: 'VIP MEGA', priceNpr: 3500 },
];

export const SUPPORTED_COUNTRIES: CountryInfo[] = [
  {
    code: 'NP',
    name: 'Nepal',
    nativeName: 'नेपाल',
    flag: '🇳🇵',
    currency: 'NPR',
    currencySymbol: 'रू',
    ratePerNpr: 1,
    minWithdrawalLocal: 500,
    wallets: [
      {
        id: 'esewa',
        name: 'eSewa (इसेवा)',
        country: 'NP',
        countryName: 'Nepal',
        flag: '🇳🇵',
        currency: 'NPR',
        currencySymbol: 'रू',
        ratePerNpr: 1,
        accountLabel: 'eSewa ID / मोबाइल नम्बर',
        accountPlaceholder: '98XXXXXXXX / 97XXXXXXXX',
        helpText: '१० अंकको दर्ता भएको इसेवा आईडी नम्बर प्रविष्ट गर्नुहोस्',
        badgeColor: 'bg-[#60bb46] text-white',
      },
      {
        id: 'khalti',
        name: 'Khalti (खल्ती)',
        country: 'NP',
        countryName: 'Nepal',
        flag: '🇳🇵',
        currency: 'NPR',
        currencySymbol: 'रू',
        ratePerNpr: 1,
        accountLabel: 'Khalti मोबाइल नम्बर',
        accountPlaceholder: '98XXXXXXXX / 97XXXXXXXX',
        helpText: 'खल्ती खातासँग जोडिएको १० अंकको मोबाइल नम्बर',
        badgeColor: 'bg-[#5c2d91] text-white',
      },
      {
        id: 'imepay',
        name: 'IME Pay (आईएमई पे)',
        country: 'NP',
        countryName: 'Nepal',
        flag: '🇳🇵',
        currency: 'NPR',
        currencySymbol: 'रू',
        ratePerNpr: 1,
        accountLabel: 'IME Pay वालेट नम्बर',
        accountPlaceholder: '98XXXXXXXX',
        helpText: 'IME Pay वालेटमा दर्ता भएको मोबाइल नम्बर',
        badgeColor: 'bg-[#ed1c24] text-white',
      },
      {
        id: 'prabhupay',
        name: 'Prabhu Pay (प्रभु पे)',
        country: 'NP',
        countryName: 'Nepal',
        flag: '🇳🇵',
        currency: 'NPR',
        currencySymbol: 'रू',
        ratePerNpr: 1,
        accountLabel: 'Prabhu Pay नम्बर',
        accountPlaceholder: '98XXXXXXXX',
        helpText: 'प्रभु पे मोबाइल नम्बर प्रविष्ट गर्नुहोस्',
        badgeColor: 'bg-[#0054a6] text-white',
      },
      {
        id: 'connectips',
        name: 'ConnectIPS / Bank Transfer',
        country: 'NP',
        countryName: 'Nepal',
        flag: '🇳🇵',
        currency: 'NPR',
        currencySymbol: 'रू',
        ratePerNpr: 1,
        accountLabel: 'बैंक खाता नम्बर र बैंकको नाम',
        accountPlaceholder: 'खाता नम्बर, बैंकको नाम र शाखा',
        helpText: 'नेपालको जुनसुकै वाणिज्य बैंक वा विकास बैंक खाता',
        badgeColor: 'bg-blue-600 text-white',
      }
    ],
  },
  {
    code: 'IN',
    name: 'India',
    nativeName: 'भारत (India)',
    flag: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    ratePerNpr: 0.625, // 1 NPR = 0.625 INR (1 INR = 1.6 NPR)
    minWithdrawalLocal: 312.5, // 500 NPR = 312.5 INR
    wallets: [
      {
        id: 'upi',
        name: 'UPI (PhonePe / GPay / Paytm / BHIM)',
        country: 'IN',
        countryName: 'India',
        flag: '🇮🇳',
        currency: 'INR',
        currencySymbol: '₹',
        ratePerNpr: 0.625,
        accountLabel: 'UPI ID / VPA',
        accountPlaceholder: 'username@okhdfcbank वा 98XXXXXXXX@paytm',
        helpText: 'Any active Virtual Payment Address (UPI ID)',
        badgeColor: 'bg-emerald-600 text-white',
      },
      {
        id: 'paytm_in',
        name: 'Paytm Wallet',
        country: 'IN',
        countryName: 'India',
        flag: '🇮🇳',
        currency: 'INR',
        currencySymbol: '₹',
        ratePerNpr: 0.625,
        accountLabel: 'Paytm मोबाइल नम्बर',
        accountPlaceholder: '10-digit Indian Mobile Number',
        helpText: 'Registered KYC-verified Paytm mobile number',
        badgeColor: 'bg-[#002e6e] text-white',
      },
      {
        id: 'imps_in',
        name: 'IMPS / Bank Transfer (India)',
        country: 'IN',
        countryName: 'India',
        flag: '🇮🇳',
        currency: 'INR',
        currencySymbol: '₹',
        ratePerNpr: 0.625,
        accountLabel: 'Bank Account No & IFSC Code',
        accountPlaceholder: 'Account Number, IFSC (e.g. SBIN0001234)',
        helpText: 'Instant IMPS transfer to any Indian bank',
        badgeColor: 'bg-indigo-600 text-white',
      }
    ],
  },
  {
    code: 'PK',
    name: 'Pakistan',
    nativeName: 'پاکستان (Pakistan)',
    flag: '🇵🇰',
    currency: 'PKR',
    currencySymbol: '₨',
    ratePerNpr: 2.1, // 1 NPR = 2.1 PKR
    minWithdrawalLocal: 1050, // 500 NPR = 1050 PKR
    wallets: [
      {
        id: 'easypaisa',
        name: 'Easypaisa',
        country: 'PK',
        countryName: 'Pakistan',
        flag: '🇵🇰',
        currency: 'PKR',
        currencySymbol: '₨',
        ratePerNpr: 2.1,
        accountLabel: 'Easypaisa Mobile Account',
        accountPlaceholder: '03XXXXXXXXX (11 digits)',
        helpText: 'Active Easypaisa wallet number in Pakistan',
        badgeColor: 'bg-[#00a651] text-white',
      },
      {
        id: 'jazzcash',
        name: 'JazzCash',
        country: 'PK',
        countryName: 'Pakistan',
        flag: '🇵🇰',
        currency: 'PKR',
        currencySymbol: '₨',
        ratePerNpr: 2.1,
        accountLabel: 'JazzCash Mobile Account',
        accountPlaceholder: '03XXXXXXXXX (11 digits)',
        helpText: 'Active JazzCash wallet number in Pakistan',
        badgeColor: 'bg-[#e51937] text-white',
      },
      {
        id: 'sadapay_nayapay',
        name: 'SadaPay / NayaPay / Raast',
        country: 'PK',
        countryName: 'Pakistan',
        flag: '🇵🇰',
        currency: 'PKR',
        currencySymbol: '₨',
        ratePerNpr: 2.1,
        accountLabel: 'Account IBAN or Mobile',
        accountPlaceholder: '03XXXXXXXXX / PK... IBAN',
        helpText: 'Instant Raast ID or SadaPay/NayaPay account',
        badgeColor: 'bg-teal-600 text-white',
      }
    ],
  },
  {
    code: 'PH',
    name: 'Philippines',
    nativeName: 'Pilipinas (Philippines)',
    flag: '🇵🇭',
    currency: 'PHP',
    currencySymbol: '₱',
    ratePerNpr: 0.42, // 1 NPR = 0.42 PHP
    minWithdrawalLocal: 210, // 500 NPR = 210 PHP
    wallets: [
      {
        id: 'gcash',
        name: 'GCash',
        country: 'PH',
        countryName: 'Philippines',
        flag: '🇵🇭',
        currency: 'PHP',
        currencySymbol: '₱',
        ratePerNpr: 0.42,
        accountLabel: 'GCash Mobile Number',
        accountPlaceholder: '09XXXXXXXXX (11 digits)',
        helpText: 'Registered fully-verified GCash mobile number',
        badgeColor: 'bg-[#007dfe] text-white',
      },
      {
        id: 'maya',
        name: 'Maya (PayMaya)',
        country: 'PH',
        countryName: 'Philippines',
        flag: '🇵🇭',
        currency: 'PHP',
        currencySymbol: '₱',
        ratePerNpr: 0.42,
        accountLabel: 'Maya Mobile Number / Account',
        accountPlaceholder: '09XXXXXXXXX (11 digits)',
        helpText: 'Registered Maya mobile wallet number',
        badgeColor: 'bg-[#000000] text-[#00ff87] border border-[#00ff87]/30',
      },
      {
        id: 'coinsph',
        name: 'Coins.ph / GrabPay',
        country: 'PH',
        countryName: 'Philippines',
        flag: '🇵🇭',
        currency: 'PHP',
        currencySymbol: '₱',
        ratePerNpr: 0.42,
        accountLabel: 'Coins.ph / GrabPay Mobile/Email',
        accountPlaceholder: 'Mobile number or email address',
        helpText: 'Philippine e-wallet account details',
        badgeColor: 'bg-emerald-700 text-white',
      }
    ],
  },
  {
    code: 'GLOBAL',
    name: 'Other Countries / Global',
    nativeName: 'International (UAE, Gulf, USA, UK, Europe, etc.)',
    flag: '🌍',
    currency: 'USD',
    currencySymbol: '$',
    ratePerNpr: 0.0075, // 1 NPR = ~0.0075 USD (1 USD = ~133 NPR)
    minWithdrawalLocal: 3.75, // 500 NPR = $3.75
    wallets: [
      {
        id: 'binance_usdt',
        name: 'Binance Pay / USDT (TRC-20 / BEP-20)',
        country: 'GLOBAL',
        countryName: 'Global',
        flag: '🌍',
        currency: 'USDT',
        currencySymbol: '$',
        ratePerNpr: 0.0075,
        accountLabel: 'Binance Pay ID / USDT TRC-20 Address',
        accountPlaceholder: 'T... (TRC20 Address) or Binance Pay ID',
        helpText: 'Worldwide zero-fee instant cryptocurrency payout',
        badgeColor: 'bg-[#f3ba2f] text-black font-bold',
      },
      {
        id: 'paypal_global',
        name: 'PayPal International',
        country: 'GLOBAL',
        countryName: 'Global',
        flag: '🌍',
        currency: 'USD',
        currencySymbol: '$',
        ratePerNpr: 0.0075,
        accountLabel: 'PayPal Email Address',
        accountPlaceholder: 'youremail@example.com',
        helpText: 'PayPal registered account email address',
        badgeColor: 'bg-[#003087] text-white',
      },
      {
        id: 'wise_global',
        name: 'Wise / Bank Wire (Global)',
        country: 'GLOBAL',
        countryName: 'Global',
        flag: '🌍',
        currency: 'USD',
        currencySymbol: '$',
        ratePerNpr: 0.0075,
        accountLabel: 'Wise Email / IBAN / Swift',
        accountPlaceholder: 'Wise account email or international IBAN',
        helpText: 'Global multi-currency direct bank transfer',
        badgeColor: 'bg-[#25c974] text-black font-bold',
      }
    ],
  }
];

export function getCountryByCode(code: string): CountryInfo {
  return SUPPORTED_COUNTRIES.find(c => c.code === code) || SUPPORTED_COUNTRIES[0];
}

export function calculateLocalAmounts(amountNpr: number, countryCode: SupportedCountryCode) {
  const country = getCountryByCode(countryCode);
  const localGross = Number((amountNpr * country.ratePerNpr).toFixed(2));
  const serviceChargeNpr = Number((amountNpr * 0.08).toFixed(2));
  const finalPayoutNpr = Number((amountNpr - serviceChargeNpr).toFixed(2));
  const localServiceCharge = Number((localGross * 0.08).toFixed(2));
  const localNetPayout = Number((localGross - localServiceCharge).toFixed(2));

  return {
    country,
    amountNpr,
    serviceChargeNpr,
    finalPayoutNpr,
    localGross,
    localServiceCharge,
    localNetPayout,
  };
}
