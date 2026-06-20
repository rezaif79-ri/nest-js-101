import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { PaginationQueryDto } from '../products/dto/pagination-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

/**
 * Admin-only user management. Every route runs behind JwtAuthGuard then
 * AdminGuard, so `isAdmin` is guaranteed true by the time a handler runs.
 * Responses are mapped to UserResponseDto so the password hash is never
 * exposed.
 */
@ApiTags('admin/users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
@UseInterceptors(TransformInterceptor)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    const { items, nextCursor } = await this.usersService.findPaginated(query);
    return {
      items: items.map((user) => UserResponseDto.fromEntity(user)),
      nextCursor,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.requireExisting(id);
    return UserResponseDto.fromEntity(user);
  }

  @Patch(':id/deactivate')
  async deactivate(
    @CurrentUser('userId') currentUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    // Guard against locking yourself out.
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }
    const user = await this.usersService.deactivate(id);
    return UserResponseDto.fromEntity(user);
  }

  @Patch(':id/role')
  async setRole(
    @CurrentUser('userId') currentUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    // Prevent self-demotion, which could orphan the admin role.
    if (id === currentUserId && !dto.isAdmin) {
      throw new ForbiddenException('You cannot revoke your own admin access.');
    }
    const user = await this.usersService.setAdmin(id, dto.isAdmin);
    return UserResponseDto.fromEntity(user);
  }
}
