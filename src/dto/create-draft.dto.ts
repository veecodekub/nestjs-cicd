import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDraftDto {
  @ApiProperty({
    description: 'The title of the draft post',
    example: 'My First Post',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'The content of the draft post',
    example: 'This is the content of my post.',
  })
  content?: string;

  @ApiProperty({
    description: 'The email of the author',
    example: 'author@example.com',
  })
  authorEmail: string;
}
