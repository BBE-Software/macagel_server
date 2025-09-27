import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { KeysService } from './keys.service';
import { BootstrapKeysDto } from './dto/bootstrap-keys.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('keys')
@UseGuards(JwtAuthGuard)
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Post('bootstrap')
  async bootstrapKeys(@Request() req, @Body() bootstrapData: BootstrapKeysDto) {
    await this.keysService.validateKeyBundle(bootstrapData);
    return await this.keysService.bootstrapKeys(req.user.id, bootstrapData);
  }

  @Get('status')
  async getKeysStatus(@Request() req) {
    return await this.keysService.getKeysStatus(req.user.id);
  }
}
