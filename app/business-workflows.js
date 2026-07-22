const categoryProfiles = {
  creator: { label: "Creator", focus: "คอนเทนต์ ผู้ติดตาม และการขายผ่านตัวตน" },
  service: { label: "Service", focus: "การนัดหมาย ความเชื่อมั่น และการซื้อซ้ำ" },
  retail: { label: "Retail", focus: "สมาชิกหน้าร้าน ตะกร้าซื้อ และการกลับมาซื้อซ้ำ" },
  restaurant: { label: "Food", focus: "ลูกค้าหน้าร้าน เดลิเวอรี และสมาชิกประจำ" },
  health: { label: "Clinic", focus: "การนัดหมาย การติดตามผล และความต่อเนื่องในการรับบริการ" },
  education: { label: "Education", focus: "ผู้สนใจ การสมัครเรียน และการเรียนต่อเนื่อง" },
  factory: { label: "Factory", focus: "คู่ค้า MOQ ใบเสนอราคา และคำสั่งซื้อซ้ำ" },
  property: { label: "Property", focus: "ผู้สนใจ นัดชม การตัดสินใจ และการส่งมอบ" }
};

export function buildProfileCatalog(profile, catalogs) {
  const businessMode = profile?.businessMode || "online";
  const businessCategory = profile?.businessCategory || "service";
  const businessName = String(profile?.businessName || "ธุรกิจนี้").trim() || "ธุรกิจนี้";
  const category = categoryProfiles[businessCategory] || categoryProfiles.service;
  const catalog = catalogs[businessMode] || catalogs.online || Object.values(catalogs)[0] || [];

  return catalog.map((item) => ({
    ...item,
    name: `${item.name} · ${category.label}`,
    description: `${item.description} สำหรับ ${businessName} โดยเน้น${category.focus}`,
    recommendationReason: `เหมาะกับ ${category.label} ที่ขายแบบ ${businessMode}`,
    businessMode,
    businessCategory
  }));
}

export function packagesMissingFromCatalog(products, catalog) {
  const existingNames = new Set(products.map((product) => product.name));
  return catalog.filter((item) => !existingNames.has(item.name));
}

export function mergeCatalogWithProducts(catalog, products) {
  const storedByName = new Map(products.map((product) => [product.name, product]));
  return catalog.map((item) => {
    const stored = storedByName.get(item.name);
    if (!stored) return item;
    return {
      ...item,
      ...stored,
      description: stored.description || item.description,
      recommendationReason: stored.recommendationReason || item.recommendationReason
    };
  });
}

export function createZeroState() {
  return {
    meta: { updatedAt: new Date().toISOString() },
    schemaVersion: 6,
    businessProfile: {
      businessName: "",
      businessMode: "online",
      businessCategory: "service",
      businessAvatar: "service",
      revenueTarget: 0
    },
    customers: [],
    leads: [],
    products: [],
    deals: [],
    tasks: []
  };
}
