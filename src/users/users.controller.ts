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
  Res,
  HttpStatus,
  Version,
} from '@nestjs/common';
import type { Response } from 'express';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { CreateUserRequest, CreateUserResponse } from './dto/create-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { UsersService } from './users.service';

@Controller({
  path: "users", 
  version: "1"
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseInterceptors(TransformInterceptor)
  findAll(@Query() query: FindUsersQueryDto): any[] {
    const users = this.usersService.findAll();

    if (!query.names?.length) {
      return users;
    }

    return users.filter((user) => query.names!.includes(user.name));
  }

  @Get('info')
  getInfo(@Res({ passthrough: true }) res: Response) {
    res.status(HttpStatus.OK);
    return [];
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
    this.usersService.create({
      name: createUserRequest.name,
      age: createUserRequest.age,
      address: createUserRequest.address,
    });

    return {
      message: `User ${createUserRequest.name} created successfully`,
    };
  }
}
