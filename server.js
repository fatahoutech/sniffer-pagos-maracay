const express = require('express');
const admin = require('firebase-admin');

// Leer la clave de Firebase desde la variable de entorno
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'checkpago-61d9a'
});

const db = admin.firestore();
const app = express();
app.use(express.json());

const SECRET_TOKEN = "MI_TOKEN_SECRETO_123";

app.post('/capture', async (req, res) => {
  const { referencia, monto, telefono_banco, token } = req.body;

  if (token !== SECRET_TOKEN) {
    return res.status(403).json({ error: 'Token inválido' });
  }
  if (!referencia || !monto || isNaN(monto) || monto <= 0 || !telefono_banco) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  if (monto > 200) {
    return res.status(400).json({ error: 'Monto excede el límite de 200 Bs' });
  }

  const existing = await db.collection('referencias_bancarias')
    .where('referencia_completa', '==', referencia)
    .where('telefono_banco', '==', telefono_banco)
    .get();
  if (!existing.empty) {
    return res.status(200).json({ status: 'duplicado' });
  }

  await db.collection('referencias_bancarias').add({
    referencia_completa: referencia,
    monto: parseFloat(monto),
    fecha_hora_transaccion: admin.firestore.Timestamp.now(),
    estado: 'pendiente',
    fecha_captura: admin.firestore.FieldValue.serverTimestamp(),
    telefono_banco: telefono_banco,
    token: SECRET_TOKEN
  });

  res.json({ status: 'ok' });
});

app.listen(process.env.PORT || 3000, () => console.log('Forwarder listening on port ' + (process.env.PORT || 3000)));
