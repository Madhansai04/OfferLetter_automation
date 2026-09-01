/**
 * Fills a template string containing {{TOKEN}} placeholders and
 * {{#BLOCK}}...{{/BLOCK}} conditional sections.
 *
 * @param {string} template - raw template text
 * @param {Record<string, string>} values - placeholder token -> replacement text
 * @param {Record<string, boolean>} flags - block name -> whether to include it
 * @returns {string} rendered output
 */
export function renderTemplate(template, values, flags) {
  let output = template;

  for (const [blockName, shouldShow] of Object.entries(flags)) {
    const blockRegex = new RegExp(`{{#${blockName}}}([\\s\\S]*?){{/${blockName}}}`, 'g');
    output = output.replace(blockRegex, shouldShow ? '$1' : '');
  }

  output = output.replace(/{{(\w+)}}/g, (_match, token) => {
    return Object.prototype.hasOwnProperty.call(values, token) ? String(values[token]) : '';
  });

  return output;
}
