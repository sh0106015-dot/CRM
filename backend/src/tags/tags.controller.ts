import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BulkTagDto, RenameTagDto } from './dto/tag.dto';
import { TagsService } from './tags.service';

@UseGuards(JwtAuthGuard)
@ApiTags('태그')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.tags.list(userId);
  }

  @Patch(':tag')
  rename(
    @CurrentUser('userId') userId: string,
    @Param('tag') tag: string,
    @Body() dto: RenameTagDto,
  ) {
    return this.tags.rename(userId, decodeURIComponent(tag), dto.newTag);
  }

  @Delete(':tag')
  remove(@CurrentUser('userId') userId: string, @Param('tag') tag: string) {
    return this.tags.remove(userId, decodeURIComponent(tag));
  }

  @Post(':tag/apply')
  apply(
    @CurrentUser('userId') userId: string,
    @Param('tag') tag: string,
    @Body() dto: BulkTagDto,
  ) {
    return this.tags.applyToCustomers(userId, decodeURIComponent(tag), dto.customerIds);
  }

  @Post(':tag/remove')
  removeFrom(
    @CurrentUser('userId') userId: string,
    @Param('tag') tag: string,
    @Body() dto: BulkTagDto,
  ) {
    return this.tags.removeFromCustomers(userId, decodeURIComponent(tag), dto.customerIds);
  }
}
