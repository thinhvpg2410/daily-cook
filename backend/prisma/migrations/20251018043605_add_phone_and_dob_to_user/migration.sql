/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '0000000000';

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
