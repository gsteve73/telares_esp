// api/data.js — Vercel serverless function
// Las credenciales de Supabase viven SOLO aquí, nunca en el frontend

export default async function handler(req, res) {
  // CORS — permite que el frontend haga fetch a esta función
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const MACHINE_ID   =  process.env.MACHINE_ID ;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Variables de entorno no configuradas en Vercel' });
  }

  const { type, minutes } = req.query;
  const mins = parseInt(minutes) || 5;

  let url;

  if (type === 'latest') {
    url = `${SUPABASE_URL}/rest/v1/rpm_readings`
        + `?machine_id=eq.${encodeURIComponent(MACHINE_ID)}`
        + `&order=created_at.desc&limit=1`;

  } else if (type === 'history') {
    const since = new Date(Date.now() - mins * 60 * 1000).toISOString();
    url = `${SUPABASE_URL}/rest/v1/rpm_readings`
        + `?machine_id=eq.${encodeURIComponent(MACHINE_ID)}`
        + `&created_at=gte.${encodeURIComponent(since)}`
        + `&order=created_at.asc&limit=500`;

  } else if (type === 'recent') {
    url = `${SUPABASE_URL}/rest/v1/rpm_readings`
        + `?machine_id=eq.${encodeURIComponent(MACHINE_ID)}`
        + `&order=created_at.desc&limit=20`;

  } else {
    return res.status(400).json({ error: 'type inválido. Usa: latest | history | recent' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Supabase error: ${text}` });
    }

    const data = await response.json();

    // Incluye el machine_id para que el frontend pueda mostrarlo
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ data, machine_id: MACHINE_ID });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
