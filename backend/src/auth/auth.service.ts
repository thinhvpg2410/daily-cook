import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as admin from 'firebase-admin';
import { FirebaseAdmin } from './firebase-admin.provider';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(FirebaseAdmin) private readonly app: admin.app.App,
  ) {}

  async syncUserToFirestore(decoded: admin.auth.DecodedIdToken) {
    const db = this.app.firestore();
    const usersRef = db.collection('users');
    const doc = usersRef.doc(decoded.uid);
    const snapshot = await doc.get();
    const base = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      phoneNumber: decoded.phone_number ?? null,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      provider: decoded.firebase?.sign_in_provider ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!snapshot.exists) {
      await doc.set(base);
    } else {
      await doc.update({
        ...base,
        createdAt: snapshot.get('createdAt') ?? base.createdAt,
      });
    }
    const fresh = await doc.get();
    return { id: fresh.id, ...fresh.data() };
  }

  issueAppJwt(payload: { sub: string; roles?: string[] }) {
    return this.jwt.sign(payload);
  }
}
