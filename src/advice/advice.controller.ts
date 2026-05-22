import { Body, Controller, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AdviceService } from './advice.service';
import { WashAdviceDto } from './dto/wash-advice.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('v1/advice')
export class AdviceController {
  constructor(private adviceService: AdviceService) {}

  @Post('wash')
  async getWashAdvice(@CurrentUser() user: User, @Body() dto: WashAdviceDto) {
    return this.adviceService.getWashAdvice(user, dto);
  }
}
