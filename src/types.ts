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
  /** Identificador publicado da variante, quando a pessoa escolhe uma cor específica. */
  variantId?: string;
  colorName?: string;
  colorHex?: string;
  /** A variante referenciada pelo link não está mais publicada; não deve ser enviada sem revisão. */
  variantUnavailable?: boolean;
  /** O produto de uma solicitação anterior não está mais no catálogo público. */
  productUnavailable?: boolean;
  /** Referência principal ou alternativa para facilitar a decisão comercial. */
  decisionGroup?: 'primary' | 'alternative';
}

export type CampaignMoment = 'onboarding' | 'evento' | 'relacionamento' | 'reconhecimento' | 'sazonal';
export type CampaignAudience = 'clientes' | 'colaboradores' | 'lideranca' | 'parceiros' | 'publico-evento';
export type CampaignScale = 'ate-50' | '51-200' | '201-500' | '500-mais';
export type CampaignMood = 'util' | 'premium' | 'sustentavel' | 'tech' | 'afetivo' | 'divertido';

/** Contexto sem dados pessoais, reaproveitado entre descoberta, seleção e briefing. */
export interface CampaignBrief {
  source: 'finder' | 'commemorative_date';
  moment?: CampaignMoment;
  audience?: CampaignAudience;
  scale?: CampaignScale;
  mood?: CampaignMood;
  occasion?: {
    id: string;
    name: string;
    date: string;
  };
}

export type QuoteBudgetRange = 'ate-25' | '26-50' | '51-100' | '101-200' | 'acima-200' | 'a-definir';
export type QuoteBudgetScope = 'por-pessoa' | 'total';
export type QuoteResponseChannel = 'whatsapp' | 'email' | 'telefone' | 'sem-preferencia';
export type QuoteBrandAssetStatus = 'logo-pronto' | 'identidade-em-criacao' | 'preciso-de-ajuda';
export type QuoteDeadlineFlexibility = 'flexivel' | 'data-fixa';

/** Informações opcionais que tornam a curadoria mais objetiva, sem criar obrigação comercial. */
export interface QuoteBriefingDetails {
  actionName?: string;
  budgetRange?: QuoteBudgetRange;
  budgetScope?: QuoteBudgetScope;
  eventDate?: string;
  deadlineFlexibility?: QuoteDeadlineFlexibility;
  responseChannel?: QuoteResponseChannel;
  brandAssetStatus?: QuoteBrandAssetStatus;
}

/** Forma de edição local: campos vazios ainda não fazem parte do payload. */
export interface QuoteBriefingForm {
  actionName: string;
  budgetRange: QuoteBudgetRange | '';
  budgetScope: QuoteBudgetScope | '';
  eventDate: string;
  deadlineFlexibility: QuoteDeadlineFlexibility | '';
  responseChannel: QuoteResponseChannel | '';
  brandAssetStatus: QuoteBrandAssetStatus | '';
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
  whatsappCopyAccepted: boolean;
}

export interface QuoteRequestPayload {
  contact: Omit<QuoteContact, 'privacyAccepted' | 'whatsappCopyAccepted'>;
  items: QuoteItem[];
  campaign?: CampaignBrief;
  briefing?: QuoteBriefingDetails;
  consent: PrivacyConsentReceipt;
  source: 'site-promo-brindes';
  submittedAt: string;
  pageUrl: string;
  clientRequestId: string;
  notificationPreferences: {
    emailCopy: true;
    whatsappCopy: boolean;
  };
}

export interface ContactLead {
  name: string;
  email: string;
  phone: string;
  message: string;
  responseChannel: QuoteResponseChannel | '';
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
