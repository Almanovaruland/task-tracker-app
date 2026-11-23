const validator = require('validator');

const sanitizeFreetext = (input, maxLength = 500) => {
    if (typeof input !== 'string') return '';

    let clean = input;
    // Hapus karakter kontrol ASCII berbahaya (pertahankan newline \n)
    clean = validator.stripLow(clean, true);
    // Hapus spasi berlebih di awal dan akhir
    clean = clean.trim();
    // Escape entitas HTML (<, >, &, ', ")
    clean = validator.escape(clean);
    // Batasi panjang maksimal string
    clean = clean.substring(0, maxLength);

    return clean;
};

module.exports = { sanitizeFreetext };