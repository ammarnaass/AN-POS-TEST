import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { barcodePrintsApi } from '@/services/api/barcodePrintsApi';
import { triggerSystemPrint } from '../services/barcodePrintEngine';
import type { ProductLabelItem, PrintOptions } from '../types';

export function useBarcodePrintMutation() {
  const queryClient = useQueryClient();

  const savePrintMutation = useMutation({
    mutationFn: async ({
      items,
      opts,
    }: {
      items: ProductLabelItem[];
      opts: PrintOptions;
    }) => {
      await Promise.all(
        items.map((item) =>
          barcodePrintsApi.create({
            productId: item.product.id,
            barcode: item.barcode,
            labelSize: opts.labelSizeId,
            copies: item.copies,
            barcodeType: opts.barcodeFormat,
            showCompany: opts.showCompany,
            showProduct: opts.showProduct,
            showSku: opts.showSku,
            showPrice: opts.showPrice,
            showBarcode: opts.showBarcode,
            enlargePrice: opts.enlargePrice,
            printOptions: {},
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barcode-prints'] });
    },
    onError: (err: any) => {
      console.warn('Failed to save barcode print audit record:', err?.message);
    },
  });

  const handlePrint = useCallback(
    (labelItems: ProductLabelItem[], opts: PrintOptions) => {
      if (labelItems.length > 0) {
        savePrintMutation.mutate({ items: labelItems, opts });
      }
      triggerSystemPrint(250);
    },
    [savePrintMutation]
  );

  return {
    savePrintMutation,
    handlePrint,
    isSaving: savePrintMutation.isPending,
  };
}
