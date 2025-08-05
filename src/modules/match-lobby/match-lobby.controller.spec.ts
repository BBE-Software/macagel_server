import { Test, TestingModule } from '@nestjs/testing';
import { MatchLobbyController } from './match-lobby.controller';

describe('MatchLobbyController', () => {
  let controller: MatchLobbyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchLobbyController],
    }).compile();

    controller = module.get<MatchLobbyController>(MatchLobbyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
