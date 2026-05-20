import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CreateUserRequest, CreateUserResponse } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  @Get()
  findAll(@Req() request: Request, @Query('name') name: string): string {
    return `This action returns all users, url: ${request.url}, name: ${name}`;
  }

  @Post()
  @HttpCode(201)
  create(@Body() createUserRequest: CreateUserRequest): CreateUserResponse {
    return {
      message: `User ${createUserRequest.name} created successfully`,
    };
  }
}
