import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdmin } from './firebase-admin.provider';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(@Inject(FirebaseAdmin) private readonly app: admin.app.App) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token)
      throw new UnauthorizedException('Missing Authorization Bearer token');

    try {
      const decoded = await this.app.auth().verifyIdToken(token, true);
      req.firebaseUser = decoded; // attach for controller/service
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
  }
}
