import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { FirebaseAdminProvider } from "../auth/firebase-admin.provider";

@Module({
  controllers: [UsersController],
  providers: [UsersService, FirebaseAdminProvider],
  exports: [UsersService],
})
export class UsersModule {}
