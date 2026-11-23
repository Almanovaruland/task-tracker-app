const errorHandler = (err, req, res, next) => {
    console.error(`[EXPRESS ERROR] ${req.method} ${req.originalUrl}:`, err);
    console.log("error tes",err.code)

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
            code: 'DUPLICATE_ENTRY',
            message: 'Data duplikat terdeteksi. Item yang sama sudah terdaftar.'
        });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(404).json({
            code: 'REFERENCE_NOT_FOUND',
            message: 'Data referensi (Project atau User) tidak ditemukan.'
        });
    }

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            code: 'INVALID_JSON',
            message: 'Format JSON pada request body tidak valid.'
        });
    }

    const statusCode = err.statusCode || 500;
    const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'Terjadi kesalahan internal pada server.';

    res.status(statusCode).json({
        code: errorCode,
        message: message
    });
};

module.exports = { errorHandler };