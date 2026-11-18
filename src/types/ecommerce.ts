export type UserRole = 'customer' | 'admin' | 'super_admin';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  role: UserRole;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  color: string;
  priceNgn: number;
  sku: string;
  stockQty: number;
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  categoryId: string | null;
  categoryName?: string;
  categorySlug?: string;
  subcategoryId: string | null;
  subcategoryName?: string;
  subcategorySlug?: string;
  shortDescription: string;
  description: string;
  specifications: Record<string, string>;
  priceNgn: number;
  compareAtPriceNgn: number | null;
  availableColors: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isRecommended: boolean;
  isPublished: boolean;
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  stockAvailable: number;
  lowStockThreshold: number;
  images: ProductImage[];
  variants: ProductVariant[];
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productSlug: string;
  productImage: string;
  brand: string;
  selectedColor: string;
  selectedVariantName: string;
  unitPriceNgn: number;
  compareAtPriceNgn: number | null;
  quantity: number;
  stockAvailable: number;
}

export interface CustomerAddress {
  id: string;
  userId: string;
  label: string;
  fullName: string;
  phone: string;
  whatsappNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  additionalInfo: string;
  isDefault: boolean;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'abandoned' | 'refunded';
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'ready_for_delivery'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  productImage: string;
  selectedColor: string;
  selectedVariant: string;
  unitPriceNgn: number;
  quantity: number;
  lineTotalNgn: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerWhatsapp: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryNotes: string;
  couponCode: string | null;
  subtotalNgn: number;
  deliveryFeeNgn: number;
  discountNgn: number;
  totalNgn: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paystackReference: string | null;
  stockDeducted: boolean;
  stockRestored: boolean;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  paystackReference: string;
  amountKobo: number;
  currency: string;
  status: string;
  channel: string;
  gatewayResponse: string;
  verifiedAt: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  userId: string;
  orderId: string | null;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderNgn: number;
  maxDiscountNgn: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

export interface StoreSettings {
  storeName: string;
  whatsappNumber: string;
  supportEmail: string;
  supportPhone: string;
  storeAddress: string;
  instagramUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  freeDeliveryThresholdNgn: number;
  lagosDeliveryFeeNgn: number;
  nationwideDeliveryFeeNgn: number;
  paystackMode: 'live' | 'test_live_keys' | 'sandbox';
  paystackPublicKey: string;
  paystackPublicKeyConfigured: boolean;
}
