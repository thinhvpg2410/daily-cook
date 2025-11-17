import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChatMessageDto {
  @ApiProperty({ description: "Nội dung tin nhắn", example: "Tôi muốn ăn món chay hôm nay" })
  @IsString()
  message!: string;

  @ApiProperty({
    description: "Lịch sử conversation (optional)",
    type: [Object],
    required: false,
  })
  @IsOptional()
  @IsArray()
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class SuggestFromChatDto {
  @ApiProperty({ description: "Yêu cầu của người dùng", example: "Gợi ý món ăn miền Bắc cho bữa trưa" })
  @IsString()
  request!: string;

  @ApiProperty({ description: "Ngày muốn suggest (ISO format)", required: false })
  @IsOptional()
  @IsString()
  date?: string;
}

