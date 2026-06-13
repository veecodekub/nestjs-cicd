import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupUserDto {
  @ApiPropertyOptional({
    description: 'The name of the user',
    example: 'John Doe',
  })
  name?: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'john.doe@example.com',
  })
  email: string;
}
