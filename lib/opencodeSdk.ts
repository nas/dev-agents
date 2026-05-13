type OpenCodeClient = {
  session: {
    create: (options?: Record<string, unknown>) => Promise<OpenCodeSession>;
  };
  dispose?: () => Promise<void> | void;
};

export type OpenCodeSession = {
  prompt: (prompt: string) => Promise<unknown>;
};

export async function createOpenCodeSession(options: {
  cwd: string;
  model?: string;
  agent?: string;
}): Promise<{ client: OpenCodeClient; session: OpenCodeSession }> {
  const { createOpencode } = await import('@opencode-ai/sdk');
  const client: OpenCodeClient = await createOpencode({
    cwd: options.cwd
  });

  const sessionOptions: Record<string, unknown> = {};
  if (options.model) {
    sessionOptions.model = options.model;
  }
  if (options.agent) {
    sessionOptions.agent = options.agent;
  }

  const session = await client.session.create(
    Object.keys(sessionOptions).length > 0 ? sessionOptions : undefined
  );

  return { client, session };
}

export function extractSdkText(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  const value = result as any;
  const parts =
    value?.data?.message?.parts ??
    value?.message?.parts ??
    value?.parts;

  if (Array.isArray(parts)) {
    return parts
      .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('\n');
  }

  const content =
    value?.data?.content ??
    value?.content;

  if (typeof content === 'string') {
    return content;
  }

  return '';
}
