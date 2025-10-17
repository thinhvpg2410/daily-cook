import { Injectable, Inject } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FirebaseAdmin } from "../auth/firebase-admin.provider";

@Injectable()
export class UsersService {
  constructor(@Inject(FirebaseAdmin) private readonly app: admin.app.App) {}

  async getByUid(uid: string) {
    const snap = await this.app.firestore().collection("users").doc(uid).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
}
