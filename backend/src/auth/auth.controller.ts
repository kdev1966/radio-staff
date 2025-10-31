import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Auth Controller - Handles authentication for both Employee and SuperAdmin
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Employee login
   * POST /auth/login
   */
  @Public()
  @Post('login')
  async loginEmployee(@Body() loginDto: LoginDto) {
    return this.authService.loginEmployee(loginDto);
  }

  /**
   * SuperAdmin login
   * POST /auth/super-admin/login
   */
  @Public()
  @Post('super-admin/login')
  async loginSuperAdmin(@Body() loginDto: LoginDto) {
    return this.authService.loginSuperAdmin(loginDto);
  }

  /**
   * Employee registration (deprecated - should be done by ADMIN)
   * POST /auth/register
   */
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Get current user profile
   * Works for both Employee and SuperAdmin
   * GET /auth/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    const isSuperAdmin = req.user?.isSuperAdmin || false;
    return this.authService.getProfile(req.user.id, isSuperAdmin);
  }
}
