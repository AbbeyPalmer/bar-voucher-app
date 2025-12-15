import { Resend } from 'resend';

const resend = new Resend('re_Ggx3r7kM_HdTwR59gnmujMpJkVFj3ybZp');
    
export default async function handler(req, res) {
  // Enable CORS
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
    const emailPromises = vouchers.map(voucher => {
      const voucherUrl = `${process.env.APP_URL}?email=${encodeURIComponent(voucher.email)}`;
      
      return resend.emails.send({
        from: 'onboarding@resend.dev',
        to: voucher.email,
        subject: `Your ${voucher.event_name} Drink Vouchers`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Your Drink Vouchers</h1>
            <p>You've received <strong>${voucher.total_drinks} drink vouchers</strong> for ${voucher.event_name}!</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Your Voucher ID:</h2>
              <p style="font-family: monospace; font-size: 14px; background: white; padding: 10px; border-radius: 4px;">
                ${voucher.id}
              </p>
            </div>

            <p>To use your vouchers:</p>
            <ol>
              <li>Visit <a href="${voucherUrl}">your voucher page</a></li>
              <li>Your email will be pre-filled</li>
              <li>Show the QR code to the bartender</li>
            </ol>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              You can also share these vouchers with friends!
            </p>
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