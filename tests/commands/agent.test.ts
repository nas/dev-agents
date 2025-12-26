import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAgent } from '../../lib/commands/agent';
import { ProcessRunner } from '../../lib/ProcessRunner';
import { select } from '@inquirer/prompts';

vi.mock('../../lib/ProcessRunner');
vi.mock('@inquirer/prompts');
vi.mock('../../lib/commands/conductor');
vi.mock('../../lib/commands/codex');
vi.mock('../../lib/commands/aider');

describe('agent command', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call showModelStats before showing the selection prompt', async () => {
    vi.mocked(select).mockResolvedValue({ runner: vi.fn() } as any);
    vi.mocked(ProcessRunner.run).mockResolvedValue(undefined);

    await runAgent(['agent']);

    expect(ProcessRunner.run).toHaveBeenCalledWith(
      'gemini',
      expect.arrayContaining(['stats']),
      expect.any(Object)
    );
    expect(ProcessRunner.run).toHaveBeenCalledWith(
      'codex',
      expect.arrayContaining(['status']),
      expect.any(Object)
    );
    expect(select).toHaveBeenCalled();
  });

  it('should pass through model argument to stats commands', async () => {
    vi.mocked(select).mockResolvedValue({ runner: vi.fn() } as any);
    vi.mocked(ProcessRunner.run).mockResolvedValue(undefined);

    await runAgent(['agent', '--', '--model', 'gpt-4.1']);

    expect(ProcessRunner.run).toHaveBeenCalledWith(
      'gemini',
      expect.arrayContaining(['stats', '--model', 'gpt-4.1']),
      expect.any(Object)
    );
    expect(ProcessRunner.run).toHaveBeenCalledWith(
      'codex',
      expect.arrayContaining(['status', '--model', 'gpt-4.1']),
      expect.any(Object)
    );
  });
});
