// Mock Document Context Generator — POS-PRINT-001 / FR-004
// يولد بيانات محاكاة واقعية وغنية 100% لجميع أنواع الوثائق العشرة لدعم المعاينة الكاملة دون نقص
import type {
  PrintTemplate,
  DocumentContext,
  ShopLegalInfo,
  PrintLanguage,
  DocTypeKey,
} from '@/types/invoicePrint';

interface StoreSettingsPartial {
  shopName?: string;
  phone?: string;
  shopPhone2?: string;
  email?: string;
  shopEmail?: string;
  shopAddress?: string;
  address?: string;
  receiptFooter?: string;
  commercialRegister?: string;
  companyRC?: string;
  companyNif?: string;
  taxNumber?: string;
  taxId?: string;
  companyAI?: string;
  companyArt?: string;
  taxArticle?: string;
  shopLogo?: string;
  logo?: string;
}

/**
 * بناء سياق مستند كامل وواقعي بحسب نوع الوثيقة واللغة وإعدادات المتجر
 */
export function buildMockDocumentContext(
  template: PrintTemplate,
  settings?: StoreSettingsPartial | null,
  docType: DocTypeKey = 'wholesale-invoice',
  lang: PrintLanguage = 'ar',
): DocumentContext {
  const isRtl = lang === 'ar' || lang === 'ar-fr';
  const today = new Date().toISOString().split('T')[0];

  const shopLegal: ShopLegalInfo = {
    name: settings?.shopName || (isRtl ? 'مؤسسة البركة للتجارة والتوزيع' : 'Ets El Baraka Distribution'),
    phone: settings?.phone || settings?.shopPhone2 || '023 45 67 89 / 0550 11 22 33',
    email: settings?.email || settings?.shopEmail || 'contact@elbaraka-pos.dz',
    address: settings?.shopAddress || settings?.address || (isRtl ? 'المنطقة التجارية، شارع فلسطين، الجزائر' : 'Zone Commerciale, Rue Palestine, Alger'),
    footer: settings?.receiptFooter || (isRtl ? 'شكراً لتعاملكم معنا · البضاعة تسلم بحالة جيدة معتمدة' : 'Merci pour votre confiance · Marchandise livrée en bon état'),
    commercialRegister: settings?.commercialRegister || settings?.companyRC || '16/00-1234567B22',
    nif: settings?.companyNif || settings?.taxNumber || settings?.taxId || '002216012345678',
    ai: settings?.companyAI || settings?.companyArt || settings?.taxArticle || '16012345678',
    taxNumber: settings?.taxNumber || settings?.taxId || '002216012345678',
    logo: settings?.shopLogo || settings?.logo || '',
  };

  const user = {
    id: 'usr-mock-1',
    name: isRtl ? 'أحمد بن علي (مسؤول المبيعات)' : 'Ahmed Benali (Commercial)',
    role: 'sales_manager',
  };

  // توليد بيانات الفاتورة المخصصة حسب نوع المستند
  let invoice: Record<string, unknown>;

  switch (docType) {
    case 'wholesale-invoice':
      invoice = {
        number: 'FAC-GR-2026-0042',
        date: today,
        customerName: isRtl ? 'مؤسسة النور لتوزيع المواد الغذائية (ش.ذ.م.م)' : 'SARL El Nour Agro Distribution',
        customerPhone: '0561 23 45 67',
        customerAddress: isRtl ? 'المنطقة الصناعية، الرويبة، الجزائر' : 'Zone Industrielle, Rouiba, Alger',
        customerRc: '16/00-0987654B20',
        customerNif: '002016098765432',
        customerNis: '0016123400098',
        customerAi: '16280045612',
        paymentMethod: isRtl ? 'شيك بنكي / آجل 30 يوم' : 'Chèque / À terme (30 jours)',
        formerBalance: 125000,
        paidAmount: 50000,
        subtotal: 63440,
        discount: 1000,
        tvaAmount: 0,
        total: 62440,
        newBalance: 137440,
        items: [
          {
            sku: 'REF-OIL-01',
            name: isRtl ? 'زيت المائدة العافية 5 لتر (كرتونة 4 قارورات)' : 'Huile de Table El Afia 5L (Carton 4)',
            packUnit: isRtl ? 'كرتونة 4' : 'Carton 4',
            packQty: 10,
            qty: 40,
            unitPrice: 620,
            discount: 500,
            lineTotal: 24300,
            batchNumber: 'LOT-2026-A12',
          },
          {
            sku: 'REF-SUG-02',
            name: isRtl ? 'سكر أبيض سيفيتال 1 كغ (حزمة 10 كغ)' : 'Sucre Blanc Cevital 1kg (Fardeau 10)',
            packUnit: isRtl ? 'حزمة 10' : 'Fardeau 10',
            packQty: 15,
            qty: 150,
            unitPrice: 88,
            discount: 200,
            lineTotal: 13000,
            batchNumber: 'LOT-2026-S04',
          },
          {
            sku: 'REF-PAS-03',
            name: isRtl ? 'عجائن سيم كسكسي 1 كغ (صندوق 12 كغ)' : 'Couscous Sim Moyen 1kg (Caisse 12)',
            packUnit: isRtl ? 'صندوق 12' : 'Caisse 12',
            packQty: 8,
            qty: 96,
            unitPrice: 115,
            discount: 0,
            lineTotal: 11040,
            batchNumber: 'LOT-2026-C88',
          },
          {
            sku: 'REF-TOM-04',
            name: isRtl ? 'طماطم مصبرة عمور 800 غ (كرتونة 12 علبة)' : 'Tomate Concentrée Amor 800g (Carton 12)',
            packUnit: isRtl ? 'كرتونة 12' : 'Carton 12',
            packQty: 5,
            qty: 60,
            unitPrice: 240,
            discount: 300,
            lineTotal: 14100,
            batchNumber: 'LOT-2026-T15',
          },
        ],
      };
      break;

    case 'bl':
      invoice = {
        number: 'BL-2026-0189',
        date: today,
        customerName: isRtl ? 'مؤسسة الأمل للمقاولات والبناء' : 'Entreprise El Amal BTP SARL',
        customerPhone: '0555 98 76 54',
        customerAddress: isRtl ? 'حي البساتين، بومرداس' : 'Cité El Bassatine, Boumerdès',
        customerRc: '35/00-1122334B',
        customerNif: '001535011223344',
        customerNis: '0015350009876',
        customerAi: '35010045678',
        paymentMethod: isRtl ? 'تسليم موقع / وصل استلام' : 'Livraison sur site',
        formerBalance: 40000,
        paidAmount: 0,
        subtotal: 45600,
        discount: 0,
        tvaAmount: 0,
        total: 45600,
        newBalance: 85600,
        items: [
          {
            sku: 'MAT-CIM-01',
            name: isRtl ? 'إسمنت بورتلاندي CPJ 42.5 (كيس 50 كغ)' : 'Ciment Portland CPJ 42.5 (Sac 50kg)',
            packUnit: isRtl ? 'كيس 50 كغ' : 'Sac 50kg',
            packQty: 40,
            qty: 40,
            unitPrice: 650,
            discount: 0,
            lineTotal: 26000,
            batchNumber: 'LOT-CIM-99',
          },
          {
            sku: 'MAT-STL-02',
            name: isRtl ? 'حديد تسليح قطري 12 ملم (حزمة 1 طن)' : 'Rond à Béton 12mm (Botte 1T)',
            packUnit: isRtl ? 'حزمة 1 طن' : 'Botte 1T',
            packQty: 1,
            qty: 1,
            unitPrice: 19600,
            discount: 0,
            lineTotal: 19600,
            batchNumber: 'LOT-STL-03',
          },
        ],
      };
      break;

    case 'customer-statement':
    case 'supplier-statement': {
      const isCust = docType === 'customer-statement';
      invoice = {
        number: isCust ? 'EXT-CLI-2026-0512' : 'EXT-FRS-2026-0104',
        date: today,
        customerName: isCust
          ? (isRtl ? 'شركة الأفق للمقاولات والتجارة' : 'Société Horizon BTP SARL')
          : (isRtl ? 'مجمع مطاحن الهضاب العليا' : 'Complexe Minoterie des Hauts Plateaux'),
        customerPhone: '0550 44 33 22',
        customerAddress: isRtl ? 'المنطقة الحضرية الجديدة، سطيف' : 'Nouvelle Zone Urbaine, Sétif',
        customerRc: '19/00-0045612B',
        customerNif: '001919004561234',
        customerNis: '0019190001234',
        customerAi: '19010078912',
        paymentMethod: isRtl ? 'كشف حركات الحساب الجاري' : 'Relevé de compte courant',
        formerBalance: 25000,
        paidAmount: 70000,
        subtotal: 117500,
        discount: 0,
        tvaAmount: 0,
        total: 47500,
        newBalance: 47500,
        items: [
          {
            sku: 'FAC-0031',
            name: isRtl ? 'فاتورة بيع رقم FAC-2026-0031 (بضاعة عامة)' : 'Facture N° FAC-2026-0031',
            packUnit: isRtl ? 'مدين (+)' : 'Débit (+)',
            packQty: 1,
            qty: 1,
            unitPrice: 85000,
            discount: 0,
            lineTotal: 85000,
            batchNumber: '2026-08-15',
          },
          {
            sku: 'VST-0104',
            name: isRtl ? 'دفعة نقدية بالصندوق وصل قبض رقم VST-104' : 'Versement Espèces Reçu N° VST-104',
            packUnit: isRtl ? 'دائن (-)' : 'Crédit (-)',
            packQty: 1,
            qty: 1,
            unitPrice: -40000,
            discount: 0,
            lineTotal: -40000,
            batchNumber: '2026-08-20',
          },
          {
            sku: 'FAC-0089',
            name: isRtl ? 'فاتورة بيع رقم FAC-2026-0089 (شحنة ثانية)' : 'Facture N° FAC-2026-0089',
            packUnit: isRtl ? 'مدين (+)' : 'Débit (+)',
            packQty: 1,
            qty: 1,
            unitPrice: 32500,
            discount: 0,
            lineTotal: 32500,
            batchNumber: '2026-08-28',
          },
          {
            sku: 'CHQ-0098',
            name: isRtl ? 'سداد شيك بنكي BNA رقم 009845' : 'Règlement Chèque BNA N° 009845',
            packUnit: isRtl ? 'دائن (-)' : 'Crédit (-)',
            packQty: 1,
            qty: 1,
            unitPrice: -30000,
            discount: 0,
            lineTotal: -30000,
            batchNumber: '2026-09-02',
          },
        ],
      };
      break;
    }

    case 'devis':
      invoice = {
        number: 'DEV-2026-0074',
        date: today,
        customerName: isRtl ? 'مؤسسة الصفا والمروة التجارية' : 'Ets Safa & Marwa Commerce',
        customerPhone: '0661 77 88 99',
        customerAddress: isRtl ? 'الجزائر الوسطى، الجزائر' : 'Alger Centre, Alger',
        customerRc: '16/00-8877665B',
        customerNif: '001816088776655',
        customerNis: '0018160009988',
        customerAi: '16020088991',
        paymentMethod: isRtl ? 'عرض سعر (صالح لمدة 15 يوماً)' : 'Devis estimatif (Validité 15j)',
        formerBalance: 0,
        paidAmount: 0,
        subtotal: 54000,
        discount: 2000,
        tvaAmount: 9880,
        total: 61880,
        newBalance: 61880,
        items: [
          {
            sku: 'INF-PC-01',
            name: isRtl ? 'حاسوب مكتبي متكامل Core i5 الجيل 12 مع شاشة 24 بوصة' : 'PC Bureau Core i5 12th Gen + Écran 24"',
            packUnit: isRtl ? 'جهاز كامل' : 'Unité complète',
            packQty: 1,
            qty: 1,
            unitPrice: 48000,
            discount: 2000,
            lineTotal: 46000,
            batchNumber: 'WAR-12M',
          },
          {
            sku: 'PRN-POS-80',
            name: isRtl ? 'طابعة إيصالات حرارية 80 ملم USB/LAN عالية السرعة' : 'Imprimante Ticket Thermique 80mm USB/LAN',
            packUnit: isRtl ? 'قطعة' : 'Pièce',
            packQty: 1,
            qty: 1,
            unitPrice: 6000,
            discount: 0,
            lineTotal: 6000,
            batchNumber: 'WAR-12M',
          },
        ],
      };
      break;

    case 'proforma':
      invoice = {
        number: 'PRO-2026-0029',
        date: today,
        customerName: isRtl ? 'شركة البنيان للاستيراد والتصدير' : 'El Bonyane Import Export SARL',
        customerPhone: '0540 12 34 56',
        customerAddress: isRtl ? 'حي الأعمال باب الزوار، الجزائر' : 'Quartier des Affaires, Bab Ezzouar',
        customerRc: '16/00-7766554B',
        customerNif: '001916077665544',
        customerNis: '0019160001234',
        customerAi: '16120034567',
        paymentMethod: isRtl ? 'فاتورة أولية لتحويل بنكي' : 'Facture Proforma pour virement',
        formerBalance: 0,
        paidAmount: 0,
        subtotal: 78000,
        discount: 3000,
        tvaAmount: 14250,
        total: 89250,
        newBalance: 89250,
        items: [
          {
            sku: 'EQP-SER-01',
            name: isRtl ? 'خادم شبكي محلي Dell PowerEdge T150' : 'Serveur Réseau Dell PowerEdge T150',
            packUnit: isRtl ? 'وحدة' : 'Unité',
            packQty: 1,
            qty: 1,
            unitPrice: 65000,
            discount: 3000,
            lineTotal: 62000,
            batchNumber: 'SN-DELL-9921',
          },
          {
            sku: 'NET-SW-24',
            name: isRtl ? 'موزع شبكة سويتش Cisco Gigabit 24 منفذ' : 'Switch Cisco Gigabit 24 Ports',
            packUnit: isRtl ? 'قطعة' : 'Pièce',
            packQty: 1,
            qty: 1,
            unitPrice: 13000,
            discount: 0,
            lineTotal: 13000,
            batchNumber: 'SN-CISCO-881',
          },
        ],
      };
      break;

    case 'return-invoice':
      invoice = {
        number: 'RET-2026-0015',
        date: today,
        customerName: isRtl ? 'كريم بن علي (زبون مرتجع)' : 'Karim Benali (Retour)',
        customerPhone: '0550 12 34 56',
        customerAddress: isRtl ? 'الجزائر العاصمة' : 'Alger Centre',
        customerRc: '',
        customerNif: '',
        customerNis: '',
        customerAi: '',
        paymentMethod: isRtl ? 'استرجاع نقدي بالصندوق' : 'Remboursement Espèces Caisse',
        formerBalance: 0,
        paidAmount: 2400,
        subtotal: 2400,
        discount: 0,
        tvaAmount: 0,
        total: 2400,
        newBalance: 0,
        items: [
          {
            sku: 'RET-OIL-01',
            name: isRtl ? 'مرتجع: زيت زيتون بكر 1 لتر (عيب في التغليف)' : 'Retour: Huile d\'Olive 1L (Défaut bouchon)',
            packUnit: isRtl ? 'قارورة' : 'Bouteille',
            packQty: 2,
            qty: 2,
            unitPrice: 950,
            discount: 0,
            lineTotal: 1900,
            batchNumber: 'LOT-2026-01',
          },
          {
            sku: 'RET-TEA-02',
            name: isRtl ? 'مرتجع: شاي أخضر أصيل 250 غ' : 'Retour: Thé Vert Authentique 250g',
            packUnit: isRtl ? 'علبة' : 'Boîte',
            packQty: 1,
            qty: 1,
            unitPrice: 500,
            discount: 0,
            lineTotal: 500,
            batchNumber: '',
          },
        ],
      };
      break;

    case 'purchase-invoice':
      invoice = {
        number: 'ACH-2026-0112',
        date: today,
        customerName: isRtl ? 'مجمع الصناعات الغذائية سيفيتال' : 'Groupe Cevital Agro-Alimentaire',
        customerPhone: '034 21 11 00',
        customerAddress: isRtl ? 'الميناء، بجاية' : 'Zone Portuaire, Béjaïa',
        customerRc: '06/00-0012345B',
        customerNif: '000606001234567',
        customerNis: '0006060001122',
        customerAi: '06010023456',
        paymentMethod: isRtl ? 'تحويل بنكي رسمي' : 'Virement Bancaire',
        formerBalance: 150000,
        paidAmount: 320000,
        subtotal: 320000,
        discount: 0,
        tvaAmount: 0,
        total: 320000,
        newBalance: 150000,
        items: [
          {
            sku: 'SUP-SUG-10T',
            name: isRtl ? 'توريد شاحنة سكر أبيض مكرر 10 طن' : 'Fourniture Sucre Blanc Raffiné 10T',
            packUnit: isRtl ? 'طن' : 'Tonne',
            packQty: 10,
            qty: 10,
            unitPrice: 32000,
            discount: 0,
            lineTotal: 320000,
            batchNumber: 'PAL-992-SUG',
          },
        ],
      };
      break;

    case 'thermal-receipt':
    case 'sale-invoice':
    default:
      invoice = {
        number: 'INV-2026-0088',
        date: today,
        customerName: isRtl ? 'كريم بن علي' : 'Karim Benali',
        customerPhone: '0550 12 34 56',
        customerAddress: isRtl ? 'الجزائر العاصمة' : 'Alger Centre',
        customerRc: '16/00-1122334B',
        customerNif: '001616011223344',
        customerNis: '0016160002233',
        customerAi: '16010034567',
        paymentMethod: isRtl ? 'نقداً (الصندوق)' : 'Espèces',
        formerBalance: 1500,
        paidAmount: 5000,
        subtotal: 4850,
        discount: 150,
        tvaAmount: 0,
        total: 4700,
        newBalance: 1200,
        items: [
          {
            sku: 'REF-OIL-1L',
            name: isRtl ? 'زيت زيتون بكر ممتاز 1 لتر' : "Huile d'Olive Vierge Extra 1L",
            packUnit: isRtl ? 'قارورة' : 'Bouteille',
            packQty: 2,
            qty: 2,
            unitPrice: 950,
            discount: 0,
            lineTotal: 1900,
            batchNumber: 'LOT-2026-Z01',
          },
          {
            sku: 'REF-HONEY-500',
            name: isRtl ? 'عسل سدر جبلي طبيعي 500 غ' : 'Miel Pur de Montagne 500g',
            packUnit: isRtl ? 'مرطبان' : 'Pot',
            packQty: 1,
            qty: 1,
            unitPrice: 1600,
            discount: 100,
            lineTotal: 1500,
            batchNumber: 'LOT-2026-M02',
          },
          {
            sku: 'REF-DATE-1KG',
            name: isRtl ? 'تمور دقلة نور فاخرة 1 كغ' : 'Dattes Deglet Nour 1kg',
            packUnit: isRtl ? 'علبة' : 'Boîte',
            packQty: 3,
            qty: 3,
            unitPrice: 450,
            discount: 50,
            lineTotal: 1300,
            batchNumber: 'LOT-2026-D03',
          },
        ],
      };
      break;
  }

  return {
    invoice,
    settings: {
      shopName: shopLegal.name,
      receiptFooter: shopLegal.footer,
    },
    template,
    shopLegal,
    user,
    lang,
  };
}
