import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AllowTenantStatus, AuthUser, CurrentUser, JwtAuthGuard } from '@ewatu/common-auth';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { LoginDto } from './dtos/login.dto';
import { LogoutDto } from './dtos/logout.dto';
import { RefreshDto } from './dtos/refresh.dto';
import { RegisterDto } from './dtos/register.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ResendVerificationDto } from './dtos/resend-verification.dto';
import { VerifyEmailDto } from './dtos/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @SkipThrottle()
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @SkipThrottle()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @SkipThrottle()
  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @AllowTenantStatus('SUSPENDED', 'EXPIRED', 'PENDING_ACTIVATION', 'REJECTED')
  @Post('logout')
  logout(@Body() body: LogoutDto) {
    return this.auth.logout(body.refreshToken);
  }

  @SkipThrottle()
  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.auth.verifyEmail(body.token);
  }

  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post('resend-verification')
  resendVerification(@Body() body: ResendVerificationDto) {
    return this.auth.resendVerificationEmail(body.email);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body.email);
  }

  @SkipThrottle()
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body.token, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @AllowTenantStatus('SUSPENDED', 'EXPIRED', 'PENDING_ACTIVATION', 'REJECTED')
  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, body.currentPassword, body.newPassword);
  }
}
