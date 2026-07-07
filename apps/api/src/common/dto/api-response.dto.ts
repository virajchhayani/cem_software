import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Success status', default: true })
  success: boolean;

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Timestamp of response' })
  timestamp: string;

  constructor(data: T, message?: string) {
    this.data = data;
    this.success = true;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}

export class ApiErrorResponseDto {
  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error code', required: false })
  code?: string;

  @ApiProperty({ description: 'Success status', default: false })
  success: boolean;

  @ApiProperty({ description: 'Timestamp of response' })
  timestamp: string;

  constructor(message: string, code?: string) {
    this.message = message;
    this.code = code;
    this.success = false;
    this.timestamp = new Date().toISOString();
  }
}
