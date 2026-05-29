import { toClient } from './serialize';

describe('toClient', () => {
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
