import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import { MealPlanService } from "../mealplan/mealplan.service";

@Injectable()
export class AIService {
  private openai: OpenAI;
  private modelName: string;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MealPlanService))
    private mealPlanService: MealPlanService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn(
        "⚠️ OPENAI_API_KEY not found. AI features will be disabled.",
      );
    } else {
      this.openai = new OpenAI({ apiKey });
      // Using gpt-4o as the default (latest OpenAI model)
      // Note: GPT 5.1 doesn't exist yet. If you need a specific model, set OPENAI_MODEL env variable
      this.modelName = process.env.OPENAI_MODEL || "gpt-4o";

      // Log để debug
      console.log(`🤖 AI Service initialized with model: ${this.modelName}`);
    }
  }

  isEnabled() {
    return Boolean(this.openai);
  }

  private extractJson(text: string) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err) {
        console.error("Failed to parse AI JSON:", err);
      }
    }
    return null;
  }

  async fetchIngredientMarketPrices(
    ingredients: Array<{ name: string; unit?: string }>,
    retryCount = 2,
  ) {
    if (!this.openai) {
      throw new BadRequestException(
        "AI service is not configured. Please set OPENAI_API_KEY.",
      );
    }
    if (!ingredients.length) return {};

    const listText = ingredients
      .map(
        (ing, idx) =>
          `${idx + 1}. ${ing.name}${ing.unit ? ` (${ing.unit})` : ""}`,
      )
      .join("\n");

    const prompt = `Bạn là chuyên gia thị trường thực phẩm tại Việt Nam. Dựa trên dữ liệu giá trung bình bán lẻ tại các chợ và siêu thị phổ biến (Co.opmart, Winmart, Bách Hóa Xanh) trong ngày hôm nay (${new Date().toLocaleDateString("vi-VN")}), hãy ước lượng giá hiện tại cho từng nguyên liệu dưới đây.

YÊU CẦU:
- Giá tính theo đơn vị mặc định được cung cấp (ưu tiên gram/ml nếu không có thì dùng đơn vị bán phổ biến)
- Trả về JSON object với key "prices" là một array, không có Markdown hay giải thích ngoài JSON.
- Mỗi phần tử trong array phải có cấu trúc:
{
  "name": string,              // tên nguyên liệu
  "unit": string,              // đơn vị tham chiếu (ví dụ: "gram", "ml", "kg", "bó")
  "pricePerUnit": number,      // giá cho 1 đơn vị (đơn vị chuẩn trong dữ liệu)
  "currency": "VND",
  "source": string             // nguồn tham chiếu ngắn gọn, ví dụ "Bách Hóa Xanh 2025-11-18"
}

DANH SÁCH NGUYÊN LIỆU:
${listText}

Trả về JSON object với format: {"prices": [...]}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await this.openai.chat.completions.create({
          model: this.modelName,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });
        const responseText = result.choices[0]?.message?.content || "";
        const parsed = this.extractJson(responseText);

        // Parse response - có thể là object với key "prices" hoặc array trực tiếp
        let pricesArray: any[] = [];
        if (Array.isArray(parsed)) {
          pricesArray = parsed;
        } else if (parsed && typeof parsed === "object" && "prices" in parsed) {
          pricesArray = Array.isArray(parsed.prices) ? parsed.prices : [];
        } else {
          throw new BadRequestException("AI trả về dữ liệu giá không hợp lệ.");
        }

        if (!Array.isArray(pricesArray) || pricesArray.length === 0) {
          throw new BadRequestException("AI trả về dữ liệu giá không hợp lệ.");
        }

        const map: Record<
          string,
          {
            pricePerUnit: number;
            currency?: string;
            source?: string;
            unit?: string;
          }
        > = {};
        for (const entry of pricesArray) {
          if (!entry?.name || typeof entry.pricePerUnit !== "number") continue;
          const key = (entry.name as string).trim().toLowerCase();
          map[key] = {
            pricePerUnit: entry.pricePerUnit,
            currency: entry.currency || "VND",
            source: entry.source,
            unit: entry.unit,
          };
        }

        // Nếu có ít nhất một giá hợp lệ, trả về map
        if (Object.keys(map).length > 0) {
          return map;
        }

        // Nếu không có giá hợp lệ nào, throw để retry
        throw new BadRequestException("AI trả về dữ liệu giá không hợp lệ.");
      } catch (error: any) {
        lastError = error;
        if (attempt < retryCount) {
          // Đợi một chút trước khi retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          console.warn(
            `⚠️ Lỗi khi lấy giá nguyên liệu (lần thử ${attempt + 1}/${retryCount + 1}), đang thử lại...`,
          );
          continue;
        }
        // Nếu đã hết số lần retry, throw error
        throw error;
      }
    }

    // Fallback (không bao giờ đến đây, nhưng TypeScript cần)
    throw (
      lastError || new BadRequestException("Không thể lấy giá nguyên liệu.")
    );
  }

  async listAvailableModels() {
    if (!this.openai) {
      throw new BadRequestException("AI service is not configured.");
    }

    return {
      currentModel: this.modelName || "unknown",
      message: `Using OpenAI ${this.modelName} model`,
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
    if (!this.openai) {
      throw new BadRequestException(
        "AI service is not configured. Please set OPENAI_API_KEY.",
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
        include: {},
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
      const systemPrompt = `Bạn là trợ lý AI thông minh và chuyên nghiệp của DailyCook - ứng dụng quản lý bữa ăn và dinh dưỡng Việt Nam. Bạn hoạt động như một chuyên gia dinh dưỡng và đầu bếp thực thụ.

NHIỆM VỤ CỦA BẠN:
1. Hiểu yêu cầu của người dùng về món ăn, thực đơn một cách chính xác
2. Khi người dùng yêu cầu gợi ý món ăn, hãy hỏi thông tin đầy đủ để đưa ra gợi ý phù hợp:
   - Số lượng món muốn (ví dụ: 3 món, 5 món, một vài món)
   - Buổi ăn (sáng/trưa/tối/cả ngày)
   - Chế độ ăn (ăn chay/bình thường/eat-clean/diet)
   - Bất kỳ yêu cầu đặc biệt nào
3. Nếu thiếu thông tin quan trọng, hãy hỏi một cách thân thiện và cụ thể
4. Trả lời tự nhiên, thân thiện, chuyên nghiệp bằng tiếng Việt
5. Khi gợi ý món ăn, hãy liệt kê TÊN CỤ THỂ các món ăn Việt Nam phù hợp

THÔNG TIN NGƯỜI DÙNG:
- Chế độ ăn mặc định: ${userContext.preferences?.dietType || "bình thường"}
- Mục tiêu calo/ngày: ${userContext.preferences?.dailyKcalTarget || 2000} kcal
- Mục tiêu: ${userContext.preferences?.goal === "lose_weight" ? "Giảm cân" : userContext.preferences?.goal === "gain_muscle" ? "Tăng cơ" : "Duy trì"}
- Không thích: ${userContext.preferences?.dislikedIngredients?.join(", ") || "Không có"}
- Thích: ${userContext.preferences?.likedTags?.join(", ") || "Không có"}
- Đã có ${userContext.recentMealPlans} meal plans gần đây

VÍ DỤ CÂU HỎI KHI THIẾU THÔNG TIN:
- "Bạn muốn gợi ý món cho buổi nào (sáng/trưa/tối)?"
- "Bạn muốn bao nhiêu món? (ví dụ: 3 món, 5 món)"
- "Bạn đang ăn chay hay bình thường?"
- "Bạn muốn món eat-clean, diet hay bình thường?"

QUAN TRỌNG:
- Trả lời ngắn gọn, mỗi dòng không quá 50 ký tự để dễ đọc trên mobile
- Khi gợi ý món ăn, hãy liệt kê TÊN CỤ THỂ các món (ví dụ: "Phở bò", "Bún chả", "Cơm tấm", "Bánh mì")
- Đề xuất 3-5 món ăn Việt Nam phù hợp với yêu cầu
- Sử dụng dấu gạch đầu dòng (-) hoặc số (1. 2. 3.) để liệt kê món ăn
- Giữ câu trả lời ngắn gọn, dễ đọc trên màn hình nhỏ
- Luôn ưu tiên sức khỏe và dinh dưỡng của người dùng`;

      // Build conversation history for OpenAI format
      const messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [{ role: "system", content: systemPrompt }];

      // Add initial greeting if no history
      if (conversationHistory.length === 0) {
        messages.push({
          role: "assistant",
          content:
            "Xin chào! Tôi là trợ lý AI của DailyCook. Tôi có thể giúp bạn tìm món ăn phù hợp. Bạn muốn ăn gì hôm nay? 😊",
        });
      }

      // Add conversation history
      conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      });

      // Add current user message
      messages.push({ role: "user", content: message });

      // Call OpenAI API
      const result = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: messages,
      });

      const text = result.choices[0]?.message?.content || "";

      return {
        message: text,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Error in AI chat:", error);
      throw new BadRequestException(
        `AI service error: ${error.message || "Unknown error"}. Please check your API key and ensure ${this.modelName} is available.`,
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
    if (!this.openai) {
      throw new BadRequestException("AI service is not configured.");
    }

    try {
      // Lấy user preferences để làm context
      const userPrefs = await this.prisma.userPreference.findUnique({
        where: { userId },
      });

      // Build context cho AI parser
      const userContext = {
        dietType: userPrefs?.dietType || "normal",
        goal: userPrefs?.goal || "maintain",
        dislikedIngredients: userPrefs?.dislikedIngredients || [],
        likedTags: userPrefs?.likedTags || [],
        dailyKcalTarget: userPrefs?.dailyKcalTarget || 2000,
      };

      // Parse user request để extract thông tin với context đầy đủ
      const parsePrompt = `Bạn là một parser thông minh và chuyên nghiệp. Phân tích yêu cầu của người dùng và trả về JSON với format chính xác:

{
  "recipeCount": number | null,  // Số lượng món ăn (nếu không có: null, default sẽ là 3-5 món)
  "slot": "breakfast" | "lunch" | "dinner" | "all" | null,  // Buổi ăn: sáng/trưa/tối/tất cả
  "dietMode": "normal" | "vegan" | "vegetarian" | "low_carb" | "eat_clean" | "diet" | null,  // Chế độ ăn
  "region": "Northern" | "Central" | "Southern" | null,  // Vùng miền
  "maxCookTime": number | null,  // Thời gian nấu tối đa (phút)
  "includeStarter": boolean,  // Có món khai vị không
  "includeDessert": boolean,  // Có món tráng miệng không
  "excludeIngredients": string[],  // Nguyên liệu cần tránh
  "needsClarification": boolean,  // Có cần hỏi thêm không
  "clarificationQuestion": string | null  // Câu hỏi cần làm rõ (nếu có)
}

THÔNG TIN NGƯỜI DÙNG HIỆN TẠI:
- Chế độ ăn mặc định: ${userContext.dietType}
- Mục tiêu: ${userContext.goal === "lose_weight" ? "Giảm cân" : userContext.goal === "gain_muscle" ? "Tăng cơ" : "Duy trì"}
- Không thích: ${userContext.dislikedIngredients.join(", ") || "Không có"}
- Thích: ${userContext.likedTags.join(", ") || "Không có"}

QUY TẮC PHÂN TÍCH:
1. **Số lượng món (recipeCount)**:
   - Tìm số lượng cụ thể: "3 món", "5 món", "một vài món" (2-3), "nhiều món" (5-7)
   - Nếu không có: null (sẽ dùng default 3-5 món)

2. **Buổi ăn (slot)**:
   - "sáng", "breakfast", "bữa sáng" → "breakfast"
   - "trưa", "lunch", "bữa trưa" → "lunch"
   - "tối", "dinner", "bữa tối", "chiều" → "dinner"
   - "cả ngày", "tất cả", "all" → "all"
   - Nếu không rõ: null (sẽ dùng default "all")

3. **Chế độ ăn (dietMode)**:
   - "chay", "vegan", "thuần chay" → "vegan"
   - "ăn chay" (có thể có trứng/sữa) → "vegetarian"
   - "ít carb", "low carb", "low-carb" → "low_carb"
   - "eat clean", "ăn sạch", "healthy", "lành mạnh" → "eat_clean"
   - "diet", "ăn kiêng", "giảm cân", "ít calo" → "diet"
   - "bình thường", "thường" → "normal"
   - Nếu không có, dùng giá trị từ user context: "${userContext.dietType}"

4. **Vùng miền (region)**:
   - "miền Bắc", "Bắc", "Hà Nội" → "Northern"
   - "miền Trung", "Trung", "Huế", "Đà Nẵng" → "Central"
   - "miền Nam", "Nam", "Sài Gòn", "TP.HCM" → "Southern"
   - Nếu không có: null

5. **Thời gian nấu (maxCookTime)**:
   - Tìm số kèm "phút", "min", "giờ"
   - Nếu không có: null

6. **Cần làm rõ (needsClarification)**:
   - true nếu thiếu thông tin quan trọng (ví dụ: không biết buổi nào, không biết số lượng)
   - false nếu đủ thông tin hoặc có thể dùng defaults

YÊU CẦU NGƯỜI DÙNG: "${userRequest}"

CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT HAY MARKDOWN KHÁC.`;

      const parseResult = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: parsePrompt }],
        response_format: { type: "json_object" },
      });
      const parseText = parseResult.choices[0]?.message?.content || "";

      // Extract JSON from response (có thể có markdown code blocks)
      let parsedData: any = {};
      try {
        const jsonMatch = parseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Error parsing AI response:", e);
        console.error("Raw AI response:", parseText);
        // Fallback to default
        parsedData = {
          needsClarification: true,
          clarificationQuestion:
            "Tôi cần thêm thông tin để gợi ý phù hợp. Bạn muốn món cho buổi nào và số lượng bao nhiêu món?",
        };
      }

      // Nếu cần làm rõ, trả về response để hỏi user
      if (parsedData.needsClarification && parsedData.clarificationQuestion) {
        return {
          date: date || new Date().toISOString().split("T")[0],
          slot: parsedData.slot || "all",
          dishes: [],
          totalKcal: 0,
          dailyKcalTarget: userContext.dailyKcalTarget,
          withinLimit: true,
          needsClarification: true,
          clarificationQuestion: parsedData.clarificationQuestion,
        };
      }

      // Xác định vegetarian từ dietMode
      const vegetarian =
        parsedData.dietMode === "vegan" || parsedData.dietMode === "vegetarian";

      // Xác định chế độ ăn: eat_clean và diet cần filter calories
      const isDietMode = parsedData.dietMode === "diet";
      const isEatClean = parsedData.dietMode === "eat_clean";

      // Gọi mealplan service để suggest
      const targetDate = date || new Date().toISOString().split("T")[0];
      const suggestions = await this.mealPlanService.suggestMenu(
        userId,
        {
          date: targetDate,
          slot: parsedData.slot || "all",
          region:
            parsedData.region ||
            (userContext.likedTags.find((t: string) =>
              ["Northern", "Central", "Southern"].includes(t),
            ) as "Northern" | "Central" | "Southern" | undefined),
          vegetarian,
          maxCookTime: parsedData.maxCookTime,
          includeStarter: parsedData.includeStarter || false,
          includeDessert: parsedData.includeDessert || false,
          excludeIngredientNames:
            parsedData.excludeIngredients?.join(",") || "",
          persist: false, // Chỉ suggest, không lưu
        },
        parsedData.recipeCount, // Pass recipe count
        isDietMode, // Pass diet mode flag
        isEatClean, // Pass eat-clean mode flag
      );

      return suggestions;
    } catch (error: any) {
      console.error("Error in AI recipe suggestion:", error);
      throw new BadRequestException(
        `AI suggestion error: ${error.message || "Unknown error"}. Please check your API key and ensure ${this.modelName} is available.`,
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
    if (!this.openai) {
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

      const result = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const responseText = result.choices[0]?.message?.content || "";

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
          carbsPercent = 0.4;
        } else if (goal === "gain_muscle") {
          proteinPercent = 0.35;
          fatPercent = 0.2;
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
      const finalTarget = Math.max(
        1200,
        Math.min(4000, Math.round(aiResult.dailyKcalTarget || calorieTarget)),
      );
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
        explanation:
          aiResult.explanation ||
          "Đã tính toán mục tiêu dinh dưỡng phù hợp với bạn.",
      };
    } catch (error: any) {
      console.error("Error in AI calorie calculation:", error);
      throw new BadRequestException(
        `AI calculation error: ${error.message || "Unknown error"}. Please check your API key and ensure ${this.modelName} is available.`,
      );
    }
  }

  /**
   * Gen nutrition tips dựa trên dữ liệu dinh dưỡng của user
   */
  async generateNutritionTips(
    userId: string,
    nutritionData: {
      daily: Array<{
        date: string;
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
        source?: string;
      }>;
      average: {
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
      };
      calorieTarget: number;
      weekStart?: string;
      weekEnd?: string;
    },
  ) {
    if (!this.openai) {
      throw new BadRequestException("AI service is not configured.");
    }

    try {
      // Lấy user preferences
      const preferences = await this.prisma.userPreference.findUnique({
        where: { userId },
      });

      // Tính toán các metrics quan trọng
      const avgCalories = nutritionData.average.calories;
      const avgProtein = nutritionData.average.protein;
      const avgFat = nutritionData.average.fat;
      const avgCarbs = nutritionData.average.carbs;
      const calorieTarget = nutritionData.calorieTarget;

      // Tính toán độ dao động
      const calories = nutritionData.daily.map((d) => d.calories);
      const caloriesVariation = Math.max(...calories) - Math.min(...calories);
      const caloriesConsistency = caloriesVariation / calorieTarget;

      // Tính toán tỷ lệ macros
      const proteinPercent = (avgProtein * 4) / avgCalories;
      const fatPercent = (avgFat * 9) / avgCalories;
      const carbsPercent = (avgCarbs * 4) / avgCalories;

      // Build prompt cho AI
      const prompt = `Bạn là chuyên gia dinh dưỡng và huấn luyện viên sức khỏe chuyên nghiệp tại Việt Nam. Dựa trên dữ liệu dinh dưỡng của người dùng trong ${nutritionData.weekStart ? `tuần từ ${nutritionData.weekStart} đến ${nutritionData.weekEnd}` : "7 ngày qua"}, hãy phân tích và đưa ra 5-7 tips dinh dưỡng cá nhân hóa, thực tế và hữu ích.

DỮ LIỆU DINH DƯỠNG:
- Calo trung bình/ngày: ${avgCalories} kcal (Mục tiêu: ${calorieTarget} kcal)
- Protein trung bình: ${Math.round(avgProtein)}g (${Math.round(proteinPercent * 100)}% tổng calo)
- Fat trung bình: ${Math.round(avgFat)}g (${Math.round(fatPercent * 100)}% tổng calo)
- Carbs trung bình: ${Math.round(avgCarbs)}g (${Math.round(carbsPercent * 100)}% tổng calo)
- Độ dao động calo: ${Math.round(caloriesVariation)} kcal (${Math.round(caloriesConsistency * 100)}% so với mục tiêu)

THÔNG TIN NGƯỜI DÙNG:
- Mục tiêu: ${preferences?.goal === "lose_weight" ? "Giảm cân" : preferences?.goal === "gain_muscle" ? "Tăng cơ" : "Duy trì"}
- Chế độ ăn: ${preferences?.dietType || "bình thường"}
- Mục tiêu calo/ngày: ${calorieTarget} kcal

CHI TIẾT TỪNG NGÀY:
${nutritionData.daily
  .map(
    (d) =>
      `- ${d.date}: ${Math.round(d.calories)} kcal (P: ${Math.round(d.protein)}g, C: ${Math.round(d.carbs)}g, F: ${Math.round(d.fat)}g)`,
  )
  .join("\n")}

YÊU CẦU:
1. Phân tích điểm mạnh và điểm cần cải thiện trong chế độ ăn
2. Đưa ra 5-7 tips cụ thể, thực tế, dễ áp dụng
3. Tips phải phù hợp với mục tiêu và chế độ ăn của người dùng
4. Ưu tiên tips về:
   - Cân bằng macros (protein/carbs/fat)
   - Điều chỉnh calo nếu cần
   - Cải thiện tính nhất quán trong ăn uống
   - Thực phẩm cụ thể phù hợp với người Việt
   - Thời gian ăn uống và thói quen tốt
5. Mỗi tip ngắn gọn (1-2 câu), dễ hiểu, có emoji phù hợp
6. Tips phải tích cực, khuyến khích, không chỉ trích

TRẢ VỀ JSON với format:
{
  "tips": string[],  // Mảng các tips (5-7 tips)
  "summary": string,  // Tóm tắt ngắn gọn về tình trạng dinh dưỡng (1-2 câu)
  "week": string      // Tuần được phân tích (ví dụ: "Tuần từ 15/01 đến 21/01")
}

CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT HAY MARKDOWN KHÁC.`;

      const result = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const responseText = result.choices[0]?.message?.content || "";

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
        console.error("Error parsing AI tips response:", e);
        console.error("Raw AI response:", responseText);
        // Fallback to default tips
        aiResult = {
          tips: [
            "💡 Hãy duy trì chế độ ăn đều đặn và cân bằng dinh dưỡng",
            "🥗 Bổ sung nhiều rau xanh và trái cây để tăng cường vitamin",
            "💪 Đảm bảo đủ protein để duy trì cơ bắp và sức khỏe",
            "⏰ Ăn đúng bữa và không bỏ bữa sáng",
            "💧 Uống đủ nước (2-2.5L/ngày) để hỗ trợ trao đổi chất",
          ],
          summary: "Chế độ ăn của bạn đang ổn định. Tiếp tục duy trì nhé!",
          week: nutritionData.weekStart
            ? `Tuần từ ${nutritionData.weekStart} đến ${nutritionData.weekEnd}`
            : "7 ngày qua",
        };
      }

      // Validate và đảm bảo có đủ tips
      if (!Array.isArray(aiResult.tips) || aiResult.tips.length === 0) {
        aiResult.tips = [
          "💡 Hãy duy trì chế độ ăn đều đặn và cân bằng dinh dưỡng",
          "🥗 Bổ sung nhiều rau xanh và trái cây để tăng cường vitamin",
        ];
      }

      return {
        tips: aiResult.tips.slice(0, 7), // Giới hạn tối đa 7 tips
        summary: aiResult.summary || "Phân tích dinh dưỡng của bạn",
        week:
          aiResult.week ||
          (nutritionData.weekStart
            ? `Tuần từ ${nutritionData.weekStart} đến ${nutritionData.weekEnd}`
            : "7 ngày qua"),
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Error generating nutrition tips:", error);
      throw new BadRequestException(
        `AI tips generation error: ${error.message || "Unknown error"}. Please check your API key and ensure ${this.modelName} is available.`,
      );
    }
  }
}
