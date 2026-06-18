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
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
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
  private readonly startedAt = Date.now();

  constructor(
    private readonly userService: UsersService,
    private readonly postService: PostsService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Version(['1', VERSION_NEUTRAL])
  @Get('health/live')
  @ApiOperation({
    summary: 'Liveness check: verifies process is not deadlocked',
  })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  async getLive() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }

  @Version(['1', VERSION_NEUTRAL])
  @Get('health/ready')
  @ApiOperation({
    summary:
      'Readiness check: verifies DB, configuration, and migrations are ready',
  })
  @ApiResponse({ status: 200, description: 'App is ready' })
  @ApiResponse({ status: 503, description: 'App is not ready' })
  async getReady() {
    const checks = {
      database: 'DOWN',
      configuration: 'DOWN',
      migrations: 'DOWN',
    };
    let hasError = false;
    const errors: Record<string, string> = {};

    // 1. Check Configuration
    try {
      const dbUrl = this.configService.get<string>('DATABASE_URL');
      if (!dbUrl) {
        throw new Error('DATABASE_URL environment variable is missing');
      }
      checks.configuration = 'UP';
    } catch (error) {
      hasError = true;
      checks.configuration = 'DOWN';
      errors.configuration =
        error instanceof Error ? error.message : String(error);
    }

    // 2. Check Database Connection
    if (checks.configuration === 'UP') {
      try {
        await this.prismaService.$queryRaw`SELECT 1`;
        checks.database = 'UP';
      } catch (error) {
        hasError = true;
        checks.database = 'DOWN';
        errors.database =
          error instanceof Error ? error.message : String(error);
      }
    }

    // 3. Check Migrations Status
    if (checks.database === 'UP') {
      try {
        const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
        let diskMigrations: string[] = [];
        try {
          const files = await fs.promises.readdir(migrationsPath, {
            withFileTypes: true,
          });
          diskMigrations = files
            .filter((file) => file.isDirectory())
            .map((file) => file.name)
            .sort();
        } catch {
          // If directory doesn't exist or other read error, assume 0 disk migrations
          diskMigrations = [];
        }

        let appliedMigrations: Array<{
          migration_name: string;
          finished_at: Date | null;
        }> = [];
        try {
          appliedMigrations = await this.prismaService.$queryRaw<
            Array<{ migration_name: string; finished_at: Date | null }>
          >`SELECT migration_name, finished_at FROM _prisma_migrations`;
        } catch {
          if (diskMigrations.length > 0) {
            throw new Error(
              `Migrations table '_prisma_migrations' does not exist, but ${diskMigrations.length} migration(s) found on disk.`,
            );
          }
        }

        if (diskMigrations.length > 0) {
          const appliedNames = new Set(
            appliedMigrations
              .filter((m) => m.finished_at !== null)
              .map((m) => m.migration_name),
          );

          const missing = diskMigrations.filter((m) => !appliedNames.has(m));
          if (missing.length > 0) {
            throw new Error(`Pending migrations: ${missing.join(', ')}`);
          }
        }

        checks.migrations = 'UP';
      } catch (error) {
        hasError = true;
        checks.migrations = 'DOWN';
        errors.migrations =
          error instanceof Error ? error.message : String(error);
      }
    }

    const response = {
      status: hasError ? 'DOWN' : 'UP',
      checks,
      timestamp: new Date().toISOString(),
      ...(hasError && { errors }),
    };

    if (hasError) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  @Version('1')
  @Get('system/info')
  @ApiOperation({
    summary: 'Get safe runtime and release metadata for deployment checks',
  })
  @ApiResponse({ status: 200, description: 'System metadata returned' })
  getSystemInfo() {
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);

    return {
      service: this.configService.get<string>('APP_NAME') ?? 'nestjs-cicd',
      version: this.configService.get<string>('APP_VERSION') ?? 'unknown',
      environment: this.configService.get<string>('NODE_ENV') ?? 'development',
      gitSha: this.configService.get<string>('GIT_SHA') ?? 'unknown',
      imageTag: this.configService.get<string>('IMAGE_TAG') ?? 'unknown',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    };
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
