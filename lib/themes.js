// URL slug for a theme name: "Obesity & Metabolic" → "obesity-and-metabolic"
const themeSlug = (theme) => theme.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

module.exports = { themeSlug };
