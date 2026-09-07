import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { AppleOAuthDto, GoogleOAuthDto } from './dto/oauth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OAuthService } from './oauth.service';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oauth: OAuthService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('oauth/google')
  google(@Body() dto: GoogleOAuthDto) {
    return this.oauth.google(dto.idToken);
  }

  @Post('oauth/apple')
  apple(@Body() dto: AppleOAuthDto) {
    return this.oauth.apple(dto.identityToken, dto.fullName);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
