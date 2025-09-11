import * as admin from 'firebase-admin';
import { Provider } from '@nestjs/common';

function initAdmin() {
  if (admin.apps.length) return admin.app();

  const saBase64 = process.env.FIREBASE_SA_BASE64;
  if (saBase64) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = JSON.parse(Buffer.from(saBase64, 'base64').toString('utf-8'));
    return admin.initializeApp({
      credential: admin.credential.cert(json),
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export const FirebaseAdmin = 'FIREBASE_ADMIN';

export const FirebaseAdminProvider: Provider = {
  provide: FirebaseAdmin,
  useFactory: () => initAdmin(),
};
