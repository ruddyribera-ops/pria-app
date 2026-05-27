export function errorHandler(err: any, req: any, res: any, next: any) {
  console.error('❌', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno',
    ...(err.details ? { details: err.details } : {}),
  });
}