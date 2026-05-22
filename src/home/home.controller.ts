import { Controller, Get, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { HomeService } from './home.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('v1/home')
export class HomeController {
  constructor(private homeService: HomeService) {}

  @Get()
  async getHome(
    @CurrentUser() user: User,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.homeService.getHomeData(
      user,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );
  }
}
