import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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

  /** 회원탈퇴 (PRD 21) - 관련 데이터 전체 cascade 삭제 */
  @Delete()
  deleteAccount(@CurrentUser('userId') userId: string) {
    return this.users.deleteAccount(userId);
  }
}
