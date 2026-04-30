import { useCallback, useEffect, useRef, useState } from 'react';

const defaultCloseDuration = 250;

type AnimatedModalOptions = {
  closeDuration?: number;
  onAfterClose?: () => void;
};

function useAnimatedModal({
  closeDuration = defaultCloseDuration,
  onAfterClose,
}: AnimatedModalOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeout.current !== null) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  }, []);
  // set isOpen to true and isClosing to false
  const open = useCallback(() => {
    clearCloseTimeout();
    setIsOpen(true);
    setIsClosing(false);
  }, [clearCloseTimeout]);

  // set isClosing to true and isOpen to false after the close duration
  const close = useCallback(() => {
    clearCloseTimeout();
    // Keep the modal mounted while the closing CSS animation runs.
    setIsClosing(true);

    closeTimeout.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimeout.current = null;
      onAfterClose?.();
    }, closeDuration);
  }, [clearCloseTimeout, closeDuration, onAfterClose]);

  // clear the close timeout when the component unmounts
  useEffect(() => clearCloseTimeout, [clearCloseTimeout]);

  return {
    close,
    isClosing,
    isOpen,
    open,
  };
}

export default useAnimatedModal;
