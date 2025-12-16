import { Resend } from 'resend';
import QRCode from 'qrcode';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vouchers } = req.body;

  if (!vouchers || !Array.isArray(vouchers)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const emailPromises = vouchers.map(async (voucher) => {
      const baseUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000'; 
      const voucherUrl = `${baseUrl}/?email=${encodeURIComponent(voucher.email)}`;
      
// Generate QR code as base64
      const qrCodeDataUrl = await QRCode.toDataURL(voucher.id, {
        width: 300,
        margin: 2
      });
      
      return resend.emails.send({
        from: 'onboarding@resend.dev',
        to: voucher.email,
        subject: `Your ${voucher.event_name} Drink Vouchers`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Your Drink Vouchers</h1>
            <p>You've received <strong>${voucher.total_drinks} drink vouchers</strong> for ${voucher.event_name}!</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h2 style="margin-top: 0;">Your QR Code:</h2>
              <img src="${qrCodeDataUrl}" alt="Voucher QR Code" style="max-width: 300px; height: auto; display: block; margin: 0 auto;" />
              <p style="font-family: monospace; font-size: 12px; color: #666; margin-top: 10px; word-break: break-all;">
                ID: ${voucher.id}
              </p>
            </div>

            <p><strong>To use your vouchers:</strong></p>
            <ol>
              <li>Visit: ${voucherUrl}</li>
              <li>Enter your email: <strong>${voucher.email}</strong></li>
              <li>Show the QR code to the bartender</li>
            </ol>
            <div style="background: #f0f0f0; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">
              ${voucherUrl}
            </div>
          </div>
        `
      });
    });

    await Promise.all(emailPromises);
    return res.status(200).json({ success: true, sent: vouchers.length });
  } catch (error) {
    console.error('Error sending emails:', error);
    return res.status(500).json({ error: 'Failed to send emails', details: error.message });
  }
}