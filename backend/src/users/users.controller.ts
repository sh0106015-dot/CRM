import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser('userId') userId: string) {
    return this.users.getMe(userId);
  }

  @Get('preferences')
  getPreferences(@CurrentUser('userId') userId: string) {
    return this.users.getPreferences(userId);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.users.updatePreferences(userId, dto);
  }

  @Patch('password')
  changePassword(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(userId, dto);
  }

  /** 공개 상담 신청 링크 토큰 (없으면 발급) */
  @Get('apply-link')
  applyLink(@CurrentUser('userId') userId: string) {
    return this.users.getApplyToken(userId);
  }

  @Post('apply-link/rotate')
  rotateApplyLink(@CurrentUser('userId') userId: string) {
    return this.users.rotateApplyToken(userId);
  }

  /** 회원탈퇴 (PRD 21) - 관련 데이터 전체 cascade 삭제 */
  @Delete()
  deleteAccount(@CurrentUser('userId') userId: string) {
    return this.users.deleteAccount(userId);
  }
}
