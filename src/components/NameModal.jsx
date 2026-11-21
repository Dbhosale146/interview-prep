import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Modal from './Modal.jsx';

/** Single-field dialog used to add or rename a topic or subtopic. */
export default function NameModal({ open, title, subtitle, label, placeholder, initialValue = '', confirmLabel = 'Create', onSubmit, onClose }) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError('');
    }
  }, [open, initialValue]);

  const submit = (event) => {
    event?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="sm"
      labelId="name-modal-title"
      footer={
        <>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={onClose} className="btn">
            Cancel
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={submit} className="btn btn-primary">
            {confirmLabel}
          </motion.button>
        </>
      }
    >
      <form onSubmit={submit}>
        <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
        <input
          data-autofocus
          className="field"
          value={value}
          placeholder={placeholder}
          maxLength={60}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError('');
          }}
        />
        {error ? (
          <p className="mt-2 text-xs" style={{ color: 'var(--hard-fg)' }}>
            {error}
          </p>
        ) : null}
        {/* Lets Enter submit without a visible second button. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
