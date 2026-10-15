export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, currency, description, user_id, type, reference_id, customer_email, customer_name } = req.body || {};

  if (!amount || !currency || !user_id) {
    return res.status(400).json({ error: 'amount, currency, user_id requis' });
  }

  const secretKey = process.env.LEEKPAY_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Config error' });

  try {
    const r = await fetch('https://leekpay.fr/api/v1/checkout', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Number(amount),
        currency,
        description: description || 'Paiement Kobo',
        return_url: 'https://kobo-miniapp.vercel.app/success',
        cancel_url: 'https://kobo-miniapp.vercel.app/cancel',
        webhook_url: process.env.LEEKPAY_WEBHOOK_URL,
        customer_email,
        customer_name,
        metadata: { type, user_id, reference_id },
      }),
    });

    const data = await r.json();
    if (!data.success) return res.status(400).json({ error: data.message || 'Erreur LeekPay' });

    return res.status(200).json({ ok: true, checkout: data.data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
