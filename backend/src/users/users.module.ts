import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAdminProvider } from '../auth/firebase-admin.provider';

@Module({
  providers: [UsersService, FirebaseAdminProvider],
  exports: [UsersService],
})
export class UsersModule {}
