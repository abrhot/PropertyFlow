import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'fieldtrack-api',
      timestamp: new Date().toISOString(),
    };
  }
}
