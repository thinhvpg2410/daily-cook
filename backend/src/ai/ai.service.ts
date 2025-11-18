import { Injectable, BadRequestException } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaService } from "../prisma/prisma.service";
import { MealPlanService } from "../mealplan/mealplan.service";

@Injectable()
export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    private prisma: PrismaService,
    private mealPlanService: MealPlanService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        "⚠️ GEMINI_API_KEY not found. AI features will be disabled.",
      );
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      const defaultModel = "gemini-2.0-flash";
      this.model = this.genAI.getGenerativeModel({ model: defaultModel });

      // Log để debug
      console.log(`🤖 AI Service initialized with model: ${defaultModel}`);
    }
  }

  async listAvailableModels() {
    if (!this.genAI) {
      throw new BadRequestException("AI service is not configured.");
    }

    return {
      currentModel: this.model?.model || "unknown",
      message: "Using gemini-2.0-flash model",
    };
  }

  /**
   * Chat với AI về gợi ý món ăn
   */
  async chatWithUser(
    userId: string,
    message: string,
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [],
  ) {
    if (!this.model) {
      throw new BadRequestException(
        "AI service is not configured. Please set GEMINI_API_KEY.",
      );
    }

    try {
      // Lấy thông tin user preferences
      const preferences = await this.prisma.userPreference.findUnique({
        where: { userId },
      });

      // Lấy lịch sử meal plans gần đây
      const recentPlans = await this.prisma.mealPlan.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
        include: {
          // Note: Prisma không support include với JSON field, nên ta sẽ query riêng
        },
      });

      // Build context cho AI
      const userContext = {
        preferences: preferences
          ? {
              dietType: preferences.dietType || "normal",
              dailyKcalTarget: preferences.dailyKcalTarget || 2000,
              dislikedIngredients: preferences.dislikedIngredients || [],
              likedTags: preferences.likedTags || [],
              goal: preferences.goal || "maintain",
            }
          : null,
        recentMealPlans: recentPlans.length,
      };

      // Build system prompt
      const systemPrompt = `Bạn là trợ lý AI thông minh của DailyCook - ứng dụng quản lý bữa ăn và dinh dưỡng Việt Nam.

Nhiệm vụ của bạn:
1. Hiểu yêu cầu của người dùng về món ăn, thực đơn
2. Gợi ý món ăn phù hợp dựa trên preferences của họ
3. Trả lời tự nhiên, thân thiện bằng tiếng Việt
4. Khi gợi ý món ăn, hãy liệt kê TÊN CỤ THỂ các món ăn Việt Nam phù hợp

Thông tin người dùng:
- Chế độ ăn: ${userContext.preferences?.dietType || "bình thường"}
- Mục tiêu calo/ngày: ${userContext.preferences?.dailyKcalTarget || 2000} kcal
- Mục tiêu: ${userContext.preferences?.goal === "lose_weight" ? "Giảm cân" : userContext.preferences?.goal === "gain_muscle" ? "Tăng cơ" : "Duy trì"}
- Không thích: ${userContext.preferences?.dislikedIngredients?.join(", ") || "Không có"}
- Thích: ${userContext.preferences?.likedTags?.join(", ") || "Không có"}
- Đã có ${userContext.recentMealPlans} meal plans gần đây

QUAN TRỌNG:
- Trả lời ngắn gọn, mỗi dòng không quá 50 ký tự để dễ đọc trên mobile
- Khi gợi ý món ăn, hãy liệt kê TÊN CỤ THỂ các món (ví dụ: "Phở bò", "Bún chả", "Cơm tấm", "Bánh mì")
- Đề xuất 3-5 món ăn Việt Nam phù hợp với yêu cầu
- Sử dụng dấu gạch đầu dòng (-) hoặc số (1. 2. 3.) để liệt kê món ăn
- Giữ câu trả lời ngắn gọn, dễ đọc trên màn hình nhỏ`;

      // Build conversation history
      const history = conversationHistory.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      // Add system prompt as first message
      const chat = this.model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
          {
            role: "model",
            parts: [
              {
                text: "Xin chào! Tôi là trợ lý AI của DailyCook. Tôi có thể giúp bạn tìm món ăn phù hợp. Bạn muốn ăn gì hôm nay? 😊",
              },
            ],
          },
          ...history,
        ],
      });

      // Send user message
      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      return {
        message: text,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Error in AI chat:", error);
      throw new BadRequestException(
        `AI service error: ${error.message || "Unknown error"}. Please check your API key and ensure gemini-2.0-flash is available.`,
      );
    }
  }

  /**
   * Gợi ý món ăn dựa trên yêu cầu từ chat
   */
  async suggestRecipesFromChat(
    userId: string,
    userRequest: string,
    date?: string,
  ) {
    if (!this.model) {
      throw new BadRequestException("AI service is not configured.");
    }

    try {
      // Parse user request để extract thông tin
      const parsePrompt = `Bạn là một parser chuyên nghiệp. Phân tích yêu cầu của người dùng và trả về JSON với format:
{
  "region": "Northern" | "Central" | "Southern" | null,
  "dietType": "normal" | "vegan" | "vegetarian" | "low_carb" | null,
  "slot": "breakfast" | "lunch" | "dinner" | "all" | null,
  "maxCookTime": number | null,
  "includeStarter": boolean,
  "includeDessert": boolean,
  "excludeIngredients": string[]
}

Yêu cầu người dùng: "${userRequest}"

Chỉ trả về JSON, không có text khác.`;

      const parseResult = await this.model.generateContent(parsePrompt);
      const parseText = parseResult.response.text();

      // Extract JSON from response (có thể có markdown code blocks)
      let parsedData: any = {};
      try {
        const jsonMatch = parseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Error parsing AI response:", e);
        // Fallback to default
        parsedData = {};
      }

      // Gọi mealplan service để suggest
      const targetDate = date || new Date().toISOString().split("T")[0];
      const suggestions = await this.mealPlanService.suggestMenu(userId, {
        date: targetDate,
        slot: parsedData.slot || "all",
        region: parsedData.region,
        vegetarian:
          parsedData.dietType === "vegan" ||
          parsedData.dietType === "vegetarian",
        maxCookTime: parsedData.maxCookTime,
        includeStarter: parsedData.includeStarter || false,
        includeDessert: parsedData.includeDessert || false,
        excludeIngredientNames: parsedData.excludeIngredients?.join(",") || "",
        persist: false, // Chỉ suggest, không lưu
      });

      return suggestions;
    } catch (error: any) {
      console.error("Error in AI recipe suggestion:", error);
      throw new BadRequestException(
        `AI suggestion error: ${error.message || "Unknown error"}. Please check your API key and ensure gemini-2.0-flash is available.`,
      );
    }
  }

  /**
   * Tính toán năng lượng và macros phù hợp dựa trên thông tin cá nhân
   */
  async calculateCalorieGoal(
    userId: string,
    gender: "male" | "female",
    age: number,
    height: number,
    weight: number,
    activity: "low" | "medium" | "high",
    goal: "lose_weight" | "maintain" | "gain_muscle",
  ) {
    if (!this.model) {
      throw new BadRequestException("AI service is not configured.");
    }

    try {
      // Tính toán BMR (Basal Metabolic Rate) - Mifflin-St Jeor Equation
      let bmr: number;
      if (gender === "male") {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
      }

      // Tính toán TDEE (Total Daily Energy Expenditure)
      const multipliers: Record<string, number> = {
        low: 1.2,
        medium: 1.55,
        high: 1.725,
      };
      const tdee = Math.round(bmr * (multipliers[activity] || 1.2));

      // Tính toán mục tiêu calories dựa trên goal
      const adjustments: Record<string, number> = {
        lose_weight: -500,
        maintain: 0,
        gain_muscle: 300,
      };
      const baseTarget = Math.round(tdee + (adjustments[goal] || 0));
      const calorieTarget = Math.max(1200, baseTarget);

      // Build prompt cho AI để tính toán macros chính xác hơn
      const prompt = `Bạn là chuyên gia dinh dưỡng. Dựa trên thông tin sau, hãy tính toán và đưa ra mục tiêu năng lượng và macros (protein, fat, carbs) phù hợp.

Thông tin:
- Giới tính: ${gender === "male" ? "Nam" : "Nữ"}
- Tuổi: ${age}
- Chiều cao: ${height} cm
- Cân nặng: ${weight} kg
- Mức độ hoạt động: ${activity === "low" ? "Ít vận động" : activity === "medium" ? "Vận động vừa" : "Vận động nhiều"}
- Mục tiêu: ${goal === "lose_weight" ? "Giảm cân" : goal === "maintain" ? "Duy trì" : "Tăng cơ"}
- BMR (Basal Metabolic Rate): ${Math.round(bmr)} kcal
- TDEE (Total Daily Energy Expenditure): ${tdee} kcal
- Calorie target cơ bản: ${calorieTarget} kcal

Hãy trả về JSON với format:
{
  "dailyKcalTarget": number, // Mục tiêu calories/ngày (có thể điều chỉnh từ base target)
  "protein": number, // gram protein/ngày
  "fat": number, // gram fat/ngày
  "carbs": number, // gram carbs/ngày
  "explanation": string // Giải thích ngắn gọn (1-2 câu) bằng tiếng Việt
}

Lưu ý:
- dailyKcalTarget nên trong khoảng hợp lý (1200-4000 kcal)
- Protein: 0.8-2.2g/kg cân nặng tùy mục tiêu
- Fat: 20-35% tổng calories
- Carbs: phần còn lại
- Tổng: protein*4 + fat*9 + carbs*4 ≈ dailyKcalTarget

Chỉ trả về JSON, không có text khác.`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract JSON from response
      let aiResult: any;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in AI response");
        }
      } catch (e) {
        console.error("Error parsing AI response:", e);
        // Fallback to calculated values
        let proteinPercent = 0.3;
        let fatPercent = 0.25;
        let carbsPercent = 0.45;

        if (goal === "lose_weight") {
          proteinPercent = 0.35;
          carbsPercent = 0.40;
        } else if (goal === "gain_muscle") {
          proteinPercent = 0.35;
          fatPercent = 0.20;
        }

        const protein = Math.round((calorieTarget * proteinPercent) / 4);
        const fat = Math.round((calorieTarget * fatPercent) / 9);
        const carbs = Math.round((calorieTarget * carbsPercent) / 4);

        aiResult = {
          dailyKcalTarget: calorieTarget,
          protein,
          fat,
          carbs,
          explanation: "Đã tính toán dựa trên công thức chuẩn.",
        };
      }

      // Validate và đảm bảo giá trị hợp lý
      const finalTarget = Math.max(1200, Math.min(4000, Math.round(aiResult.dailyKcalTarget || calorieTarget)));
      const finalProtein = Math.max(50, Math.round(aiResult.protein || 150));
      const finalFat = Math.max(30, Math.round(aiResult.fat || 50));
      const finalCarbs = Math.max(100, Math.round(aiResult.carbs || 200));

      return {
        bmr: Math.round(bmr),
        tdee,
        dailyKcalTarget: finalTarget,
        protein: finalProtein,
        fat: finalFat,
        carbs: finalCarbs,
        explanation: aiResult.explanation || "Đã tính toán mục tiêu dinh dưỡng phù hợp với bạn.",
      };
    } catch (error: any) {
      console.error("Error in AI calorie calculation:", error);
      throw new BadRequestException(
        `AI calculation error: ${error.message || "Unknown error"}. Please check your API key and ensure gemini-2.0-flash is available.`,
      );
    }
  }
}
