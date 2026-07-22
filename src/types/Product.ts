export interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  stockQuantity: number;
  sku: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}
