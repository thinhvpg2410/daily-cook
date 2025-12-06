import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AIService } from "./ai.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/user.decorator";
import { ChatMessageDto, SuggestFromChatDto } from "./dto/chat.dto";
import { CalculateCalorieGoalDto } from "./dto/calculate-calorie-goal.dto";
import { GenerateNutritionTipsDto } from "./dto/generate-nutrition-tips.dto";

@ApiTags("AI")
@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post("chat")
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Chat với AI về gợi ý món ăn" })
  @ApiResponse({ status: 200, description: "Phản hồi từ AI" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({ status: 400, description: "Lỗi AI service" })
  async chat(@CurrentUser() user: any, @Body() dto: ChatMessageDto) {
    return this.aiService.chatWithUser(user.userId, dto.message, dto.history);
  }

  @Post("suggest-from-chat")
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Gợi ý món ăn từ yêu cầu chat" })
  @ApiResponse({ status: 200, description: "Danh sách món ăn được gợi ý" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({ status: 400, description: "Lỗi AI service" })
  async suggestFromChat(
    @CurrentUser() user: any,
    @Body() dto: SuggestFromChatDto,
  ) {
    return this.aiService.suggestRecipesFromChat(
      user.userId,
      dto.request,
      dto.date,
    );
  }

  @Post("list-models")
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "List available models (for debugging)" })
  @ApiResponse({ status: 200, description: "List of available models" })
  async listModels() {
    return this.aiService.listAvailableModels();
  }

  @Post("calculate-calorie-goal")
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Tính toán năng lượng phù hợp dựa trên thông tin cá nhân" })
  @ApiResponse({ status: 200, description: "Năng lượng và macros được gợi ý" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({ status: 400, description: "Lỗi AI service hoặc dữ liệu không hợp lệ" })
  async calculateCalorieGoal(@CurrentUser() user: any, @Body() dto: CalculateCalorieGoalDto) {
    return this.aiService.calculateCalorieGoal(
      user.userId,
      dto.gender,
      dto.age,
      dto.height,
      dto.weight,
      dto.activity,
      dto.goal,
    );
  }

  @Post("generate-nutrition-tips")
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Gen nutrition tips bằng AI dựa trên dữ liệu dinh dưỡng" })
  @ApiResponse({ status: 200, description: "Danh sách tips dinh dưỡng được gen" })
  @ApiResponse({ status: 401, description: "Chưa đăng nhập" })
  @ApiResponse({ status: 400, description: "Lỗi AI service hoặc dữ liệu không hợp lệ" })
  async generateNutritionTips(@CurrentUser() user: any, @Body() dto: GenerateNutritionTipsDto) {
    return this.aiService.generateNutritionTips(user.userId, dto);
  }
}

