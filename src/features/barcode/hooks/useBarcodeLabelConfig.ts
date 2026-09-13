import { useState, useMemo, useCallback } from 'react';
import type { PrintOptions, LabelSize } from '../types';
import { LABEL_SIZES, DEFAULT_PRINT_OPTIONS } from '../constants/labelConfigs';

export function useBarcodeLabelConfig() {
  const [opts, setOpts] = useState<PrintOptions>(DEFAULT_PRINT_OPTIONS);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(100);

  const updateOpts = useCallback((partial: Partial<PrintOptions>) => {
    setOpts((prev) => ({ ...prev, ...partial }));
  }, []);

  const labelSize: LabelSize = useMemo(() => {
    return LABEL_SIZES.find((l) => l.id === opts.labelSizeId) ?? LABEL_SIZES[1];
  }, [opts.labelSizeId]);

  const zoomIn = useCallback(() => {
    setPreviewZoom((z) => Math.min(160, z + 15));
  }, []);

  const zoomOut = useCallback(() => {
    setPreviewZoom((z) => Math.max(50, z - 15));
  }, []);

  return {
    opts,
    setOpts,
    updateOpts,
    labelSize,
    previewVisible,
    setPreviewVisible,
    showHistory,
    setShowHistory,
    previewZoom,
    setPreviewZoom,
    zoomIn,
    zoomOut,
  };
}
