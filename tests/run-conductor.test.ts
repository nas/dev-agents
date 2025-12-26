import select from '@inquirer/select';
import * as dotenv from 'dotenv';
import { actions, main, showHelp, runCommand } from '../run-conductor';
import { spawn } from 'child_process';

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('@inquirer/select', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('child_process');

describe('run-conductor.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load dotenv config on import', () => {
    jest.isolateModules(() => {
        require('../run-conductor');
    });
    expect(dotenv.config).toHaveBeenCalled();
  });

  it('should display help message', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    showHelp();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GEMINI CONDUCTOR CLI'));
    consoleSpy.mockRestore();
  });

  it('should show main menu options', async () => {
    (select as jest.Mock).mockResolvedValue('exit');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleClearSpy = jest.spyOn(console, 'clear').mockImplementation();
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    await main();

    expect(select).toHaveBeenCalledWith({
      message: 'Select an action:',
      choices: [
        { name: 'Start New Track', value: 'new_track' },
        { name: 'Work on Track', value: 'implement_track' },
        { name: 'Exit', value: 'exit' },
      ],
    });

    consoleSpy.mockRestore();
    consoleClearSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("should call handleNewTrack when 'Start New Track' is selected", async () => {
    (select as jest.Mock)
      .mockResolvedValueOnce('new_track')
      .mockResolvedValueOnce('exit');
    
    const handleNewTrackSpy = jest.spyOn(actions, 'handleNewTrack').mockImplementation(async () => {});
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleClearSpy = jest.spyOn(console, 'clear').mockImplementation();

    await main();

    expect(handleNewTrackSpy).toHaveBeenCalled();

    handleNewTrackSpy.mockRestore();
    consoleSpy.mockRestore();
    consoleClearSpy.mockRestore();
  });

  it("should call handleImplementTrack when 'Work on Track' is selected", async () => {
    (select as jest.Mock)
      .mockResolvedValueOnce('implement_track')
      .mockResolvedValueOnce('exit');
    
    const handleImplementTrackSpy = jest.spyOn(actions, 'handleImplementTrack').mockImplementation(async () => {});
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleClearSpy = jest.spyOn(console, 'clear').mockImplementation();

    await main();

    expect(handleImplementTrackSpy).toHaveBeenCalled();

    handleImplementTrackSpy.mockRestore();
    consoleSpy.mockRestore();
    consoleClearSpy.mockRestore();
  });

  it('should run a command using spawn', async () => {
    const mockOn = jest.fn((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    });
    (spawn as jest.Mock).mockReturnValue({
      on: mockOn,
      stderr: { on: jest.fn() },
      stdout: { on: jest.fn() }
    });

    await runCommand('echo', ['hello']);

    expect(spawn).toHaveBeenCalledWith('echo', ['hello'], { stdio: 'inherit' });
  });

  it('should execute correct command for New Track', async () => {
    const mockOn = jest.fn((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    });
    (spawn as jest.Mock).mockReturnValue({
      on: mockOn,
      stderr: { on: jest.fn() },
      stdout: { on: jest.fn() }
    });

    await actions.handleNewTrack();

    expect(spawn).toHaveBeenCalledWith('gemini', ['/conductor:newTrack'], { stdio: 'inherit' });
  });

  it('should execute correct command for Implement Track', async () => {
    const mockOn = jest.fn((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    });
    (spawn as jest.Mock).mockReturnValue({
      on: mockOn,
      stderr: { on: jest.fn() },
      stdout: { on: jest.fn() }
    });

    await actions.handleImplementTrack();

    expect(spawn).toHaveBeenCalledWith('gemini', ['/conductor:implement'], { stdio: 'inherit' });
  });
});
