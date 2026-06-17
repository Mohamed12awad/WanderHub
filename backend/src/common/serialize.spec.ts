import { Prisma } from '@prisma/client';
import { toClient, serializeResponse } from './serialize';

describe('toClient', () => {
  beforeEach(() => jest.clearAllMocks());
  it('renames id -> _id', () => {
    expect(toClient({ id: 'abc', name: 'x' })).toEqual({ _id: 'abc', name: 'x' });
  });

  it('renames linkedToId -> linkedTo', () => {
    expect(toClient({ id: '1', linkedToId: 'cust1' })).toEqual({ _id: '1', linkedTo: 'cust1' });
  });

  it('recurses into nested objects and arrays', () => {
    const input = {
      id: 'inv1',
      customer: { id: 'c1', name: 'Acme' },
      items: [{ id: 'li1' }, { id: 'li2' }],
    };
    expect(toClient(input)).toEqual({
      _id: 'inv1',
      customer: { _id: 'c1', name: 'Acme' },
      items: [{ _id: 'li1' }, { _id: 'li2' }],
    });
  });

  it('leaves Date values intact', () => {
    const d = new Date('2026-05-29T00:00:00Z');
    const out = toClient({ id: '1', createdAt: d }) as any;
    expect(out.createdAt).toBe(d);
  });

  it('passes through primitives and null', () => {
    expect(toClient(null)).toBeNull();
    expect(toClient(5 as any)).toBe(5);
  });
});

describe('serializeResponse decimal modes', () => {
  it('number mode (legacy) converts Decimal to a JS number', () => {
    const out = toClient({ total: new Prisma.Decimal('14.99') }) as any;
    expect(out.total).toBe(14.99);
    expect(typeof out.total).toBe('number');
  });

  it('string mode (new GL endpoints) converts Decimal to a canonical string', () => {
    const out = serializeResponse({ total: new Prisma.Decimal('14.99') }, 'string') as any;
    expect(out.total).toBe('14.99');
    expect(typeof out.total).toBe('string');
  });

  it('never emits the raw Decimal {s,e,d} shape', () => {
    const out: any = serializeResponse({ total: new Prisma.Decimal('100.5') }, 'string');
    expect(out.total).not.toHaveProperty('s');
    expect(out.total).not.toHaveProperty('d');
  });

  it('passes Buffers through untouched (file downloads must not be mangled)', () => {
    const buf = Buffer.from('hello');
    const out = serializeResponse(buf, 'number');
    expect(Buffer.isBuffer(out)).toBe(true);
    expect((out as Buffer).toString()).toBe('hello');
  });
});
