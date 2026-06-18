import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PostsService } from './post.service';
import { UsersService } from './user.service';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs';

describe('AppController', () => {
  let appController: AppController;
  let usersService: UsersService;
  let postsService: PostsService;

  const mockUsersService = {
    createUser: jest.fn(),
  };

  const mockPostsService = {
    post: jest.fn(),
    posts: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    usersService = app.get<UsersService>(UsersService);
    postsService = app.get<PostsService>(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  describe('getPostById', () => {
    it('should return a post by id', async () => {
      const mockPost = {
        id: 1,
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
      };
      mockPostsService.post.mockResolvedValue(mockPost);

      const result = await appController.getPostById('1');
      expect(result).toEqual(mockPost);
      expect(postsService.post).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('getPublishedPosts', () => {
    it('should return published posts', async () => {
      const mockPosts = [
        {
          id: 1,
          title: 'Test Post',
          content: 'Test Content',
          published: true,
          authorId: 1,
        },
      ];
      mockPostsService.posts.mockResolvedValue(mockPosts);

      const result = await appController.getPublishedPosts();
      expect(result).toEqual(mockPosts);
      expect(postsService.posts).toHaveBeenCalledWith({
        where: { published: true },
      });
    });
  });

  describe('getFilteredPosts', () => {
    it('should return posts filtered by search string', async () => {
      const mockPosts = [
        {
          id: 1,
          title: 'Test Post',
          content: 'Test Content',
          published: true,
          authorId: 1,
        },
      ];
      mockPostsService.posts.mockResolvedValue(mockPosts);

      const result = await appController.getFilteredPosts('searchQuery');
      expect(result).toEqual(mockPosts);
      expect(postsService.posts).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'searchQuery' } },
            { content: { contains: 'searchQuery' } },
          ],
        },
      });
    });
  });

  describe('createDraft', () => {
    it('should create a new draft post', async () => {
      const postData = {
        title: 'New Post',
        content: 'New Content',
        authorEmail: 'user@example.com',
      };
      const mockCreatedPost = {
        id: 2,
        title: 'New Post',
        content: 'New Content',
        published: false,
        authorId: 1,
      };
      mockPostsService.createPost.mockResolvedValue(mockCreatedPost);

      const result = await appController.createDraft(postData);
      expect(result).toEqual(mockCreatedPost);
      expect(postsService.createPost).toHaveBeenCalledWith({
        title: 'New Post',
        content: 'New Content',
        author: {
          connect: { email: 'user@example.com' },
        },
      });
    });
  });

  describe('signupUser', () => {
    it('should sign up a user', async () => {
      const userData = { email: 'user@example.com', name: 'User Name' };
      const mockCreatedUser = {
        id: 1,
        email: 'user@example.com',
        name: 'User Name',
      };
      mockUsersService.createUser.mockResolvedValue(mockCreatedUser);

      const result = await appController.signupUser(userData);
      expect(result).toEqual(mockCreatedUser);
      expect(usersService.createUser).toHaveBeenCalledWith(userData);
    });
  });

  describe('publishPost', () => {
    it('should publish a post', async () => {
      const mockUpdatedPost = {
        id: 1,
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
      };
      mockPostsService.updatePost.mockResolvedValue(mockUpdatedPost);

      const result = await appController.publishPost('1');
      expect(result).toEqual(mockUpdatedPost);
      expect(postsService.updatePost).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { published: true },
      });
    });
  });

  describe('deletePost', () => {
    it('should delete a post', async () => {
      const mockDeletedPost = {
        id: 1,
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
      };
      mockPostsService.deletePost.mockResolvedValue(mockDeletedPost);

      const result = await appController.deletePost('1');
      expect(result).toEqual(mockDeletedPost);
      expect(postsService.deletePost).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('getLive', () => {
    it('should return UP for liveness check', async () => {
      const result = await appController.getLive();
      expect(result).toEqual(
        expect.objectContaining({
          status: 'UP',
        }),
      );
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getReady', () => {
    let readdirSpy: jest.SpyInstance;

    beforeEach(() => {
      readdirSpy = jest.spyOn(fs.promises, 'readdir');
    });

    afterEach(() => {
      readdirSpy.mockRestore();
    });

    it('should return UP when config, db, and migrations are ready', async () => {
      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/db');
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([1]) // SELECT 1
        .mockResolvedValueOnce([
          { migration_name: '20260613144304_init', finished_at: new Date() },
        ]); // _prisma_migrations query

      readdirSpy.mockResolvedValue([
        {
          name: '20260613144304_init',
          isDirectory: () => true,
        } as any,
      ]);

      const result = await appController.getReady();
      expect(result).toEqual(
        expect.objectContaining({
          status: 'UP',
          checks: {
            database: 'UP',
            configuration: 'UP',
            migrations: 'UP',
          },
        }),
      );
      expect(result.timestamp).toBeDefined();
    });

    it('should throw 503 when config is missing', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(appController.getReady()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw 503 when database connection fails', async () => {
      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/db');
      mockPrismaService.$queryRaw.mockRejectedValueOnce(
        new Error('DB connection failed'),
      );

      await expect(appController.getReady()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw 503 when migrations are not applied', async () => {
      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/db');
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([1]) // SELECT 1
        .mockResolvedValueOnce([]); // Empty _prisma_migrations

      readdirSpy.mockResolvedValue([
        {
          name: '20260613144304_init',
          isDirectory: () => true,
        } as any,
      ]);

      await expect(appController.getReady()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
