import { WithdrawalRequest, User, AdSettings } from '../src/types';

export interface TelegramSendResult {
  success: boolean;
  skipped?: boolean;
  message?: string;
  error?: string;
  telegramResponse?: any;
}

/**
 * Sends a raw text message to a specific Telegram Chat via the official Telegram Bot API
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: 'Markdown' | 'HTML' = 'HTML'
): Promise<TelegramSendResult> {
  if (!botToken || !botToken.trim() || !chatId || !chatId.trim()) {
    return {
      success: false,
      skipped: true,
      error: 'Telegram Bot Token or Chat ID is missing',
    };
  }

  const cleanToken = botToken.trim().replace(/^bot/i, '');
  const cleanChatId = chatId.trim();
  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error('[Telegram Bot API Error]:', data);
      return {
        success: false,
        error: data.description || `HTTP ${response.status}: Failed to send Telegram alert`,
        telegramResponse: data,
      };
    }

    console.log(`[Telegram Alert Sent Successfully] Message ID: ${data.result?.message_id} to Chat: ${cleanChatId}`);
    return {
      success: true,
      message: 'Telegram alert delivered successfully',
      telegramResponse: data,
    };
  } catch (err: any) {
    console.error('[Telegram Network Error]:', err);
    return {
      success: false,
      error: err?.message || 'Network exception while connecting to Telegram API',
    };
  }
}

/**
 * Formats and dispatches an instant withdrawal notification to the Admin via Telegram
 */
export async function sendWithdrawalTelegramAlert(
  withdrawal: WithdrawalRequest,
  user?: User,
  settings?: AdSettings
): Promise<TelegramSendResult> {
  const botToken = settings?.telegramBotToken;
  const chatId = settings?.telegramChatId;
  const isEnabled = settings?.telegramAlertsEnabled !== false;

  if (!isEnabled) {
    return {
      success: false,
      skipped: true,
      error: 'Telegram alerts are disabled in Admin settings',
    };
  }

  if (!botToken || !chatId) {
    return {
      success: false,
      skipped: true,
      error: 'Telegram Bot Token or Chat ID not configured in Admin Dashboard',
    };
  }

  const dateObj = new Date(withdrawal.requestedAt || Date.now());
  const formattedDate = dateObj.toLocaleString('en-US', {
    timeZone: 'Asia/Kathmandu',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const paymentIcon = withdrawal.paymentMethod === 'esewa' ? '🟢 eSewa' : '🟣 Khalti';

  const serviceCharge = withdrawal.serviceChargeNpr ?? Number((withdrawal.amountNpr * 0.08).toFixed(2));
  const finalPayout = withdrawal.finalPayoutNpr ?? Number((withdrawal.amountNpr - serviceCharge).toFixed(2));

  // HTML format for robust character escaping
  const message = `
🚨 <b>नयाँ विथड्रल अलर्ट (TikTop Withdrawal Alert)</b> 🇳🇵
━━━━━━━━━━━━━━━━━━━━
👤 <b>प्रयोगकर्ता:</b> @${user?.username || withdrawal.username} (<code>${withdrawal.userId}</code>)
📝 <b>पूरा नाम:</b> ${withdrawal.fullName}
💰 <b>माग गरिएको रकम:</b> <b>रु. ${withdrawal.amountNpr} NPR</b>
✂️ <b>८% सर्भिस चार्ज:</b> रु. ${serviceCharge} NPR
💵 <b>प्रयोगकर्ताले पाउने (Net Payout):</b> <b>रु. ${finalPayout} NPR</b>
💎 <b>काटिएको पोइन्ट:</b> ${withdrawal.pointsDeducted.toLocaleString('en-IN')} Points
💳 <b>भुक्तानी माध्यम:</b> ${paymentIcon}
📱 <b>खाता / मोबाइल नं:</b> <code>${withdrawal.mobileNumber}</code>
🆔 <b>अनुरोध ID:</b> <code>${withdrawal.id}</code>
⏱ <b>समय (Nepal Time):</b> ${formattedDate}
📊 <b>स्थिति:</b> ⏳ <b>Pending (प्रतिक्षारत)</b>
━━━━━━━━━━━━━━━━━━━━
👉 <i>TikTop Admin Panel मा लगइन गरी भुक्तानी स्वीकृत (Approve) वा अस्वीकृत (Reject) गर्नुहोस्।</i>
`.trim();

  return sendTelegramMessage(botToken, chatId, message, 'HTML');
}

/**
 * Sends a test message to verify Telegram credentials
 */
export async function sendTestTelegramAlert(
  botToken: string,
  chatId: string
): Promise<TelegramSendResult> {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kathmandu',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const message = `
✅ <b>TikTop Telegram Bot जडान सफल भयो! (Connection Test)</b>
━━━━━━━━━━━━━━━━━━━━
🔔 यो एक परीक्षण सन्देश (Test Notification) हो।
📱 <b>च्याट ID:</b> <code>${chatId}</code>
⏱ <b>समय:</b> ${now}
🚀 अब कुनै पनि प्रयोगकर्ताले ५ लाख पोइन्ट पुर्याएर विथड्र (eSewa/Khalti) गर्दा तपाईंको टेलिग्राममा तुरुन्तै लाइभ अलर्ट आउनेछ!
━━━━━━━━━━━━━━━━━━━━
✨ <i>TikTop Admin Security Engine</i>
`.trim();

  return sendTelegramMessage(botToken, chatId, message, 'HTML');
}
