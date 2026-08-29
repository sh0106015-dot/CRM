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
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';

@UseGuards(JwtAuthGuard)
@Controller('customers/:customerId/consultations')
export class ConsultationsController {
  constructor(private readonly consultations: ConsultationsService) {}

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Param('customerId') customerId: string,
    @Body() dto: CreateConsultationDto,
  ) {
    return this.consultations.create(userId, customerId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('userId') userId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.consultations.findByCustomer(userId, customerId);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.consultations.update(userId, customerId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('userId') userId: string,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
  ) {
    return this.consultations.remove(userId, customerId, id);
  }
}
