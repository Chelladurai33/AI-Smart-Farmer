/**
 * Standard API response helpers.
 * All responses follow: { success, message, data, error }
 */

const sendSuccess = (res, data = null, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null,
  });
};

const sendError = (res, error = 'Internal server error', statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message: getMessageForStatus(statusCode),
    data: null,
    error: typeof error === 'string' ? error : error.message || 'Internal server error',
  });
};

const sendValidationError = (res, errors) => {
  const formatted = Object.entries(errors)
    .map(([field, msgs]) => {
      const msgList = Array.isArray(msgs) ? msgs.join(', ') : msgs;
      return `${field}: ${msgList}`;
    })
    .join(' | ');

  return res.status(400).json({
    success: false,
    message: 'Validation Failed',
    data: null,
    error: formatted ? `Validation failed - ${formatted}` : 'One or more fields are invalid.',
    errors,
  });
};

const getMessageForStatus = (status) => {
  const map = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    413: 'Payload Too Large',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
  };
  return map[status] || 'Error';
};

module.exports = { sendSuccess, sendError, sendValidationError };
