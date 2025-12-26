import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiderAgent } from '../../lib/agents/AiderAgent';
import { ConfigManager } from '../../lib/ConfigManager';
import { ProcessRunner } from '../../lib/ProcessRunner';

vi.mock('../../lib/ProcessRunner');
vi.mock('../../lib/ConfigManager');

describe('AiderAgent', () => {
  let agent: AiderAgent;
  let mockConfigManager: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockConfigManager = new ConfigManager();
    mockConfigManager.getConfig.mockReturnValue({
        defaultModel: 'default-model',
        defaultEditorModel: 'default-editor-model'
    });
    mockConfigManager.getApiKeyArgs.mockReturnValue([]);
    
    agent = new AiderAgent(mockConfigManager, 'cwd');
  });

  describe('generatePlan', () => {
    it('should run aider with correct arguments for planning', async () => {
      vi.mocked(ProcessRunner.runAndCapture).mockResolvedValue('plan output');

      const plan = await agent.generatePlan('task');

      expect(plan).toBe('plan output');
      expect(ProcessRunner.runAndCapture).toHaveBeenCalledWith(
          'aider',
          expect.arrayContaining([
              '--architect',
              '--model', 'default-model',
              '--editor-model', 'default-editor-model',
              '--dry-run'
          ]),
          expect.objectContaining({ cwd: 'cwd', input: 'A\n' })
      );
    });
  });

  describe('implement', () => {
    it('should run aider with correct arguments for implementation', async () => {
      vi.mocked(ProcessRunner.run).mockResolvedValue(undefined);

      await agent.implement('task', 'plan');

      expect(ProcessRunner.run).toHaveBeenCalledWith(
          'aider',
          expect.arrayContaining([
              '--model', 'default-model',
              '--auto-commits'
          ]),
          expect.objectContaining({ cwd: 'cwd', stdio: 'inherit' })
      );
    });
  });
});
