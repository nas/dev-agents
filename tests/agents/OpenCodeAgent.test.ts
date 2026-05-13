import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenCodeAgent } from '../../lib/agents/OpenCodeAgent';
import { createOpenCodeSession } from '../../lib/opencodeSdk';

vi.mock('../../lib/opencodeSdk', () => ({
  createOpenCodeSession: vi.fn(),
  extractSdkText: vi.fn((value: any) => value?.data?.content ?? '')
}));

describe('OpenCodeAgent', () => {
  let agent: OpenCodeAgent;

  beforeEach(() => {
    vi.resetAllMocks();
    agent = new OpenCodeAgent({ cwd: 'cwd', model: 'gpt-5', agent: 'coder' });
  });

  describe('generatePlan', () => {
    it('should use opencode sdk session for planning', async () => {
      const prompt = vi.fn().mockResolvedValue({ data: { content: 'plan output' } });
      const dispose = vi.fn();
      vi.mocked(createOpenCodeSession).mockResolvedValue({
        client: { dispose } as any,
        session: { prompt }
      });

      const plan = await agent.generatePlan('task');

      expect(plan).toBe('plan output');
      expect(createOpenCodeSession).toHaveBeenCalledWith({
        cwd: 'cwd',
        model: 'gpt-5',
        agent: 'coder'
      });
      expect(prompt).toHaveBeenCalledWith(expect.stringContaining('Create a concise, numbered implementation plan'));
      expect(dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('implement', () => {
    it('should use opencode sdk session for implementation', async () => {
      const prompt = vi.fn().mockResolvedValue({ data: { content: 'ok' } });
      const dispose = vi.fn();
      vi.mocked(createOpenCodeSession).mockResolvedValue({
        client: { dispose } as any,
        session: { prompt }
      });

      await agent.implement('task', 'plan');

      expect(createOpenCodeSession).toHaveBeenCalledWith({
        cwd: 'cwd',
        model: 'gpt-5',
        agent: 'coder'
      });
      expect(prompt).toHaveBeenCalledWith(expect.stringContaining('Approved Implementation Plan'));
      expect(dispose).toHaveBeenCalledTimes(1);
    });
  });
});
