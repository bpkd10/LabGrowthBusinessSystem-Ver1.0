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

  const pipelineStages = ["Qualified", "Proposal", "Negotiation", "Won"];
  return catalog.map((item, index) => ({
    ...item,
    catalogKey: `${businessMode}:${businessCategory}:${item.name}`,
    name: `${item.name} · ${category.label}`,
    description: `${item.description} สำหรับ ${businessName} โดยเน้น${category.focus}`,
    recommendationReason: `เหมาะกับ ${category.label} ที่ขายแบบ ${businessMode}`,
    pipelineStage: item.pipelineStage || pipelineStages[Math.min(index, pipelineStages.length - 1)],
    businessMode,
    businessCategory
  }));
}

export function packagesMissingFromCatalog(products, catalog) {
  const existingNames = new Set(products.map((product) => product.name));
  const existingCatalogKeys = new Set(products.map((product) => product.catalogKey).filter(Boolean));
  return catalog.filter((item) => !existingCatalogKeys.has(item.catalogKey) && !existingNames.has(item.name));
}

export function mergeCatalogWithProducts(catalog, products) {
  const storedByName = new Map(products.map((product) => [product.name, product]));
  const storedByCatalogKey = new Map(products.filter((product) => product.catalogKey).map((product) => [product.catalogKey, product]));
  return catalog.map((item) => {
    const stored = storedByCatalogKey.get(item.catalogKey) || storedByName.get(item.name);
    if (!stored) return item;
    return {
      ...item,
      ...stored,
      description: stored.description || item.description,
      recommendationReason: stored.recommendationReason || item.recommendationReason
    };
  });
}

function copy(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function normalizeOfferRelations(inputState) {
  const state = copy(inputState);
  const products = Array.isArray(state.products) ? state.products : [];
  const productById = new Map(products.map((product) => [product.id, product]));
  const productByName = new Map(products.map((product) => [product.name, product]));

  state.customers = (state.customers || []).map((customer) => {
    const linked = productById.get(customer.solutionPackageId) || productByName.get(customer.solutionPackage);
    return {
      ...customer,
      solutionPackageId: linked?.id || "",
      solutionPackage: linked?.name || customer.solutionPackage || "",
      businessMode: linked?.businessMode || customer.businessMode,
      businessCategory: linked?.businessCategory || customer.businessCategory
    };
  });

  state.deals = (state.deals || []).map((deal) => {
    const linked = productById.get(deal.productId) || productByName.get(deal.offerName);
    return {
      ...deal,
      productId: linked?.id || "",
      offerName: linked?.name || deal.offerName || ""
    };
  });
  state.tasks = (state.tasks || []).map((task) => {
    const linked = productById.get(task.productId) || productByName.get(task.offerName);
    return {
      ...task,
      productId: linked?.id || "",
      offerName: linked?.name || task.offerName || ""
    };
  });

  return state;
}

export function updateProductAcrossState(inputState, productId, changes) {
  const state = normalizeOfferRelations(inputState);
  const product = state.products.find((item) => item.id === productId);
  if (!product) return state;
  Object.assign(product, changes);
  state.customers = state.customers.map((customer) => customer.solutionPackageId === productId
    ? {
      ...customer,
      solutionPackage: product.name,
      businessMode: product.businessMode || customer.businessMode,
      businessCategory: product.businessCategory || customer.businessCategory
    }
    : customer);
  state.deals = state.deals.map((deal) => deal.productId === productId
    ? { ...deal, offerName: product.name }
    : deal);
  state.tasks = state.tasks.map((task) => task.productId === productId
    ? { ...task, offerName: product.name }
    : task);
  return state;
}

export function detachProductRelations(inputState, productId) {
  const state = normalizeOfferRelations(inputState);
  state.products = state.products.filter((product) => product.id !== productId);
  state.customers = state.customers.map((customer) => customer.solutionPackageId === productId
    ? { ...customer, solutionPackageId: "" }
    : customer);
  state.deals = state.deals.map((deal) => deal.productId === productId
    ? { ...deal, productId: "" }
    : deal);
  state.tasks = state.tasks.map((task) => task.productId === productId
    ? { ...task, productId: "" }
    : task);
  return state;
}

export function createZeroState() {
  return {
    meta: { updatedAt: new Date().toISOString() },
    schemaVersion: 8,
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
