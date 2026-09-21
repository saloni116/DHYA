import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { FocusSessionsService } from './focus-sessions.service';

describe('FocusSessionsService', () => {
  let service: FocusSessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FocusSessionsService,
        {
          provide: PrismaService,
          useValue: {
            task: {
              findUnique: jest.fn(),
              count: jest.fn(),
              findMany: jest.fn(),
            },
            focusSession: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FocusSessionsService>(FocusSessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
