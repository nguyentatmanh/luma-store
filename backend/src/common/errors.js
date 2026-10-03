export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function notFound(message = 'Không tìm thấy sản phẩm.') {
  return new AppError(404, 'NOT_FOUND', message);
}

export function validationError(fields) {
  return new AppError(422, 'VALIDATION_ERROR', 'Vui lòng kiểm tra thông tin đã nhập.', fields);
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let problem = error;
  if (error.code === 'ER_DUP_ENTRY') {
    problem = new AppError(409, 'DUPLICATE_SKU', 'Mã SKU đã được sử dụng.', { sku: 'Chọn một mã SKU khác.' });
  } else if (error.type === 'entity.parse.failed') {
    problem = new AppError(400, 'INVALID_JSON', 'Dữ liệu JSON không hợp lệ.');
  } else if (error.type === 'entity.too.large') {
    problem = new AppError(413, 'BODY_TOO_LARGE', 'Dữ liệu JSON vượt quá giới hạn 64 KB.');
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    problem = new AppError(413, 'FILE_TOO_LARGE', 'Ảnh vượt quá giới hạn 8 MB.');
  } else if (error.name === 'MulterError') {
    problem = new AppError(422, 'INVALID_UPLOAD', 'Chỉ tải lên một ảnh trong trường image.');
  }
  if (!(problem instanceof AppError)) {
    console.error(JSON.stringify({ event: 'error', requestId: req.requestId, message: error.message }));
    problem = new AppError(500, 'INTERNAL_ERROR', 'Chưa thể xử lý yêu cầu. Vui lòng thử lại.');
  }
  res.status(problem.status).json({
    error: { code: problem.code, message: problem.message, ...(problem.fields && { fields: problem.fields }) },
    meta: { serverId: req.serverId, requestId: req.requestId },
  });
}
