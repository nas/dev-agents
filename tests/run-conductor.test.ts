import * as dotenv from 'dotenv';

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('run-conductor.ts', () => {
  it('should load dotenv config on import', () => {
    require('../run-conductor');
    expect(dotenv.config).toHaveBeenCalled();
  });
});
