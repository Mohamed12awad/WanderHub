import { NumberSequenceService } from './number-sequence.service';

interface TransactionAwareNumberSequence {
  nextNumber(
    key: string,
    prefix?: string,
    padLength?: number,
    separator?: string,
    db?: { numberSequence: { upsert: jest.Mock } },
  ): Promise<string>;
}

describe('NumberSequenceService', () => {
  // Audit P1: sequence allocation ignores the caller transaction (number-sequence.service.ts:18).
  it.failing('nextNumber uses the supplied transaction client', async () => {
    const rootUpsert = jest.fn().mockResolvedValue({
      lastNumber: 9,
      prefix: 'ROOT',
      padLength: 4,
      separator: '-',
    });
    const txUpsert = jest.fn().mockResolvedValue({
      lastNumber: 1,
      prefix: 'TX',
      padLength: 4,
      separator: '-',
    });
    const service = new NumberSequenceService({
      numberSequence: { upsert: rootUpsert },
    } as any) as TransactionAwareNumberSequence;
    const tx = { numberSequence: { upsert: txUpsert } };

    const number = await service.nextNumber('invoice', 'INV', 4, '-', tx);

    expect({
      number,
      rootCalls: rootUpsert.mock.calls.length,
      transactionCalls: txUpsert.mock.calls.length,
    }).toEqual({ number: 'TX-0001', rootCalls: 0, transactionCalls: 1 });
  });
});
