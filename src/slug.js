const slugify = require('slugify');

function makeSlug(text) {
  return slugify(text, { lower: true, strict: true, locale: 'tr' }).slice(0, 160) || 'konu';
}

module.exports = { makeSlug };
