export function getFieldErrors(details) {
  return details.reduce((errors, detail) => {
    if (typeof detail?.field === 'string' && typeof detail?.message === 'string') {
      errors[detail.field] = detail.message;
    }

    return errors;
  }, {});
}
