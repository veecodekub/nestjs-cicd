import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PostsService } from './post.service';
import { UsersService } from './user.service';

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
});
