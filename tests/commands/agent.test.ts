import { beforeEach, describe, expect, it, vi } from 'vitest';
import { select } from '@inquirer/prompts';
import { runAgent } from '../../lib/commands/agent';
import { runOpencode } from '../../lib/commands/opencode';
import { showHelp } from '../../utils';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn()
}));

vi.mock('../../lib/commands/aider', () => ({
  runFeature: vi.fn()
}));

vi.mock('../../lib/commands/conductor', () => ({
  runConductor: vi.fn()
}));

vi.mock('../../lib/commands/codex', () => ({
  runCodex: vi.fn()
}));

vi.mock('../../lib/commands/claude', () => ({
  runClaude: vi.fn()
}));

vi.mock('../../lib/commands/opencode', () => ({
  runOpencode: vi.fn()
}));

vi.mock('../../lib/commands/amp', () => ({
  runAmp: vi.fn()
}));

vi.mock('../../utils', () => ({
  showHelp: vi.fn()
}));

describe('runAgent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('prompts for OpenCode model from predefined options when no --model is provided', async () => {
    vi.mocked(select)
      .mockImplementationOnce(async (args: any) =>
        args.choices.find((choice: any) => choice.name === 'OpenCode').value
      )
      .mockResolvedValueOnce('deepseek-coder');

    await runAgent(['agent']);

    expect(select).toHaveBeenCalledTimes(2);
    const modelPromptArgs = vi.mocked(select).mock.calls[1][0] as any;
    const modelChoices = modelPromptArgs.choices.map((choice: any) => choice.value);

    expect(modelChoices).toContain('gpt-5.3-codex');
    expect(modelChoices).toContain('gemini-2.5-pro');
    expect(modelChoices).toContain('deepseek-coder');
    expect(modelChoices).toContain('claude-opus-4-6');
    expect(runOpencode).toHaveBeenCalledWith(['--model', 'deepseek-coder']);
  });

  it('skips model prompt when --model is already provided', async () => {
    vi.mocked(select).mockImplementationOnce(async (args: any) =>
      args.choices.find((choice: any) => choice.name === 'OpenCode').value
    );

    await runAgent(['agent', '--', '--model', 'gpt-5.2-codex']);

    expect(select).toHaveBeenCalledTimes(1);
    expect(runOpencode).toHaveBeenCalledWith(['--model', 'gpt-5.2-codex']);
  });

  it('shows help and exits early when help flag is provided', async () => {
    await runAgent(['agent', '--help']);

    expect(showHelp).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
  });
});
