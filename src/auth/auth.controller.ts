import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WechatMiniLoginDto } from './dto/wechat-login.dto';
import { DeviceLoginDto } from './dto/device-login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('v1/auth')
@Public()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('wechat-mini/login')
  async wechatMiniLogin(@Body() dto: WechatMiniLoginDto) {
    return this.authService.wechatMiniLogin(dto);
  }

  @Post('device/login')
  async deviceLogin(@Body() dto: DeviceLoginDto) {
    return this.authService.deviceLogin(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }
}
