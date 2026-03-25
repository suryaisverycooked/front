export async function sendTelegramAlert(
  botToken: string,
  chatId: string,
  location: string,
  riskScore: number,
  damageType: string,
  severity: string
): Promise<boolean> {
  if (!botToken || !chatId) return false;

  const message = `🚨 *HIGH RISK INFRASTRUCTURE ALERT*

📍 *Location:* ${location}
⚠️ *Risk Score:* ${riskScore}/100
🔴 *Severity:* ${severity}
🔧 *Damage Type:* ${damageType}

🕐 *Detected at:* ${new Date().toLocaleString()}

_Automated alert from Invisible Infrastructure AI System_`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );
    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}
