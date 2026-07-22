import JsBarcode from 'jsbarcode';

export const BarcodeService = {
  /**
   * Generates a base64 Data URL for a barcode
   */
  generateBarcodeDataUrl: (value: string, format: string = 'CODE128'): string | null => {
    if (!value) return null;
    
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, value, {
        format,
        displayValue: true,
        height: 50,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000'
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to generate barcode:', error);
      return null;
    }
  }
};
