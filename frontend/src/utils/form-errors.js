export function getFieldErrors(details) {
  return details.reduce((errors, detail) => {
    if (typeof detail?.field === 'string' && typeof detail?.message === 'string') {
      errors[detail.field] = detail.message;
    }

    return errors;
  }, {});
}

export function focusFirstInvalidField(form, errors) {
  const firstInvalidField = Object.keys(errors).find((field) => errors[field]);

  if (!firstInvalidField) {
    return;
  }

  const focusField = () => {
    const control = form.elements.namedItem(firstInvalidField);
    const focusTarget = typeof control?.focus === 'function' ? control : control?.[0];
    focusTarget?.focus();
  };

  // Attendiamo il render degli errori e la riattivazione degli eventuali fieldset disabilitati.
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(focusField);
  } else {
    window.setTimeout(focusField, 0);
  }
}
