import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    example: 'Logout successful',
    description: 'Response message',
  })
  message: string;
}
