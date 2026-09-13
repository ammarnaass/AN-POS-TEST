import React from 'react';
import type { ProductLabelItem, LabelSize, PrintOptions } from '../types';
import { BarcodeSvg } from './BarcodeSvg';
import { formatLabelPrice } from '../services/barcodePrintEngine';

interface BarcodeLabelItemCardProps {
  item: ProductLabelItem;
  labelSize: LabelSize;
  opts: PrintOptions;
  shopName: string;
  baseCurrency: string;
}

export const BarcodeLabelItemCard: React.FC<BarcodeLabelItemCardProps> = ({
  item,
  labelSize,
  opts,
  shopName,
  baseCurrency,
}) => {
  const barcodeHeight = Math.max(16, labelSize.height - (opts.showPrice ? 16 : 10));

  return (
    <div
      className={`label-card flex flex-col items-center justify-between p-1 bg-white text-black text-center box-border overflow-hidden select-none ${
        opts.showBorder ? 'border border-dashed border-zinc-400' : 'border border-transparent'
      }`}
      style={{
        width: `${labelSize.width}mm`,
        height: `${labelSize.height}mm`,
      }}
    >
      {/* Shop Name */}
      {opts.showCompany && (
        <span className="text-[7.5px] font-bold text-black text-center truncate w-full leading-tight">
          {shopName}
        </span>
      )}

      {/* Product Name */}
      {opts.showProduct && (
        <span className="text-[8.5px] font-bold text-black text-center truncate w-full leading-tight">
          {item.product.name}
        </span>
      )}

      {/* SKU */}
      {opts.showSku && item.product.sku && (
        <span className="text-[7px] text-zinc-700 font-mono truncate w-full">
          SKU: {item.product.sku}
        </span>
      )}

      {/* Barcode / QR Visual Render */}
      <div className="my-auto flex items-center justify-center w-full max-w-full overflow-hidden">
        <BarcodeSvg
          value={item.barcode}
          format={opts.barcodeFormat}
          height={barcodeHeight}
        />
      </div>

      {/* Human-readable code */}
      {opts.showBarcode && opts.barcodeFormat !== 'qr' && (
        <span className="text-[7.5px] font-mono font-bold text-black tracking-wider leading-none">
          {item.barcode}
        </span>
      )}

      {/* Price Tag */}
      {opts.showPrice && (
        <span
          className={`font-bold text-black leading-tight ${
            opts.enlargePrice ? 'text-[13px] font-cairo' : 'text-[9.5px]'
          }`}
        >
          {formatLabelPrice(item.product.retailPrice, baseCurrency)}
        </span>
      )}
    </div>
  );
};
