import * as dotenv from 'dotenv';
import { showHelp } from '../run-conductor';

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('run-conductor.ts', () => {
  it('should load dotenv config on import', () => {
    require('../run-conductor');
    expect(dotenv.config).toHaveBeenCalled();
  });

  it('should display help message', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    showHelp();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GEMINI CONDUCTOR CLI'));
    consoleSpy.mockRestore();
  });
});
