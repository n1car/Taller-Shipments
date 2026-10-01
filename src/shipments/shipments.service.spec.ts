import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShipmentEntity } from './entities/shipment.entity';
import { ShipmentRulesService } from './shipment-rules.service';
import { ShipmentStatus } from './shipment-status.enum';
import { ShipmentsService } from './shipments.service';

describe('ShipmentsService', () => {
  let service: ShipmentsService;
  let repo: any;
  let rules: any;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    rules = {
      ensureCanBeDispatched: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        { provide: getRepositoryToken(ShipmentEntity), useValue: repo },
        { provide: ShipmentRulesService, useValue: rules },
      ],
    }).compile();

    service = module.get(ShipmentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all shipments', async () => {
    const data = [
      { id: 1, trackingCode: 'ABC123', destination: 'Bogota', status: 'created' },
      { id: 2, trackingCode: 'DEF456', destination: 'Cali', status: 'created' },
    ];
    repo.find.mockResolvedValue(data);

    const result = await service.findAll();

    expect(result).toEqual(data);
    expect(repo.find).toHaveBeenCalledTimes(1);
  });

  it('should return one shipment when it exists', async () => {
    const shipment = { id: 1, trackingCode: 'ABC123', destination: 'Bogota', status: 'created' };
    repo.findOneBy.mockResolvedValue(shipment);

    const result = await service.findOne(1);

    expect(result).toEqual(shipment);
    expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
  });

  it('should throw NotFoundException when shipment does not exist', async () => {
    repo.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('should create and save a new shipment', async () => {
    const dto = { trackingCode: 'XYZ789', destination: 'Medellin' };
    const created = { ...dto, status: ShipmentStatus.CREATED };
    const saved = { ...created, id: 1 };
    repo.create.mockReturnValue(created);
    repo.save.mockResolvedValue(saved);

    const result = await service.create(dto);

    expect(result).toEqual(saved);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ trackingCode: 'XYZ789' }),
    );
    expect(repo.save).toHaveBeenCalledWith(created);
  });

  it('should dispatch a valid shipment', async () => {
    const shipment = { id: 1, trackingCode: 'ABC123', destination: 'Bogota', status: ShipmentStatus.CREATED };
    repo.findOneBy.mockResolvedValue(shipment);
    rules.ensureCanBeDispatched.mockReturnValue(undefined);
    repo.save.mockResolvedValue({ ...shipment, status: ShipmentStatus.DISPATCHED });

    const result = await service.dispatch(1);

    expect(result.status).toBe(ShipmentStatus.DISPATCHED);
    expect(rules.ensureCanBeDispatched).toHaveBeenCalledWith(shipment);
    expect(repo.save).toHaveBeenCalled();
  });
});
