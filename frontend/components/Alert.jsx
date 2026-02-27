import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const VARIANT_STYLES = {
  info: {
    container: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    icon: 'text-blue-400',
    IconComponent: Info,
  },
  warning: {
    container: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    icon: 'text-yellow-400',
    IconComponent: AlertTriangle,
  },
  error: {
    container: 'bg-red-500/10 border-red-500/30 text-red-300',
    icon: 'text-red-400',
    IconComponent: AlertCircle,
  },
  success: {
    container: 'bg-green-500/10 border-green-500/30 text-green-300',
    icon: 'text-green-400',
    IconComponent: CheckCircle,
  },
};

export default function Alert({
  variant = 'info',
  message,
  dismissible = true,
  onDismiss,
  className = ''
}) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      setTimeout(onDismiss, 300); // Wait for animation
    }
  };

  const { container, icon, IconComponent } = VARIANT_STYLES[variant] || VARIANT_STYLES.info;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`flex items-start gap-3 p-4 rounded-xl border ${container} ${className}`}
        >
          <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${icon}`} />
          <p className="text-sm leading-relaxed flex-1">{message}</p>
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
