import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { WechatAuthService } from '../integrations/wechat/wechat-auth.service';
import { WechatMiniLoginDto } from './dto/wechat-login.dto';
import { DeviceLoginDto } from './dto/device-login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private wechatAuthService: WechatAuthService,
  ) {}

  async wechatMiniLogin(dto: WechatMiniLoginDto) {
    const { openid, sessionKey } = await this.wechatAuthService.code2Session(
      dto.code,
    );

    const identity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'wechat_mini',
          providerUserId: openid,
        },
      },
      include: { user: true },
    });

    let user;
    let isNewUser = false;

    if (identity) {
      user = identity.user;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
    } else {
      isNewUser = true;
      user = await this.prisma.user.create({
        data: {
          nickname: dto.nickname || '',
          avatarUrl: dto.avatarUrl || '',
          identities: {
            create: {
              provider: 'wechat_mini',
              providerUserId: openid,
              sessionKeyEncrypted: sessionKey,
            },
          },
          statistics: {
            create: {},
          },
        },
      });
    }

    const tokens = await this.generateTokens(user.id);
    return {
      ...tokens,
      isNewUser,
      user: this.formatUser(user),
    };
  }

  async deviceLogin(dto: DeviceLoginDto) {
    const identity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'device',
          providerUserId: dto.deviceId,
        },
      },
      include: { user: true },
    });

    let user;
    let isNewUser = false;

    if (identity) {
      user = identity.user;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
    } else {
      isNewUser = true;
      const suffix = Math.random().toString(36).substring(2, 8);
      user = await this.prisma.user.create({
        data: {
          nickname: `用户${suffix}`,
          identities: {
            create: {
              provider: 'device',
              providerUserId: dto.deviceId,
            },
          },
          statistics: {
            create: {},
          },
        },
      });
    }

    const tokens = await this.generateTokens(user.id);
    return {
      ...tokens,
      isNewUser,
      user: this.formatUser(user),
    };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status === 'disabled') {
        throw new UnauthorizedException();
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const expiresIn = parseInt(
        this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7200'),
      );

      const accessToken = await this.jwtService.signAsync(
        { sub: user.id },
        { secret, expiresIn },
      );

      return {
        accessToken,
        expiresIn: parseInt(
          this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7200'),
        ),
      };
    } catch {
      throw new UnauthorizedException('无效的刷新令牌');
    }
  }

  private async generateTokens(userId: string) {
    const accessExpiresIn = parseInt(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '7200'),
    );
    const refreshExpiresIn = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '2592000'),
    );
    const secret = this.configService.get<string>('JWT_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ sub: userId }, { secret, expiresIn: accessExpiresIn }),
      this.jwtService.signAsync(
        { sub: userId, type: 'refresh' },
        { secret, expiresIn: refreshExpiresIn },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }

  private formatUser(user: {
    id: string;
    nickname: string;
    avatarUrl: string;
    gender: number;
    hairLength: string;
    hairType: string;
  }) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      hairLength: user.hairLength,
      hairType: user.hairType,
    };
  }
}
