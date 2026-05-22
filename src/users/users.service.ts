import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.formatUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = {};
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.hairLength !== undefined) data.hairLength = dto.hairLength;
    if (dto.hairType !== undefined) data.hairType = dto.hairType;
    if (dto.region !== undefined) data.region = dto.region;
    if (dto.nickname !== undefined) data.nickname = dto.nickname;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.formatUser(user);
  }

  private formatUser(user: {
    id: string;
    nickname: string;
    avatarUrl: string;
    gender: number;
    hairLength: string;
    hairType: string;
    region: string;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      hairLength: user.hairLength,
      hairType: user.hairType,
      region: user.region,
      timezone: user.timezone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
