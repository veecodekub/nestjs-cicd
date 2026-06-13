import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PostsService } from './post.service';
import { PrismaService } from './prisma.service';
import { UsersService } from './user.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [PrismaService, UsersService, PostsService],
})
export class AppModule {}
