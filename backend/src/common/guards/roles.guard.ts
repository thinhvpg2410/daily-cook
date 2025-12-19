import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    try {
      const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (!required || required.length === 0) return true;
      
      const req = ctx.switchToHttp().getRequest();
      const user = req.user;
      
      if (!user) {
        this.logger.warn("User not found in request");
        throw new ForbiddenException("User not authenticated");
      }
      
      if (!user.role) {
        this.logger.warn(`User ${user.userId || user.email} has no role`);
        throw new ForbiddenException("User role not found");
      }
      
      if (!required.includes(user.role)) {
        this.logger.warn(`User ${user.userId || user.email} with role ${user.role} does not have required role: ${required.join(", ")}`);
        throw new ForbiddenException(`Access denied. Required role: ${required.join(" or ")}`);
      }
      
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error("Error in RolesGuard:", error);
      throw new ForbiddenException("Access denied");
    }
  }
}
