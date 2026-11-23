import DOMPurify from 'dompurify';

export const sanitizeInput = (text) => {
    if (typeof text !== 'string') return '';
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }).trim();
};