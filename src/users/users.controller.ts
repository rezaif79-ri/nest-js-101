import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Redirect,
  UseInterceptors,
} from '@nestjs/common';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { CreateUserRequest, CreateUserResponse } from './dto/create-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';

@Controller('users')
export class UsersController {
  @Get()
  @UseInterceptors(TransformInterceptor)
  async findAll(@Query() query: FindUsersQueryDto): Promise<any[]> {
    const response = query.names?.map((name) => ({
      name,
      age: query.age,
    })) ?? [];

    return response;
  }

  @Get(':id')
  @UseInterceptors(TransformInterceptor)
  findUserByID(@Param('id') id: string): string {
    return `This action returns the user, id: ${id}`;
  }

  @Get('docs')
  @Redirect('https://docs.nestjs.com', 302)
  getDocs(@Query('version') version: string) {
    if (!!version && version === '5') {
      console.log(version === '5');

      return { url: 'https://docs.nestjs.com/v5/' };
    }
  }

  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(TransformInterceptor)
  create(@Body() createUserRequest: CreateUserRequest): CreateUserResponse {
    return {
      message: `User ${createUserRequest.name} created successfully`,
    };
  }
}
