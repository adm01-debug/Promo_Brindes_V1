export interface ProductColor {
  variantId?: string;
  name: string;
  hex: string;
  imageUrl?: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description: string;
  shortDescription: string;
  imageUrl: string;
  images: string[];
  categoryId: string | null;
  mainCategoryId: string | null;
  brand: string | null;
  minQuantity: number;
  isNew: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isKit: boolean;
  allowsPersonalization: boolean;
  hasCommercialPackaging: boolean;
  colors: ProductColor[];
  materials: string[];
  dimensions: {
    widthCm?: number;
    heightCm?: number;
    lengthCm?: number;
    weightG?: number;
    capacityMl?: number;
  };
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface QuoteItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  imageUrl: string;
  quantity: number;
  minQuantity: number;
  colorName?: string;
  colorHex?: string;
}

export interface QuoteContact {
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  deadline: string;
  notes: string;
  privacyAccepted: boolean;
}

export interface QuoteRequestPayload {
  contact: Omit<QuoteContact, 'privacyAccepted'>;
  items: QuoteItem[];
  consent: PrivacyConsentReceipt;
  source: 'site-promo-brindes';
  submittedAt: string;
  pageUrl: string;
  clientRequestId: string;
}

export interface ContactLead {
  name: string;
  email: string;
  phone: string;
  privacyAccepted: boolean;
}

export interface ContactRequestPayload {
  contact: Omit<ContactLead, 'privacyAccepted'>;
  consent: PrivacyConsentReceipt;
  source: 'site-promo-brindes-contact';
  submittedAt: string;
  pageUrl: string;
  clientRequestId: string;
}

export interface PrivacyConsentReceipt {
  accepted: boolean;
  noticeVersion: '2026-09-08';
  acceptedAt: string;
}
