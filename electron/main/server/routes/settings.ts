// مسارات إعدادات المتجر وبيانات المحل عبر HTTP REST — `/api/settings`
// يوفر دعم كامل لجلب وتحديث إعدادات المحل ككائن مفرد مباشرة (متوافق مع كل من سطح المكتب وتطبيق الهاتف).

import type { FastifyInstance } from "fastify";
import { queryOne, getTableColumns, toSnakeKey, notifyTableChange } from "../../handlers/db-utils";
import { updateRow } from "../../handlers/crud";

export async function registerSettingsRoutes(server: FastifyInstance): Promise<void> {
  const getSettingsHandler = async (_request: any, reply: any) => {
    try {
      const row = queryOne("SELECT * FROM settings WHERE id = 'default'") || {};
      return reply.send({
        success: true,
        settings: row,
        data: row,
      });
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: { status: 500, detail: err.message || "فشل جلب الإعدادات" },
      });
    }
  };

  const updateSettingsHandler = async (request: any, reply: any) => {
    try {
      const rawPayload = (request.body || {}) as Record<string, unknown>;
      // فك التغليف إن وُجد
      const body = (rawPayload.settings || rawPayload.data || rawPayload) as Record<string, unknown>;

      const validCols = getTableColumns("settings");
      const safePayload: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(body)) {
        if (k === "id") continue;
        const snake = toSnakeKey(k);
        if (validCols.has(snake)) {
          safePayload[snake] = v;
        } else if (validCols.has(k)) {
          safePayload[k] = v;
        }
      }

      // مزامنة ومطابقة كافة الحقول البديلة وثنائية الأسماء في جدول الإعدادات
      const rawShopName = body.shop_name ?? body.shopName ?? body.store_name ?? body.name;
      if (rawShopName !== undefined && rawShopName !== null) {
        const sName = String(rawShopName).trim();
        safePayload.shop_name = sName;
      }

      const rawAddress = body.address ?? body.store_address ?? body.shop_address ?? body.shopAddress;
      if (rawAddress !== undefined && rawAddress !== null) {
        const addr = String(rawAddress).trim();
        safePayload.address = addr;
        safePayload.shop_address = addr;
      }

      const rawPhone = body.phone ?? body.store_phone ?? body.shop_phone ?? body.shopPhone;
      if (rawPhone !== undefined && rawPhone !== null) {
        const p = String(rawPhone).trim();
        safePayload.phone = p;
      }

      const rawPhone2 = body.phone2 ?? body.shop_phone2 ?? body.shopPhone2;
      if (rawPhone2 !== undefined && rawPhone2 !== null) {
        const p2 = String(rawPhone2).trim();
        safePayload.phone2 = p2;
        safePayload.shop_phone2 = p2;
      }

      const rawEmail = body.email ?? body.store_email ?? body.shop_email ?? body.shopEmail;
      if (rawEmail !== undefined && rawEmail !== null) {
        const em = String(rawEmail).trim();
        safePayload.email = em;
        safePayload.shop_email = em;
      }

      const rawLogo = body.logo ?? body.shop_logo ?? body.shopLogo ?? body.logo_url ?? body.imageUrl;
      if (rawLogo !== undefined && rawLogo !== null) {
        const lg = String(rawLogo).trim();
        safePayload.logo = lg;
        safePayload.shop_logo = lg;
      }

      const rawRc = body.commercial_register ?? body.commercialRegister ?? body.company_rc ?? body.companyRC ?? body.rc;
      if (rawRc !== undefined && rawRc !== null) {
        const rc = String(rawRc).trim();
        safePayload.commercial_register = rc;
        safePayload.company_rc = rc;
      }

      const rawNif = body.tax_number ?? body.taxNumber ?? body.company_nif ?? body.companyNif ?? body.companyNIF ?? body.nif ?? body.tax_id;
      if (rawNif !== undefined && rawNif !== null) {
        const nif = String(rawNif).trim();
        safePayload.tax_number = nif;
        safePayload.company_nif = nif;
      }

      const rawArt = body.tax_article ?? body.taxArticle ?? body.company_art ?? body.companyArt ?? body.art;
      if (rawArt !== undefined && rawArt !== null) {
        const art = String(rawArt).trim();
        safePayload.tax_article = art;
        safePayload.company_art = art;
      }

      const rawAi = body.company_ai ?? body.companyAI ?? body.nis ?? body.ai;
      if (rawAi !== undefined && rawAi !== null) {
        safePayload.company_ai = String(rawAi).trim();
      }

      const rawCurrency = body.base_currency ?? body.baseCurrency ?? body.currency ?? body.currency_code;
      if (rawCurrency !== undefined && rawCurrency !== null) {
        safePayload.base_currency = String(rawCurrency).trim();
      }

      const rawFooter = body.receipt_footer ?? body.receiptFooter;
      if (rawFooter !== undefined && rawFooter !== null) {
        safePayload.receipt_footer = String(rawFooter).trim();
      }

      const rawPrefix = body.invoice_prefix ?? body.invoicePrefix;
      if (rawPrefix !== undefined && rawPrefix !== null) {
        safePayload.invoice_prefix = String(rawPrefix).trim();
      }

      const rawStartNum = body.invoice_start_number ?? body.invoiceStartNumber;
      if (rawStartNum !== undefined && rawStartNum !== null) {
        safePayload.invoice_start_number = Number(rawStartNum) || 1;
      }

      const rawTva = body.tva_rate ?? body.tvaRate;
      if (rawTva !== undefined && rawTva !== null) {
        safePayload.tva_rate = Number(rawTva) || 0;
      }

      const rawPrintWidth = body.print_width_mm ?? body.printWidthMm;
      if (rawPrintWidth !== undefined && rawPrintWidth !== null) {
        safePayload.print_width_mm = Number(rawPrintWidth) || 80;
      }

      const rawPrintLang = body.print_language ?? body.printLanguage;
      if (rawPrintLang !== undefined && rawPrintLang !== null) {
        safePayload.print_language = String(rawPrintLang).trim();
      }

      const result = await updateRow("settings", "default", safePayload);
      notifyTableChange("settings", "update", "default");
      const updatedRow = result.data || queryOne("SELECT * FROM settings WHERE id = 'default'") || {};

      return reply.send({
        success: true,
        settings: updatedRow,
        data: updatedRow,
      });
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: { status: 400, detail: err.message || "فشل تحديث الإعدادات" },
      });
    }
  };

  // GET /api/settings & GET /api/settings/default
  server.get("/api/settings", getSettingsHandler);
  server.get("/api/settings/default", getSettingsHandler);

  // PUT /api/settings & PUT /api/settings/default & PUT /api/settings/:id
  server.put("/api/settings", updateSettingsHandler);
  server.put("/api/settings/default", updateSettingsHandler);
  server.put("/api/settings/:id", updateSettingsHandler);

  // POST & PATCH /api/settings
  server.post("/api/settings", updateSettingsHandler);
  server.post("/api/settings/update", updateSettingsHandler);
  server.patch("/api/settings", updateSettingsHandler);
  server.patch("/api/settings/default", updateSettingsHandler);

  console.log("[settings] مسارات إعدادات المتجر مسجلة بنجاح");
}
