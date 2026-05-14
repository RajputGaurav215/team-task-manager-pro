import { ZodError } from 'zod';

export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
}

export function errorHandler(error, req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      requestId: req.requestId,
      errors: error.errors.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
    });
  }

  if (error.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Duplicate value found.', requestId: req.requestId });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found.', requestId: req.requestId });
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational || statusCode < 500 ? error.message : 'Something went wrong on the server.';

  console.error({
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
  });

  res.status(statusCode).json({ success: false, message, requestId: req.requestId });
}
