import { useId, useState } from 'react';
import type { FormHTMLAttributes, SubmitEvent, InputHTMLAttributes } from 'react';

/** Shared inline constraint feedback; domain validation stays in the API. */
export function Form({ children, onSubmit, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const errorId = useId();
  const [error, setError] = useState('');
  function clear(form: HTMLFormElement) {
    for (const field of form.querySelectorAll('[data-form-invalid]')) {
      field.removeAttribute('aria-invalid'); field.removeAttribute('data-form-invalid');
      const ids = (field.getAttribute('aria-describedby') ?? '').split(' ').filter(id => id && id !== errorId);
      if (ids.length) field.setAttribute('aria-describedby', ids.join(' ')); else field.removeAttribute('aria-describedby');
    }
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    clear(form);
    const fields = [...form.elements].filter((el): el is HTMLInputElement | HTMLSelectElement => el instanceof HTMLInputElement || el instanceof HTMLSelectElement);
    const invalid = fields.find(field => !field.disabled && (!field.validity.valid || (field.required && field.type !== 'checkbox' && !field.value.trim()) || (field instanceof HTMLInputElement && field.minLength > 0 && field.value.length > 0 && field.value.length < field.minLength)));
    if (invalid) {
      event.preventDefault();
      const name = invalid.getAttribute('aria-label') || invalid.labels?.[0]?.textContent?.trim() || 'This field';
      const message = invalid.type === 'checkbox' ? 'Please select this option to continue.' : invalid instanceof HTMLInputElement && invalid.minLength > 0 && invalid.value.length > 0 && invalid.value.length < invalid.minLength ? `Use at least ${invalid.minLength} characters.` : invalid.validity.valueMissing || !invalid.value.trim() ? 'Please fill in this field.' : 'Check this value and try again.';
      setError(`${name}: ${message}`);
      invalid.setAttribute('aria-invalid', 'true'); invalid.setAttribute('data-form-invalid', '');
      invalid.setAttribute('aria-describedby', [invalid.getAttribute('aria-describedby'), errorId].filter(Boolean).join(' '));
      invalid.focus(); return;
    }
    setError(''); void onSubmit?.(event);
  }
  return <form {...props} noValidate onSubmit={submit} onInput={event => { clear(event.currentTarget); setError(''); }}>
    {children}{error && <p className="error form-error" id={errorId} role="alert">{error}</p>}
  </form>;
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return <span className="password-field"><input {...props} type={shown ? 'text' : 'password'}/><button type="button" aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown} onClick={() => setShown(!shown)}>{shown ? 'Hide' : 'Show'}</button></span>;
}
