import { describe, it, expect } from 'vitest';
import { renderTemplate } from './renderTemplate.js';

describe('renderTemplate', () => {
  it('substitutes simple placeholders', () => {
    const template = 'Hello {{NAME}}, your role is {{ROLE}}.';
    const result = renderTemplate(template, { NAME: 'Jane', ROLE: 'Engineer' }, {});
    expect(result).toBe('Hello Jane, your role is Engineer.');
  });

  it('leaves an unmatched placeholder blank rather than throwing', () => {
    const template = 'Value: {{MISSING}}';
    const result = renderTemplate(template, {}, {});
    expect(result).toBe('Value: ');
  });

  it('includes a conditional block when its flag is true', () => {
    const template = 'Before {{#SHOW}}Middle{{/SHOW}} After';
    const result = renderTemplate(template, {}, { SHOW: true });
    expect(result).toBe('Before Middle After');
  });

  it('excludes a conditional block when its flag is false', () => {
    const template = 'Before {{#SHOW}}Middle{{/SHOW}} After';
    const result = renderTemplate(template, {}, { SHOW: false });
    expect(result).toBe('Before  After');
  });

  it('substitutes placeholders inside an included conditional block', () => {
    const template = '{{#SHOW}}Amount: {{AMOUNT}}{{/SHOW}}';
    const result = renderTemplate(template, { AMOUNT: '100' }, { SHOW: true });
    expect(result).toBe('Amount: 100');
  });

  it('handles multiple independent conditional blocks', () => {
    const template = '{{#A}}A-shown{{/A}}{{#B}}B-shown{{/B}}';
    const result = renderTemplate(template, {}, { A: true, B: false });
    expect(result).toBe('A-shown');
  });
});
