import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getChangedFiles, generateSummary, SummaryReport, showHelp } from '../utils';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {}; // Reset env
  });

  describe('getChangedFiles', () => {
    it('should return list of changed files', () => {
      vi.mocked(execSync).mockReturnValue('file1.ts\nfile2.ts\n');
      const files = getChangedFiles('cwd');
      expect(files).toEqual(['file1.ts', 'file2.ts']);
    });

    it('should return empty list on error', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('error');
      });
      const files = getChangedFiles('cwd');
      expect(files).toEqual([]);
    });
  });

  describe('generateSummary', () => {
    it('should log summary', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const report: SummaryReport = {
        ticketId: '123',
        ticketTitle: 'Test Ticket',
        branchName: 'feature/test',
        planApproved: true,
        testPassed: true,
        testAttempts: 1,
        prCreated: true,
        startTime: new Date(),
        endTime: new Date(),
        changedFiles: ['file1.ts'],
      };
      generateSummary(report);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('FEATURE IMPLEMENTATION SUMMARY'));
      consoleSpy.mockRestore();
    });
  });

  describe('showHelp', () => {
    it('should log CLI usage', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      showHelp();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AI OPS CLI'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('opencode'));
      consoleSpy.mockRestore();
    });
  });
});
