import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runInRepo, runTests } from '../helpers';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('runInRepo', () => {
    it('should execute command and return output', () => {
      vi.mocked(execSync).mockReturnValue(' output ');
      const result = runInRepo('cmd', 'cwd');
      expect(result).toBe('output');
      expect(execSync).toHaveBeenCalledWith('cmd', { cwd: 'cwd', encoding: 'utf-8' });
    });

    it('should return empty string on error', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('error');
      });
      const result = runInRepo('cmd', 'cwd');
      expect(result).toBe('');
    });
  });

  describe('runTests', () => {
    it('should return passed true on success', () => {
      vi.mocked(execSync).mockReturnValue('success');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = runTests('cwd');
      expect(result.passed).toBe(true);
      expect(result.output).toBe('success');
      consoleSpy.mockRestore();
    });

    it('should return passed false on error', () => {
      vi.mocked(execSync).mockImplementation(() => {
        const err = new Error('failed');
        (err as any).stdout = 'test failed';
        throw err;
      });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = runTests('cwd');
      expect(result.passed).toBe(false);
      expect(result.output).toBe('test failed');
      consoleSpy.mockRestore();
    });
  });
});
