import { describe, it, expect } from 'vitest';
import { stripThinking, stripFences, extractJSON } from './minimaxClient';

describe('stripThinking', () => {
  it('removes <think> blocks and trailing whitespace', () => {
    const input = '<think> Thinking about the answer here...</think>\nSome real content';
    expect(stripThinking(input)).toBe('Some real content');
  });

  it('handles text without <think> blocks', () => {
    const input = 'Plain JSON content without think blocks';
    expect(stripThinking(input)).toBe('Plain JSON content without think blocks');
  });

  it('handles empty string', () => {
    expect(stripThinking('')).toBe('');
  });
});

describe('stripFences', () => {
  it('strips ```json fences and extracts JSON object', () => {
    const input = '```json\n{"ok": true}\n```';
    expect(stripFences(input)).toBe('{"ok": true}');
  });

  it('strips triple-backtick fences', () => {
    const input = '```\n{"key": "value"}\n```';
    expect(stripFences(input)).toBe('{"key": "value"}');
  });

  it('extracts JSON from trailing text after code fence', () => {
    const input = '```json\n{"ok": true}\n```\n\nAI: here is more text';
    expect(stripFences(input)).toBe('{"ok": true}');
  });

  it('extracts JSON object from text with leading/trailing content', () => {
    const input = 'Some explanation\n{"key": "value"}\nmore text';
    expect(stripFences(input)).toBe('{"key": "value"}');
  });

  it('handles plain JSON without fences', () => {
    const input = '{"key": "value"}';
    expect(stripFences(input)).toBe('{"key": "value"}');
  });

  it('handles empty string', () => {
    expect(stripFences('')).toBe('');
  });
});

describe('extractJSON', () => {
  it('full pipeline: strips think blocks, fences, extracts JSON', () => {
    const input = '<think> thinking...</think>\n```json\n{"result": 42}\n```';
    expect(extractJSON(input)).toBe('{"result": 42}');
  });

  it('handles JSON with trailing non-JSON text', () => {
    const input = '{"ok": true}\n\nAI: some explanation';
    expect(extractJSON(input)).toBe('{"ok": true}');
  });
});