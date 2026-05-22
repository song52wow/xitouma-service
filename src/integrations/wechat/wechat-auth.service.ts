import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WechatAuthService {
  private readonly logger = new Logger(WechatAuthService.name);

  constructor(private configService: ConfigService) {}

  async code2Session(
    code: string,
  ): Promise<{ openid: string; sessionKey: string }> {
    const appid = this.configService.get<string>('WECHAT_APPID');
    const secret = this.configService.get<string>('WECHAT_SECRET');
    const url =
      this.configService.get<string>('WECHAT_JSCODE2SESSION_URL') ||
      'https://api.weixin.qq.com/sns/jscode2session';

    const response = await axios.get(url, {
      params: {
        appid,
        secret,
        js_code: code,
        grant_type: 'authorization_code',
      },
    });

    const data = response.data;
    if (data.errcode) {
      this.logger.error(`WeChat code2session error: ${data.errmsg}`);
      throw new Error(`微信登录失败: ${data.errmsg}`);
    }

    return {
      openid: data.openid,
      sessionKey: data.session_key,
    };
  }
}
