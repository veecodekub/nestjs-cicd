import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  ServiceUnavailableException,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Post as PostModel,
  User as UserModel,
} from '../generated/prisma/client';
import { CreateDraftDto } from './dto/create-draft.dto';
import { SignupUserDto } from './dto/signup-user.dto';
import { PostsService } from './post.service';
import { PrismaService } from './prisma.service';
import { UsersService } from './user.service';

@ApiTags('Posts & Users')
@Controller()
export class AppController {
  constructor(
    private readonly userService: UsersService,
    private readonly postService: PostsService,
    private readonly prismaService: PrismaService,
  ) {}

  @Version(['1', VERSION_NEUTRAL])
  @Get('health')
  @ApiOperation({ summary: 'Check API and Database health status' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  @ApiResponse({ status: 503, description: 'API or database is unhealthy' })
  async getHealth() {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return {
        status: 'UP',
        database: 'UP',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'DOWN',
        database: 'DOWN',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Version('1')
  @Get('post/:id')
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the post to retrieve',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Post found successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPostById(@Param('id') id: string): Promise<PostModel> {
    return this.postService.post({ id: Number(id) });
  }

  @Version('1')
  @Get('feed')
  @ApiOperation({ summary: 'Get all published posts' })
  @ApiResponse({ status: 200, description: 'List of published posts' })
  async getPublishedPosts(): Promise<PostModel[]> {
    return this.postService.posts({
      where: { published: true },
    });
  }

  @Version('1')
  @Get('filtered-posts/:searchString')
  @ApiOperation({ summary: 'Search posts by title or content' })
  @ApiParam({
    name: 'searchString',
    description: 'The query string to search for',
  })
  @ApiResponse({
    status: 200,
    description: 'List of posts matching the search query',
  })
  async getFilteredPosts(
    @Param('searchString') searchString: string,
  ): Promise<PostModel[]> {
    return this.postService.posts({
      where: {
        OR: [
          {
            title: { contains: searchString },
          },
          {
            content: { contains: searchString },
          },
        ],
      },
    });
  }

  @Version('1')
  @Post('post')
  @ApiOperation({ summary: 'Create a new draft post' })
  @ApiBody({ type: CreateDraftDto })
  @ApiResponse({ status: 201, description: 'Draft post created successfully' })
  async createDraft(@Body() postData: CreateDraftDto): Promise<PostModel> {
    const { title, content, authorEmail } = postData;
    return this.postService.createPost({
      title,
      content,
      author: {
        connect: { email: authorEmail },
      },
    });
  }

  @Version('1')
  @Post('user')
  @ApiOperation({ summary: 'Register/Signup a new user' })
  @ApiBody({ type: SignupUserDto })
  @ApiResponse({ status: 201, description: 'User signed up successfully' })
  async signupUser(@Body() userData: SignupUserDto): Promise<UserModel> {
    return this.userService.createUser(userData);
  }

  @Version('1')
  @Put('publish/:id')
  @ApiOperation({ summary: 'Publish a draft post' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the post to publish',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Post published successfully' })
  async publishPost(@Param('id') id: string): Promise<PostModel> {
    return this.postService.updatePost({
      where: { id: Number(id) },
      data: { published: true },
    });
  }

  @Version('1')
  @Delete('post/:id')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the post to delete',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  async deletePost(@Param('id') id: string): Promise<PostModel> {
    return this.postService.deletePost({ id: Number(id) });
  }
}
