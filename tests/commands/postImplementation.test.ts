import { describe, it, expect } from 'vitest';
import { Issue } from '@linear/sdk';
import { buildPrBody } from '../../lib/commands/postImplementation';

describe('buildPrBody', () => {
  it('uses Fixes when a ticket url exists', () => {
    const ticket = { title: 'Do thing', url: 'https://linear.app/issue/ABC-1' } as Issue;
    expect(buildPrBody(ticket, 'Details')).toBe('Fixes https://linear.app/issue/ABC-1');
  });

  it('uses the provided description when no ticket url exists', () => {
    const ticket = { title: 'Ad-hoc task' } as Issue;
    expect(buildPrBody(ticket, '  User provided details  ')).toBe('User provided details');
  });

  it('falls back to the ticket description when no url exists', () => {
    const ticket = { title: 'Ad-hoc task', description: 'Ticket description' } as Issue;
    expect(buildPrBody(ticket)).toBe('Ticket description');
  });

  it('falls back to the title when no description exists', () => {
    const ticket = { title: 'Fallback title' } as Issue;
    expect(buildPrBody(ticket)).toBe('Fallback title');
  });
});
