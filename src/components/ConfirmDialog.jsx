import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';

/**
 * Replaces window.confirm so destructive actions match the rest of the UI.
 * `tone` picks the accent on the confirm button: 'danger' or 'default'.
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onClose,
}) {
  const dangerStyle =
    tone === 'danger'
      ? { background: 'var(--hard-fg)', borderColor: 'transparent', color: '#ffffff', fontWeight: 600 }
      : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      labelId="confirm-dialog-title"
      footer={
        <>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={onClose} className="btn">
            {cancelLabel}
          </motion.button>
          <motion.button
            type="button"
            data-autofocus
            whileTap={{ scale: 0.95 }}
            onClick={onConfirm}
            className={tone === 'danger' ? 'btn' : 'btn btn-primary'}
            style={dangerStyle}
          >
            {confirmLabel}
          </motion.button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' ? (
          <span
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl"
            style={{ background: 'var(--hard-bg)', color: 'var(--hard-fg)' }}
          >
            <AlertTriangle size={17} aria-hidden="true" />
          </span>
        ) : null}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
      </div>
    </Modal>
  );
}
