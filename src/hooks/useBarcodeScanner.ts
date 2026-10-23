import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxKeystrokeIntervalMs?: number; // Maximum ms between keystrokes typical of hardware scanners
  isEnabled?: boolean;
}

/**
 * Global Hardware Barcode Scanner Hook
 * Listens at the window level for rapid keystroke bursts from USB/Bluetooth HID scanners,
 * intercepts the carriage return (Enter key), prevents default form submit, and triggers onScan.
 */
export function useBarcodeScanner({
  onScan,
  minChars = 4,
  maxKeystrokeIntervalMs = 75,
  isEnabled = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isEnabled) return;

      const currentTime = performance.now();
      const timeSinceLastKey = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // When 'Enter' is received, check if we accumulated a valid barcode burst
      if (e.key === 'Enter') {
        const candidateBarcode = bufferRef.current.trim();
        if (candidateBarcode.length >= minChars) {
          // Prevent standard form submission triggered by hardware carriage return
          e.preventDefault();
          e.stopPropagation();

          // Trigger matched lookup
          onScanRef.current(candidateBarcode);

          // Clear buffer
          bufferRef.current = '';
          return;
        } else {
          // Normal human enter press on an input or button; reset buffer
          bufferRef.current = '';
          return;
        }
      }

      // If typing speed is slower than maxKeystrokeIntervalMs and buffer is already accumulating,
      // reset buffer to avoid polluting with manual slow human typing
      if (timeSinceLastKey > maxKeystrokeIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      // Collect printable alphanumeric barcode characters (digits, uppercase letters)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    },
    [isEnabled, minChars, maxKeystrokeIntervalMs]
  );

  useEffect(() => {
    if (!isEnabled) return;
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isEnabled, handleKeyDown]);

  // Utility method to simulate hardware scan programmatically for testing
  const simulateScan = useCallback((barcode: string) => {
    onScanRef.current(barcode);
  }, []);

  return { simulateScan };
}
