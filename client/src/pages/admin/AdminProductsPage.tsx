import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle2,
  ExternalLink,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Check,
  Layers,
  Sliders,
  ChevronRight,
  ArrowRight,
  Smartphone,
  Laptop,
  Headphones,
  FolderPlus,
  ChevronDown,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { productService } from '../../api/services/product.service';
import { aiService } from '../../api/services/ai.service';
import { formatPrice } from '../../utils/format';
import {
  LAPTOP_REQUIRED_SPECS,
  LAPTOP_FULL_SPECS,
  PHONE_FULL_SPECS,
  PHONE_BASIC_SPECS,
  ACCESSORY_SPECS,
  SPEC_GROUPS_CATALOG,
  type SpecPresetItem,
} from '../../constants';
import type {
  Product,
  Category,
  ProductPayload,
  OptionPayload,
  VariantPayload,
  SpecPayload,
} from '../../models/product.model';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AdminPagination from '../../components/admin/AdminPagination';

// Tab types for modal
type FormTab = 'general' | 'specs' | 'options' | 'variants';

interface FormState {
  name: string;
  brand: string;
  categoryId: number;
  price: string;
  stock: string;
  imageUrl: string;
  description: string;
  status: boolean;
  galleryImages: string[];
}

interface FormOptionState {
  id?: number;
  name: string;
  values: string[];
  newTagInput?: string;
}

interface FormVariantState {
  id?: number;
  sku: string;
  optionValues: Record<string, string>;
  price: string;
  originalPrice: string;
  stock: string;
  imageUrl: string;
  status: boolean;
  isExisting?: boolean;
}

interface FormSpecState {
  id?: number;
  group: string;
  key: string;
  value: string;
}

const INITIAL_FORM_STATE: FormState = {
  name: '',
  brand: '',
  categoryId: 1,
  price: '',
  stock: '20',
  imageUrl: '',
  description: '',
  status: true,
  galleryImages: [],
};

// Helper to normalize string for SKU tokens
function toSkuToken(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

// Generate Cartesian product of options
function generateCartesianCombos(
  options: { name: string; values: string[] }[]
): Record<string, string>[] {
  const valid = options.filter((o) => o.name.trim() && o.values.length > 0);
  if (valid.length === 0) return [];

  return valid.reduce<Record<string, string>[]>(
    (acc, opt) => {
      const res: Record<string, string>[] = [];
      for (const item of acc) {
        for (const val of opt.values) {
          res.push({ ...item, [opt.name.trim()]: val.trim() });
        }
      }
      return res;
    },
    [{}]
  );
}

// Make combination unique key for matching
function getComboKey(optionValues?: Record<string, string>): string {
  if (!optionValues || Object.keys(optionValues).length === 0) return '__DEFAULT__';
  return Object.entries(optionValues)
    .map(([k, v]) => `${k.trim().toLowerCase()}=${v.trim().toLowerCase()}`)
    .sort()
    .join('|');
}

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form Modal (Create / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FormTab>('general');

  // Form states
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);
  const [formOptions, setFormOptions] = useState<FormOptionState[]>([]);
  const [formVariants, setFormVariants] = useState<FormVariantState[]>([]);
  const [formSpecs, setFormSpecs] = useState<FormSpecState[]>([]);

  // Spec presets & search/filter state
  const [specGroupFilter, setSpecGroupFilter] = useState<string>('ALL');
  const [specSearchQuery, setSpecSearchQuery] = useState<string>('');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState<boolean>(false);
  const [presetInsertMode, setPresetInsertMode] = useState<'append' | 'replace'>('append');

  // Bulk Variant Apply state
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkOriginalPrice, setBulkOriginalPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  // Gallery Image input
  const [newGalleryUrl, setNewGalleryUrl] = useState('');

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddGalleryImage = () => {
    if (!newGalleryUrl.trim()) return;
    const cleanUrl = newGalleryUrl.trim();
    if (formData.galleryImages.includes(cleanUrl)) {
      showToast('Đường dẫn ảnh này đã có trong bộ sưu tập', 'error');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      galleryImages: [...prev.galleryImages, cleanUrl],
    }));
    setNewGalleryUrl('');
    showToast('Đã thêm ảnh vào bộ sưu tập');
  };

  const handleRemoveGalleryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, idx) => idx !== index),
    }));
  };

  const fetchProductsAndCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productService.getProducts({ limit: 100 }),
        productService.getCategories(),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes || []);
    } catch (err) {
      console.warn('Lỗi khi tải danh sách sản phẩm admin:', err);
      showToast('Không thể kết nối đến máy chủ để tải sản phẩm', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsAndCategories();
  }, [fetchProductsAndCategories]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const defaultCatId = categories.length > 0 ? categories[0].id : 1;
    setFormData({
      ...INITIAL_FORM_STATE,
      categoryId: defaultCatId,
    });
    setFormOptions([]);
    setFormVariants([]);
    setFormSpecs([]);
    setBulkPrice('');
    setBulkOriginalPrice('');
    setBulkStock('');
    setNewGalleryUrl('');
    setSpecGroupFilter('ALL');
    setSpecSearchQuery('');
    setIsGroupDropdownOpen(false);
    setFormErrors({});
    setModalError(null);
    setAiMessage(null);
    setFormMode('create');
    setEditingId(null);
    setActiveTab('general');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = async (p: Product) => {
    setFormMode('edit');
    setEditingId(p.id);
    setActiveTab('general');
    setSpecGroupFilter('ALL');
    setSpecSearchQuery('');
    setIsGroupDropdownOpen(false);
    setFormErrors({});
    setModalError(null);
    setAiMessage(null);
    setIsFormLoading(true);
    setIsFormOpen(true);

    // Initial placeholder data from row
    setFormData({
      name: p.name,
      brand: p.brand || '',
      categoryId: p.categoryId || 1,
      price: (p.minPrice ?? p.price ?? '').toString(),
      stock: (p.stock ?? 0).toString(),
      imageUrl: p.imageUrl || '',
      description: p.description || '',
      status: p.status !== false,
      galleryImages: [],
    });
    setBulkPrice('');
    setBulkOriginalPrice('');
    setBulkStock('');
    setNewGalleryUrl('');

    try {
      // Fetch full product detail with options, variants, specs, images
      const detail = await productService.getProductById(p.id);
      const galleryUrls: string[] = [];
      if (detail.galleryImages && detail.galleryImages.length > 0) {
        galleryUrls.push(...detail.galleryImages.map((i) => i.url));
      } else if (detail.images && detail.images.length > 0) {
        galleryUrls.push(
          ...detail.images.map((i: any) => (typeof i === 'string' ? i : i.url)).filter(Boolean)
        );
      }

      setFormData({
        name: detail.name,
        brand: detail.brand || '',
        categoryId: detail.categoryId || 1,
        price: (detail.minPrice ?? detail.price ?? '').toString(),
        stock: (detail.stock ?? 0).toString(),
        imageUrl: detail.imageUrl || '',
        description: detail.description || '',
        status: detail.status !== false,
        galleryImages: galleryUrls,
      });

      if (detail.options && detail.options.length > 0) {
        setFormOptions(
          detail.options.map((o) => ({
            id: o.id,
            name: o.name,
            values: o.values ? o.values.map((v) => v.value) : [],
            newTagInput: '',
          }))
        );
      } else {
        setFormOptions([]);
      }

      if (detail.variants && detail.variants.length > 0) {
        setFormVariants(
          detail.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            optionValues: v.optionValues || {},
            price: v.price.toString(),
            originalPrice: v.originalPrice != null ? v.originalPrice.toString() : '',
            stock: v.stock.toString(),
            imageUrl: v.imageUrl || '',
            status: v.status !== false,
            isExisting: true,
          }))
        );
      } else {
        setFormVariants([]);
      }

      if (detail.specs && detail.specs.length > 0) {
        setFormSpecs(
          detail.specs.map((s) => ({
            id: s.id,
            group: s.groupName || '',
            key: s.specKey,
            value: s.specValue,
          }))
        );
      } else {
        setFormSpecs([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết sản phẩm:', err);
    } finally {
      setIsFormLoading(false);
    }
  };

  // Sync / Regenerate variants from options
  const handleRegenerateVariantsFromOptions = () => {
    const validOptions = formOptions.filter((o) => o.name.trim() && o.values.length > 0);
    const baseSkuPrefix = toSkuToken(formData.name) || 'PROD';
    const basePrice = formData.price || '1000000';
    const baseStock = formData.stock || '20';

    if (validOptions.length === 0) {
      // Single default variant
      if (formVariants.length === 0 || formVariants.some((v) => Object.keys(v.optionValues).length > 0)) {
        setFormVariants([
          {
            sku: `${baseSkuPrefix}-STD`,
            optionValues: {},
            price: basePrice,
            originalPrice: '',
            stock: baseStock,
            imageUrl: formData.imageUrl || '',
            status: true,
          },
        ]);
      }
      return;
    }

    const combos = generateCartesianCombos(validOptions);

    // Build map of existing variants by combination key
    const existingMap = new Map<string, FormVariantState>();
    for (const v of formVariants) {
      existingMap.set(getComboKey(v.optionValues), v);
    }

    const newVariants: FormVariantState[] = combos.map((combo) => {
      const key = getComboKey(combo);
      const existing = existingMap.get(key);

      if (existing) {
        return {
          ...existing,
          optionValues: combo,
        };
      }

      // Generate clean SKU: PROD-256GB-TITANTRANG
      const tokenParts = Object.values(combo).map(toSkuToken);
      const sku = `${baseSkuPrefix}-${tokenParts.join('-')}`;

      return {
        sku,
        optionValues: combo,
        price: basePrice,
        originalPrice: '',
        stock: baseStock,
        imageUrl: formData.imageUrl || '',
        status: true,
      };
    });

    setFormVariants(newVariants);
    showToast(`Đã đồng bộ ${newVariants.length} biến thể theo các tùy chọn!`);
  };

  // Switch to Variants tab auto-generates if empty
  const handleSwitchTab = (tab: FormTab) => {
    if (tab === 'variants') {
      const hasValidOptions = formOptions.some((o) => o.name.trim() && o.values.length > 0);
      if (formVariants.length === 0 && hasValidOptions) {
        handleRegenerateVariantsFromOptions();
      } else if (formVariants.length === 0 && !hasValidOptions) {
        // Initialize 1 default variant row
        const baseSku = `${toSkuToken(formData.name) || 'PROD'}-STD`;
        setFormVariants([
          {
            sku: baseSku,
            optionValues: {},
            price: formData.price || '1000000',
            originalPrice: '',
            stock: formData.stock || '20',
            imageUrl: formData.imageUrl || '',
            status: true,
          },
        ]);
      }
    }
    setActiveTab(tab);
  };

  // Bulk Apply Price/Stock to Variants
  const handleApplyBulkToVariants = () => {
    if (!bulkPrice && !bulkOriginalPrice && !bulkStock) {
      showToast('Vui lòng nhập ít nhất một giá trị (giá bán, giá gốc hoặc tồn kho) để áp dụng', 'error');
      return;
    }

    setFormVariants((prev) =>
      prev.map((v) => ({
        ...v,
        price: bulkPrice ? bulkPrice : v.price,
        originalPrice: bulkOriginalPrice ? bulkOriginalPrice : v.originalPrice,
        stock: bulkStock ? bulkStock : v.stock,
      }))
    );

    showToast('Đã áp dụng thông số hàng loạt cho tất cả biến thể!');
  };

  // Toggle All Variants Status
  const handleToggleAllVariants = (targetStatus: boolean) => {
    setFormVariants((prev) => prev.map((v) => ({ ...v, status: targetStatus })));
  };

  // Call AI Description Generator
  const handleGenerateAiDescription = async () => {
    if (!formData.name.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        name: 'Vui lòng nhập tên sản phẩm trước khi tạo mô tả bằng AI',
      }));
      return;
    }

    setFormErrors((prev) => {
      const copy = { ...prev };
      delete copy.name;
      return copy;
    });

    setIsGeneratingAi(true);
    setAiMessage(null);

    try {
      const targetCat = categories.find((c) => c.id === formData.categoryId);
      const catName = targetCat ? targetCat.name : 'Thiết bị công nghệ';
      const aiDesc = await aiService.generateProductDescription(formData.name.trim(), catName);

      setFormData((prev) => ({
        ...prev,
        description: aiDesc,
      }));
      setAiMessage('✨ AI đã tạo xong đoạn mô tả chuẩn SEO chuyên nghiệp!');
      setTimeout(() => setAiMessage(null), 4000);
    } catch (err) {
      console.error('Lỗi khi sinh mô tả AI:', err);
      setAiMessage('⚠️ Có lỗi khi kết nối AI, vui lòng thử lại.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Option Tag Helper
  const handleAddOptionTag = (index: number) => {
    const opt = formOptions[index];
    if (!opt.newTagInput || !opt.newTagInput.trim()) return;
    const tag = opt.newTagInput.trim();
    if (opt.values.includes(tag)) {
      showToast(`Giá trị "${tag}" đã tồn tại trong tùy chọn này`, 'error');
      return;
    }

    const updated = [...formOptions];
    updated[index].values.push(tag);
    updated[index].newTagInput = '';
    setFormOptions(updated);
  };

  const handleRemoveOptionTag = (optionIndex: number, tagIndex: number) => {
    const updated = [...formOptions];
    updated[optionIndex].values.splice(tagIndex, 1);
    setFormOptions(updated);
  };

  // Preset option templates
  const handleAddPresetOption = (name: string, defaultValues: string[]) => {
    if (formOptions.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
      showToast(`Tùy chọn "${name}" đã tồn tại`, 'error');
      return;
    }
    setFormOptions([
      ...formOptions,
      {
        name,
        values: [...defaultValues],
        newTagInput: '',
      },
    ]);
    showToast(`Đã thêm tùy chọn "${name}"`);
  };

  // Spec Preset templates
  type PresetType =
    | 'phone-full'
    | 'phone-basic'
    | 'laptop-full'
    | 'laptop-required'
    | 'accessory';

  const handleAddPresetSpecs = (
    type: PresetType,
    mode: 'append' | 'replace' = presetInsertMode
  ) => {
    let presets: SpecPresetItem[] = [];
    let label = '';
    switch (type) {
      case 'phone-full':
        presets = PHONE_FULL_SPECS;
        label = 'Điện thoại (Đầy đủ 9 nhóm)';
        break;
      case 'phone-basic':
        presets = PHONE_BASIC_SPECS;
        label = 'Điện thoại (Cơ bản)';
        break;
      case 'laptop-full':
        presets = LAPTOP_FULL_SPECS;
        label = 'Laptop (Đầy đủ Cần có + Bổ sung)';
        break;
      case 'laptop-required':
        presets = LAPTOP_REQUIRED_SPECS;
        label = 'Laptop (Cơ bản - Cần có)';
        break;
      case 'accessory':
        presets = ACCESSORY_SPECS;
        label = 'Phụ kiện';
        break;
    }

    const newRows: FormSpecState[] = presets.map((p) => ({
      group: p.group,
      key: p.key,
      value: p.value,
    }));

    if (mode === 'replace') {
      setFormSpecs(newRows);
      showToast(`Đã thay thế toàn bộ bằng mẫu ${label} (${newRows.length} thông số)`);
    } else {
      setFormSpecs((prev) => [...prev, ...newRows]);
      showToast(`Đã thêm ${newRows.length} thông số mẫu (${label})`);
    }
    setSpecGroupFilter('ALL');
  };

  const handleAddSpecificGroupSpecs = (groupId: string) => {
    const groupDef = SPEC_GROUPS_CATALOG.find((g) => g.id === groupId);
    if (!groupDef) return;

    const newRows: FormSpecState[] = groupDef.items.map((p) => ({
      group: p.group,
      key: p.key,
      value: p.value,
    }));

    setFormSpecs((prev) => [...prev, ...newRows]);
    setIsGroupDropdownOpen(false);
    showToast(`Đã thêm nhóm "${groupDef.name}" (+${newRows.length} thông số)`);
  };

  const handleClearAllSpecs = () => {
    if (formSpecs.length === 0) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả thông số kỹ thuật hiện tại không?')) {
      setFormSpecs([]);
      setSpecGroupFilter('ALL');
      setSpecSearchQuery('');
      showToast('Đã xóa toàn bộ thông số kỹ thuật');
    }
  };

  // Group specs analysis for filtering & quick navigation
  const uniqueSpecGroups = useMemo(() => {
    const groups: { name: string; count: number }[] = [];
    const map = new Map<string, number>();
    formSpecs.forEach((s) => {
      const g = s.group?.trim() || 'Chung';
      map.set(g, (map.get(g) || 0) + 1);
    });
    map.forEach((count, name) => {
      groups.push({ name, count });
    });
    return groups;
  }, [formSpecs]);

  const filteredFormSpecs = useMemo(() => {
    return formSpecs
      .map((spec, originalIndex) => ({ spec, originalIndex }))
      .filter(({ spec }) => {
        const groupName = spec.group?.trim() || 'Chung';
        const matchesGroup =
          specGroupFilter === 'ALL' || groupName.toLowerCase() === specGroupFilter.toLowerCase();
        const q = specSearchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          spec.key.toLowerCase().includes(q) ||
          spec.value.toLowerCase().includes(q) ||
          groupName.toLowerCase().includes(q);
        return matchesGroup && matchesSearch;
      });
  }, [formSpecs, specGroupFilter, specSearchQuery]);

  // Validate and Submit Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errors.name = 'Tên sản phẩm không được để trống';
    }
    if (!formData.categoryId) {
      errors.categoryId = 'Vui lòng chọn danh mục';
    }

    // Variants validation
    const activeVariants = formVariants.filter((v) => v.status !== false);
    if (formVariants.length > 0 && activeVariants.length === 0) {
      errors.variants = 'Cần bật ít nhất một biến thể để bán sản phẩm này';
    }

    // Check SKU duplicates
    const skuSet = new Set<string>();
    for (const v of formVariants) {
      if (!v.sku || !v.sku.trim()) {
        errors.variants = 'Mã SKU của biến thể không được để trống';
        break;
      }
      const upper = v.sku.trim().toUpperCase();
      if (skuSet.has(upper)) {
        errors.variants = `Mã SKU "${v.sku}" bị trùng lặp giữa các biến thể!`;
        break;
      }
      skuSet.add(upper);

      const numPrice = parseFloat(v.price.toString());
      if (isNaN(numPrice) || numPrice <= 0) {
        errors.variants = `Giá bán của biến thể (${v.sku}) phải lớn hơn 0`;
        break;
      }

      if (v.originalPrice && parseFloat(v.originalPrice.toString()) < numPrice) {
        errors.variants = `Giá gốc của biến thể (${v.sku}) phải lớn hơn hoặc bằng giá bán`;
        break;
      }
    }

    // Fallback if no variants configured
    let numPrice = parseFloat(formData.price);
    if (formVariants.length === 0) {
      if (isNaN(numPrice) || numPrice <= 0) {
        errors.price = 'Giá bán phải là số lớn hơn 0';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (errors.variants) {
        setActiveTab('variants');
      } else if (errors.name || errors.categoryId || errors.price) {
        setActiveTab('general');
      }
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    // Construct clean payload
    const payloadOptions: OptionPayload[] = formOptions
      .map((o) => ({
        id: o.id,
        name: o.name.trim(),
        values: o.values.map((v) => v.trim()).filter(Boolean),
      }))
      .filter((o) => o.name && o.values.length > 0);

    const payloadVariants: VariantPayload[] =
      formVariants.length > 0
        ? formVariants.map((v) => ({
            id: v.id,
            sku: v.sku.trim(),
            optionValues: v.optionValues,
            price: parseFloat(v.price.toString()),
            originalPrice: v.originalPrice ? parseFloat(v.originalPrice.toString()) : null,
            stock: parseInt(v.stock.toString(), 10) || 0,
            imageUrl: v.imageUrl?.trim() || null,
            status: v.status !== false,
          }))
        : [
            {
              sku: `${toSkuToken(formData.name) || 'PROD'}-STD`,
              optionValues: {},
              price: numPrice || 1000000,
              originalPrice: null,
              stock: parseInt(formData.stock, 10) || 20,
              imageUrl: formData.imageUrl?.trim() || null,
              status: true,
            },
          ];

    const payloadSpecs: SpecPayload[] = formSpecs
      .filter((s) => s.key && s.key.trim() && s.value && s.value.trim())
      .map((s) => ({
        id: s.id,
        group: s.group?.trim() || undefined,
        key: s.key.trim(),
        value: s.value.trim(),
      }));

    const payload: ProductPayload = {
      name: formData.name.trim(),
      brand: formData.brand.trim() || undefined,
      description: formData.description.trim(),
      categoryId: formData.categoryId,
      status: formData.status,
      imageUrl:
        formData.imageUrl.trim() ||
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
      images: formData.galleryImages
        .filter((u) => u && u.trim().length > 0)
        .map((url, idx) => ({ url: url.trim(), position: idx })),
      price: payloadVariants[0]?.price || numPrice,
      stock: payloadVariants.reduce((sum, v) => sum + (v.stock || 0), 0),
      options: payloadOptions,
      variants: payloadVariants,
      specs: payloadSpecs,
    };

    try {
      if (formMode === 'create') {
        const newProduct = await productService.createProduct(payload);
        setProducts((prev) => [newProduct, ...prev]);
        showToast(`Đã thêm mới sản phẩm "${newProduct.name}" thành công!`);
      } else if (formMode === 'edit' && editingId !== null) {
        const updated = await productService.updateProduct(editingId, payload);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        showToast(`Đã cập nhật sản phẩm "${updated.name}" thành công!`);
      }
      setIsFormOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu sản phẩm';
      setModalError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Product
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await productService.deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`Đã xóa sản phẩm "${deleteTarget.name}" khỏi hệ thống!`);
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa sản phẩm';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBrand = p.brand?.toLowerCase().includes(q) || false;
        const matchId = p.id.toString().includes(q);
        return matchName || matchBrand || matchId;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalInStock = products.filter((p) => (p.stock || 0) > 0).length;
  const totalOutOfStock = products.filter((p) => (p.stock || 0) === 0).length;

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-[9999] text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-md pointer-events-auto border backdrop-blur-md transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-slate-900/95 border-slate-700'
              : 'bg-rose-600/95 border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-white shrink-0" />
          )}
          <span className="font-medium flex-1">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white transition cursor-pointer shrink-0"
            title="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Quản lý sản phẩm</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {products.length} sản phẩm
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý đa biến thể SKU, giá theo tùy chọn (dung lượng, màu sắc), thông số kỹ thuật
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchProductsAndCategories}
            disabled={isLoading}
            className="p-2 sm:p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs flex items-center gap-2 text-xs font-semibold"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
          >
            Thêm sản phẩm mới
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tổng sản phẩm</span>
          <span className="text-lg font-bold text-slate-900">{products.length}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Còn hàng</span>
          <span className="text-lg font-bold text-emerald-600">{totalInStock}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Hết hàng</span>
          <span className="text-lg font-bold text-rose-600">{totalOutOfStock}</span>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Danh mục</span>
          <span className="text-lg font-bold text-blue-600">{categories.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên sản phẩm, thương hiệu, ID..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
          >
            <option value="ALL">Tất cả ngành hàng ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Đang tải danh sách sản phẩm...</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
            <Package className="w-10 h-10 text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-600">Không tìm thấy sản phẩm nào</p>
            <p className="text-xs text-slate-400">Thử tìm kiếm với từ khóa khác hoặc thêm sản phẩm mới</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3">Sản phẩm</th>
                  <th className="py-2.5 px-3">Danh mục</th>
                  <th className="py-2.5 px-3">Giá bán</th>
                  <th className="py-2.5 px-3">Biến thể / Tồn kho</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProducts.map((p) => {
                  const stock = p.stock ?? 0;
                  const isInStock = stock > 0;
                  const hasMultiVariants = p.variants && p.variants.length > 1;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Product Name & Thumbnail */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100';
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate group-hover:text-blue-600 transition">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-mono">#{p.id}</span>
                              {p.brand && (
                                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60 leading-none">
                                  {p.brand}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                          {p.category?.name || 'Công nghệ'}
                        </span>
                      </td>

                      {/* Price Range */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {p.minPrice && p.maxPrice && p.minPrice !== p.maxPrice ? (
                            <span>
                              {formatPrice(p.minPrice)}{' '}
                              <span className="text-slate-400 font-normal text-[10px]">-</span>{' '}
                              {formatPrice(p.maxPrice)}
                            </span>
                          ) : (
                            formatPrice(p.price)
                          )}
                        </div>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <div className="text-[10px] text-slate-400 line-through">
                            {formatPrice(p.originalPrice)}
                          </div>
                        )}
                      </td>

                      {/* Variants & Stock */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-xs ${
                              stock > 10 ? 'text-slate-700' : stock > 0 ? 'text-amber-700' : 'text-rose-700'
                            }`}
                          >
                            {stock} chiếc
                          </span>
                          {hasMultiVariants ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {p.variants?.length} biến thể
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                              1 biến thể
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isInStock
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{isInStock ? 'Đang bán' : 'Hết hàng'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredProducts.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: FORM THÊM MỚI / CHỈNH SỬA SẢN PHẨM (4 BƯỚC / TAB) */}
      {/* ======================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[95vh] flex flex-col font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span>
                    {formMode === 'create'
                      ? 'Thêm sản phẩm công nghệ mới'
                      : `Chỉnh sửa sản phẩm #${editingId}`}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập thông tin chung, thông số kỹ thuật, tùy chọn và ma trận biến thể
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Header */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 shrink-0 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'general'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>1. Thông tin chung</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('specs')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'specs'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>2. Thông số kỹ thuật</span>
                {formSpecs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                    {formSpecs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('options')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'options'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>3. Tùy chọn (Thuộc tính)</span>
                {formOptions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                    {formOptions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('variants')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'variants'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>4. Bảng biến thể</span>
                {formVariants.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                    {formVariants.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body / Tab Contents */}
            <form onSubmit={handleFormSubmit} className="flex-1 min-h-0 flex flex-col space-y-4">
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {/* Global Error Banner */}
                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-rose-900">Không thể lưu sản phẩm</p>
                      <p className="mt-1 leading-relaxed text-rose-700 font-medium">{modalError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalError(null)}
                      className="p-1 hover:bg-rose-100 rounded text-rose-500 hover:text-rose-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isFormLoading && (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                    <span className="text-xs">Đang nạp chi tiết sản phẩm và biến thể...</span>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 1: THÔNG TIN CHUNG                                    */}
                {/* ======================================================== */}
                {!isFormLoading && activeTab === 'general' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Product Name */}
                    <div>
                      <Input
                        label="Tên sản phẩm *"
                        type="text"
                        placeholder="Ví dụ: iPad Pro 11 inch M4 hoặc Apple iPhone 15 Pro Max"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (formErrors.name) {
                            setFormErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.name;
                              return copy;
                            });
                          }
                        }}
                        error={formErrors.name}
                        required
                      />
                    </div>

                    {/* Brand Input & Preset Chips */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Thương hiệu (Brand)
                        </label>
                        {formData.brand && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, brand: '' })}
                            className="text-[11px] text-slate-400 hover:text-slate-600 transition cursor-pointer"
                          >
                            Xóa chọn
                          </button>
                        )}
                      </div>
                      <Input
                        type="text"
                        placeholder="Nhập tên hãng (Apple, Samsung, Sony, Logitech...)"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-slate-400 font-medium mr-1">Gợi ý nhanh:</span>
                        {[
                          'Apple',
                          'Samsung',
                          'Xiaomi',
                          'Sony',
                          'ASUS',
                          'Lenovo',
                          'Dell',
                          'Logitech',
                          'Anker',
                          'JBL',
                          'SanDisk',
                          'Huawei',
                          'Acer',
                        ].map((brandName) => {
                          const isSelected =
                            formData.brand.toLowerCase() === brandName.toLowerCase();
                          return (
                            <button
                              key={brandName}
                              type="button"
                              onClick={() => setFormData({ ...formData, brand: brandName })}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              {brandName}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category & Image URL Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Danh mục ngành hàng *
                        </label>
                        <select
                          value={formData.categoryId}
                          onChange={(e) =>
                            setFormData({ ...formData, categoryId: Number(e.target.value) })
                          }
                          className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-xs font-semibold text-gray-800 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 cursor-pointer"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Input
                          label="Đường dẫn ảnh đại diện (URL)"
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          leftIcon={<ImageIcon className="w-4 h-4 text-slate-400" />}
                        />
                      </div>
                    </div>

                    {/* Image Live Preview */}
                    {formData.imageUrl && (
                      <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <img
                            src={formData.imageUrl}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100';
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            Xem trước ảnh chính sản phẩm
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {formData.imageUrl}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Product Gallery Images (Bộ sưu tập ảnh chi tiết) */}
                    <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                            Bộ sưu tập ảnh chi tiết (Gallery)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Thêm các góc chụp khác, phụ kiện hoặc ảnh thực tế của sản phẩm
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 text-[10px] font-bold rounded-full">
                          {formData.galleryImages.length} ảnh
                        </span>
                      </div>

                      {/* Input URL row */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="url"
                            placeholder="Dán đường dẫn ảnh chi tiết (URL) rồi nhấn Thêm ảnh..."
                            value={newGalleryUrl}
                            onChange={(e) => setNewGalleryUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddGalleryImage();
                              }
                            }}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddGalleryImage}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm ảnh
                        </button>
                      </div>

                      {/* Thumbnail Grid */}
                      {formData.galleryImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                          {formData.galleryImages.map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-lg border border-slate-200 bg-white p-1 overflow-hidden aspect-square flex items-center justify-center shadow-2xs"
                            >
                              <img
                                src={imgUrl}
                                alt={`Gallery ${idx + 1}`}
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100';
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGalleryImage(idx)}
                                  className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow transition cursor-pointer"
                                  title="Xóa ảnh này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <span className="absolute bottom-1 left-1 px-1 py-0.2 bg-black/60 text-white text-[9px] font-mono rounded">
                                #{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center border border-dashed border-slate-200 rounded-lg bg-white/50 text-[11px] text-slate-400">
                          Chưa có ảnh trong bộ sưu tập. Thêm URL ảnh ở trên để hiển thị slider nhiều ảnh trên trang chi tiết.
                        </div>
                      )}
                    </div>

                    {/* AI Description Generator Section */}
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Mô tả sản phẩm
                        </label>

                        <button
                          type="button"
                          onClick={handleGenerateAiDescription}
                          disabled={isGeneratingAi}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-60"
                        >
                          {isGeneratingAi ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>AI đang soạn thảo mô tả...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                              <span>✨ Tạo mô tả bằng AI</span>
                            </>
                          )}
                        </button>
                      </div>

                      {aiMessage && (
                        <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{aiMessage}</span>
                        </div>
                      )}

                      <textarea
                        rows={5}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Nhập mô tả tóm tắt, tính năng nổi bật hoặc nhấn '✨ Tạo mô tả bằng AI'..."
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition resize-y font-mono leading-relaxed"
                      />
                    </div>

                    {/* Status Checkbox */}
                    <div className="pt-1">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          Kích hoạt hiển thị và cho phép đặt mua (Status = Active)
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 2: THÔNG SỐ KỸ THUẬT (SPECS)                          */}
                {/* ======================================================== */}
                {!isFormLoading && activeTab === 'specs' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Datalist for standard spec groups */}
                    <datalist id="preset-spec-groups-list">
                      <option value="CPU" />
                      <option value="GPU" />
                      <option value="RAM" />
                      <option value="Ổ cứng" />
                      <option value="Màn hình" />
                      <option value="Hiệu năng" />
                      <option value="Camera" />
                      <option value="Pin & sạc" />
                      <option value="Pin" />
                      <option value="Nguồn điện" />
                      <option value="Kết nối" />
                      <option value="Bảo mật & độ bền" />
                      <option value="Phần mềm" />
                      <option value="Hệ điều hành" />
                      <option value="Âm thanh & cảm biến" />
                      <option value="Ngoại vi" />
                      <option value="Thiết kế" />
                      <option value="Thông số chung" />
                      <option value="Bảo hành" />
                    </datalist>

                    {/* Preset Controls Card */}
                    <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/20 p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <Sliders className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              Mẫu thông số kỹ thuật chuẩn hóa
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Chọn mẫu nhanh cho Điện thoại & Laptop hoặc tùy chỉnh theo từng nhóm
                            </span>
                          </div>
                        </div>

                        {/* Mode toggle & Clear all */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <div className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-lg text-[11px] font-medium text-slate-600">
                            <button
                              type="button"
                              onClick={() => setPresetInsertMode('append')}
                              className={`px-2 py-0.5 rounded-md transition ${
                                presetInsertMode === 'append'
                                  ? 'bg-white text-blue-700 font-bold shadow-2xs'
                                  : 'hover:text-slate-900'
                              }`}
                              title="Thêm tiếp vào sau các thông số đang có"
                            >
                              Nối tiếp
                            </button>
                            <button
                              type="button"
                              onClick={() => setPresetInsertMode('replace')}
                              className={`px-2 py-0.5 rounded-md transition ${
                                presetInsertMode === 'replace'
                                  ? 'bg-white text-blue-700 font-bold shadow-2xs'
                                  : 'hover:text-slate-900'
                              }`}
                              title="Thay thế toàn bộ thông số hiện có bằng mẫu này"
                            >
                              Ghi đè
                            </button>
                          </div>

                          {formSpecs.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllSpecs}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/80 rounded-lg transition"
                              title="Xóa tất cả thông số hiện tại"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Xóa hết ({formSpecs.length})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                        <span className="text-[11px] font-semibold text-slate-500 mr-1">
                          Áp dụng mẫu:
                        </span>

                        {/* Phone Presets */}
                        <button
                          type="button"
                          onClick={() => handleAddPresetSpecs('phone-full')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50/60 text-blue-800 rounded-xl shadow-2xs transition group"
                          title="9 nhóm đầy đủ: Màn hình, Hiệu năng, Camera, Pin & sạc, Kết nối, Bảo mật & độ bền, Phần mềm, Âm thanh & cảm biến, Thiết kế"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                          <span>📱 Điện thoại (Đầy đủ - 9 nhóm)</span>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-bold">
                            38
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddPresetSpecs('phone-basic')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-2xs transition"
                          title="6 nhóm cơ bản: Màn hình, Chip, Camera, Pin, Kết nối, Thiết kế"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                          <span>Điện thoại (Cơ bản)</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
                            24
                          </span>
                        </button>

                        {/* Laptop Presets */}
                        <button
                          type="button"
                          onClick={() => handleAddPresetSpecs('laptop-full')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/60 text-indigo-800 rounded-xl shadow-2xs transition group"
                          title="11 nhóm đầy đủ (Cần có + Bổ sung): CPU, GPU, RAM, Ổ cứng, Màn hình, Kết nối, Pin, Nguồn điện, Hệ điều hành, Thiết kế, Ngoại vi"
                        >
                          <Laptop className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                          <span>💻 Laptop (Đầy đủ - Cần có + Bổ sung)</span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full font-bold">
                            33
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddPresetSpecs('laptop-required')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-2xs transition"
                          title="Chỉ gồm các trường Cần có: CPU, GPU, RAM, Ổ cứng, Màn hình, Kết nối, Pin, HĐH, Thiết kế"
                        >
                          <Laptop className="w-3.5 h-3.5 text-slate-500" />
                          <span>Laptop (Cần có)</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
                            22
                          </span>
                        </button>

                        {/* Accessory Preset */}
                        <button
                          type="button"
                          onClick={() => handleAddPresetSpecs('accessory')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-2xs transition"
                        >
                          <Headphones className="w-3.5 h-3.5 text-slate-500" />
                          <span>Phụ kiện</span>
                        </button>

                        {/* Dropdown: Add individual group */}
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => setIsGroupDropdownOpen((prev) => !prev)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 rounded-xl shadow-2xs transition"
                            title="Chèn riêng lẻ từng nhóm thông số như CPU, GPU, Camera, Màn hình..."
                          >
                            <FolderPlus className="w-3.5 h-3.5 text-amber-600" />
                            <span>+ Thêm theo nhóm lẻ</span>
                            <ChevronDown className="w-3 h-3 text-amber-600" />
                          </button>

                          {isGroupDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setIsGroupDropdownOpen(false)}
                              />
                              <div className="absolute right-0 sm:left-0 top-full mt-1.5 z-30 w-80 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95">
                                <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                  <span>Chọn nhóm cần thêm:</span>
                                  <span className="text-[10px] font-normal lowercase text-slate-400">
                                    {SPEC_GROUPS_CATALOG.length} nhóm
                                  </span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {SPEC_GROUPS_CATALOG.map((group) => (
                                    <button
                                      key={group.id}
                                      type="button"
                                      onClick={() => handleAddSpecificGroupSpecs(group.id)}
                                      className="w-full text-left px-2.5 py-2 hover:bg-blue-50/70 rounded-xl transition group flex items-start justify-between gap-2"
                                    >
                                      <div>
                                        <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 flex items-center gap-1.5">
                                          <span>{group.name}</span>
                                          <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                                            +{group.items.length}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                          {group.description}
                                        </p>
                                      </div>
                                      <span
                                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                          group.deviceType === 'phone'
                                            ? 'bg-blue-50 text-blue-600'
                                            : group.deviceType === 'laptop'
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'bg-emerald-50 text-emerald-600'
                                        }`}
                                      >
                                        {group.deviceType === 'phone'
                                          ? 'ĐT'
                                          : group.deviceType === 'laptop'
                                          ? 'Laptop'
                                          : 'Chung'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Filter and search bar when specs exist */}
                    {formSpecs.length > 0 && (
                      <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                          {/* Search bar inside specs */}
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={specSearchQuery}
                              onChange={(e) => setSpecSearchQuery(e.target.value)}
                              placeholder="Tìm nhanh thông số (vd: RAM, Camera, Màn hình...)"
                              className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
                            />
                            {specSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setSpecSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap self-end sm:self-auto">
                            Đang hiển thị{' '}
                            <span className="font-bold text-slate-800">
                              {filteredFormSpecs.length}
                            </span>
                            /{formSpecs.length} thông số
                          </div>
                        </div>

                        {/* Group Chips Filter */}
                        {uniqueSpecGroups.length > 1 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs no-scrollbar">
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                              <Filter className="w-3 h-3" /> Lọc nhóm:
                            </span>

                            <button
                              type="button"
                              onClick={() => setSpecGroupFilter('ALL')}
                              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                specGroupFilter === 'ALL'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Tất cả ({formSpecs.length})
                            </button>

                            {uniqueSpecGroups.map((group) => (
                              <button
                                key={group.name}
                                type="button"
                                onClick={() => setSpecGroupFilter(group.name)}
                                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                  specGroupFilter.toLowerCase() === group.name.toLowerCase()
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {group.name} ({group.count})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Spec rows table / empty state */}
                    {formSpecs.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                          <Sliders className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">
                            Chưa có thông số kỹ thuật nào
                          </p>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            Nhấn vào mẫu <strong>Điện thoại</strong> hoặc <strong>Laptop</strong> ở trên để tự động điền các trường chuẩn hóa theo danh mục, hoặc thêm thủ công bên dưới.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleAddPresetSpecs('phone-full')}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-xl shadow-xs hover:bg-blue-700 transition"
                          >
                            + Áp dụng mẫu Điện thoại
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddPresetSpecs('laptop-full')}
                            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-xl shadow-xs hover:bg-indigo-700 transition"
                          >
                            + Áp dụng mẫu Laptop
                          </button>
                        </div>
                      </div>
                    ) : filteredFormSpecs.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-xs font-medium text-slate-600">
                          Không tìm thấy thông số nào khớp với bộ lọc "{specSearchQuery}"
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSpecSearchQuery('');
                            setSpecGroupFilter('ALL');
                          }}
                          className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
                        >
                          Xóa bộ lọc tìm kiếm
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Table Header labels */}
                        <div className="flex items-center gap-2 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <div className="w-1/4">Nhóm thông số</div>
                          <div className="w-1/3">Tên thông số</div>
                          <div className="flex-1">Giá trị thông số</div>
                          <div className="w-8"></div>
                        </div>

                        {filteredFormSpecs.map(({ spec, originalIndex }) => (
                          <div
                            key={originalIndex}
                            className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs transition"
                          >
                            <input
                              type="text"
                              list="preset-spec-groups-list"
                              placeholder="Nhóm (vd: Màn hình, CPU)"
                              value={spec.group}
                              onChange={(e) => {
                                const copy = [...formSpecs];
                                copy[originalIndex].group = e.target.value;
                                setFormSpecs(copy);
                              }}
                              className="w-1/4 px-2.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-blue-900"
                            />
                            <input
                              type="text"
                              placeholder="Tên thông số (vd: Kích thước, Model)"
                              value={spec.key}
                              onChange={(e) => {
                                const copy = [...formSpecs];
                                copy[originalIndex].key = e.target.value;
                                setFormSpecs(copy);
                              }}
                              className="w-1/3 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
                            />
                            <input
                              type="text"
                              placeholder="Giá trị (vd: 15.6 inch, Intel Core i7)"
                              value={spec.value}
                              onChange={(e) => {
                                const copy = [...formSpecs];
                                copy[originalIndex].value = e.target.value;
                                setFormSpecs(copy);
                              }}
                              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...formSpecs];
                                copy.splice(originalIndex, 1);
                                setFormSpecs(copy);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Xóa thông số này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setFormSpecs([
                            ...formSpecs,
                            {
                              group:
                                specGroupFilter !== 'ALL' ? specGroupFilter : 'Thông số chung',
                              key: '',
                              value: '',
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm dòng thông số mới</span>
                      </button>

                      {formSpecs.length > 0 && (
                        <span className="text-[11px] text-slate-400">
                          Mẹo: Các dòng có tên thông số và giá trị sẽ được lưu tự động khi bạn lưu sản phẩm.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 3: TÙY CHỌN (OPTIONS)                                 */}
                {/* ======================================================== */}
                {!isFormLoading && activeTab === 'options' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Các tùy chọn phân loại (Options)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Ví dụ: Dung lượng (128GB, 256GB), Màu sắc (Titan Trắng, Titan Đen).
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Gợi ý nhanh:</span>
                        <button
                          type="button"
                          onClick={() => handleAddPresetOption('Dung lượng', ['128GB', '256GB', '512GB'])}
                          className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                        >
                          + Dung lượng
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddPresetOption('Màu sắc', ['Titan Trắng', 'Titan Đen', 'Titan Sa Mạc'])}
                          className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                        >
                          + Màu sắc
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddPresetOption('Kích thước', ['11 inch', '13 inch'])}
                          className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                        >
                          + Kích thước
                        </button>
                      </div>
                    </div>

                    {formOptions.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-600">Sản phẩm chưa có tùy chọn</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Nếu không có tùy chọn, hệ thống sẽ tự động tạo 1 biến thể mặc định (Tiêu chuẩn).
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formOptions.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs font-bold text-slate-700">Tùy chọn #{optIdx + 1}:</span>
                                <input
                                  type="text"
                                  placeholder="Tên tùy chọn (vd: Dung lượng, Màu sắc...)"
                                  value={opt.name}
                                  onChange={(e) => {
                                    const copy = [...formOptions];
                                    copy[optIdx].name = e.target.value;
                                    setFormOptions(copy);
                                  }}
                                  className="w-48 px-2.5 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const copy = [...formOptions];
                                  copy.splice(optIdx, 1);
                                  setFormOptions(copy);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Xóa toàn bộ tùy chọn này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Tags list */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {opt.values.map((val, valIdx) => (
                                <span
                                  key={valIdx}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                                >
                                  <span>{val}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOptionTag(optIdx, valIdx)}
                                    className="p-0.5 hover:bg-blue-200 rounded-full text-blue-600 hover:text-blue-900"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}

                              {/* Input to add tag */}
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="Nhập giá trị rồi nhấn Enter..."
                                  value={opt.newTagInput || ''}
                                  onChange={(e) => {
                                    const copy = [...formOptions];
                                    copy[optIdx].newTagInput = e.target.value;
                                    setFormOptions(copy);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddOptionTag(optIdx);
                                    }
                                  }}
                                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddOptionTag(optIdx)}
                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                  title="Thêm giá trị"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormOptions([
                            ...formOptions,
                            { name: '', values: [], newTagInput: '' },
                          ])
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm tùy chọn mới</span>
                      </button>

                      {formOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSwitchTab('variants')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <span>Sang Bước 4: Tạo ma trận biến thể</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 4: BẢNG BIẾN THỂ (VARIANTS MATRIX)                    */}
                {/* ======================================================== */}
                {!isFormLoading && activeTab === 'variants' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Bulk Tools Header */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Ma trận biến thể ({formVariants.length} biến thể)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Cấu hình SKU, giá bán, giá gốc và tồn kho riêng cho từng biến thể
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRegenerateVariantsFromOptions}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                            title="Tạo lại tổ hợp biến thể từ Tab Tùy chọn"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                            <span>Đồng bộ từ Tùy chọn</span>
                          </button>
                        </div>
                      </div>

                      {/* Bulk Apply Bar */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
                        <span className="text-[11px] font-bold text-slate-600">Áp dụng chung:</span>
                        <input
                          type="number"
                          placeholder="Giá bán (VNĐ)..."
                          value={bulkPrice}
                          onChange={(e) => setBulkPrice(e.target.value)}
                          className="w-32 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="Giá gốc (VNĐ)..."
                          value={bulkOriginalPrice}
                          onChange={(e) => setBulkOriginalPrice(e.target.value)}
                          className="w-32 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="Tồn kho..."
                          value={bulkStock}
                          onChange={(e) => setBulkStock(e.target.value)}
                          className="w-24 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyBulkToVariants}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
                        >
                          Áp dụng cho tất cả
                        </button>

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleAllVariants(true)}
                            className="text-[11px] font-semibold text-emerald-600 hover:underline"
                          >
                            Bật tất cả
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleToggleAllVariants(false)}
                            className="text-[11px] font-semibold text-rose-600 hover:underline"
                          >
                            Tắt tất cả
                          </button>
                        </div>
                      </div>
                    </div>

                    {formErrors.variants && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{formErrors.variants}</span>
                      </div>
                    )}

                    {/* Variants Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-2.5 w-12 text-center">Bật</th>
                            <th className="py-2 px-2.5">Phân loại (Tùy chọn)</th>
                            <th className="py-2 px-2.5 w-40">Mã SKU *</th>
                            <th className="py-2 px-2.5 w-32">Giá bán (VNĐ) *</th>
                            <th className="py-2 px-2.5 w-32">Giá gốc (VNĐ)</th>
                            <th className="py-2 px-2.5 w-24">Tồn kho *</th>
                            <th className="py-2 px-2.5">URL ảnh</th>
                            <th className="py-2 px-2.5 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {formVariants.map((v, idx) => {
                            const optionNames = Object.values(v.optionValues);
                            const label =
                              optionNames.length > 0 ? optionNames.join(' / ') : 'Tiêu chuẩn';

                            return (
                              <tr
                                key={idx}
                                className={`transition-colors ${
                                  v.status ? 'hover:bg-slate-50/80' : 'bg-slate-50/50 opacity-60'
                                }`}
                              >
                                {/* Active Toggle */}
                                <td className="py-2 px-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={v.status}
                                    onChange={(e) => {
                                      const copy = [...formVariants];
                                      copy[idx].status = e.target.checked;
                                      setFormVariants(copy);
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                    title={v.status ? 'Tắt biến thể này' : 'Bật biến thể này'}
                                  />
                                </td>

                                {/* Option Values Label */}
                                <td className="py-2 px-2.5 whitespace-nowrap">
                                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {label}
                                  </span>
                                </td>

                                {/* SKU */}
                                <td className="py-2 px-2.5">
                                  <input
                                    type="text"
                                    value={v.sku}
                                    onChange={(e) => {
                                      const copy = [...formVariants];
                                      copy[idx].sku = e.target.value.toUpperCase();
                                      setFormVariants(copy);
                                    }}
                                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="SKU..."
                                    required
                                  />
                                </td>

                                {/* Price */}
                                <td className="py-2 px-2.5">
                                  <input
                                    type="number"
                                    value={v.price}
                                    onChange={(e) => {
                                      const copy = [...formVariants];
                                      copy[idx].price = e.target.value;
                                      setFormVariants(copy);
                                    }}
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Giá bán..."
                                    min="1000"
                                    required
                                  />
                                </td>

                                {/* Original Price */}
                                <td className="py-2 px-2.5">
                                  <input
                                    type="number"
                                    value={v.originalPrice || ''}
                                    onChange={(e) => {
                                      const copy = [...formVariants];
                                      copy[idx].originalPrice = e.target.value;
                                      setFormVariants(copy);
                                    }}
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Giá gốc..."
                                  />
                                </td>

                                {/* Stock */}
                                <td className="py-2 px-2.5">
                                  <input
                                    type="number"
                                    value={v.stock}
                                    onChange={(e) => {
                                      const copy = [...formVariants];
                                      copy[idx].stock = e.target.value;
                                      setFormVariants(copy);
                                    }}
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Kho..."
                                    min="0"
                                    required
                                  />
                                </td>

                                {/* Image URL */}
                                <td className="py-2 px-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={v.imageUrl || ''}
                                      onChange={(e) => {
                                        const copy = [...formVariants];
                                        copy[idx].imageUrl = e.target.value;
                                        setFormVariants(copy);
                                      }}
                                      className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      placeholder="https://..."
                                    />
                                    {v.imageUrl && (
                                      <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 p-0.5 shrink-0 overflow-hidden">
                                        <img
                                          src={v.imageUrl}
                                          alt="thumb"
                                          className="max-h-full max-w-full object-contain"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Action */}
                                <td className="py-2 px-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const copy = [...formVariants];
                                      copy.splice(idx, 1);
                                      setFormVariants(copy);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                    title="Xóa biến thể này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormVariants([
                          ...formVariants,
                          {
                            sku: `${toSkuToken(formData.name) || 'PROD'}-CUSTOM-${formVariants.length + 1}`,
                            optionValues: {},
                            price: formData.price || '1000000',
                            originalPrice: '',
                            stock: '10',
                            imageUrl: formData.imageUrl || '',
                            status: true,
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm dòng biến thể tùy chỉnh</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </Button>

                <div className="flex items-center gap-2">
                  {activeTab !== 'variants' ? (
                    <Button
                      type="button"
                      variant="dark"
                      size="md"
                      onClick={() => {
                        if (activeTab === 'general') setActiveTab('specs');
                        else if (activeTab === 'specs') setActiveTab('options');
                        else if (activeTab === 'options') handleSwitchTab('variants');
                      }}
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      Tiếp theo
                    </Button>
                  ) : null}

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    {formMode === 'create' ? 'Tạo mới sản phẩm' : 'Lưu cập nhật'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: XÁC NHẬN XÓA SẢN PHẨM                            */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa sản phẩm</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm:
                <br />
                <strong className="text-slate-800 font-bold">"{deleteTarget.name}"</strong> (#{deleteTarget.id})?
                <br />
                <span className="text-rose-600 text-[11px] font-semibold mt-1 block">
                  Hành động này sẽ gửi yêu cầu DELETE lên máy chủ và không thể hoàn tác.
                </span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                isLoading={isDeleting}
                onClick={handleConfirmDelete}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: XEM CHI TIẾT SẢN PHẨM                            */}
      {/* ======================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 font-sans max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span>Chi tiết sản phẩm #{selectedProduct.id}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="flex gap-4 items-center">
                <div className="w-24 h-24 rounded-xl bg-slate-50 border border-slate-200 p-2 shrink-0 flex items-center justify-center">
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{selectedProduct.name}</h4>
                  <p className="text-xs text-slate-500">
                    Danh mục: {selectedProduct.category?.name || 'Công nghệ'}
                  </p>
                  <p className="text-base font-black text-blue-600">
                    {selectedProduct.minPrice && selectedProduct.maxPrice && selectedProduct.minPrice !== selectedProduct.maxPrice
                      ? `${formatPrice(selectedProduct.minPrice)} - ${formatPrice(selectedProduct.maxPrice)}`
                      : formatPrice(selectedProduct.price)}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600">
                    Tổng tồn kho: {selectedProduct.stock ?? 0} sản phẩm
                  </p>
                </div>
              </div>

              {/* Variants list if available */}
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    Danh sách biến thể ({selectedProduct.variants.length})
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {selectedProduct.variants.map((v) => (
                      <div key={v.id} className="p-2.5 flex items-center justify-between gap-2 bg-slate-50/50">
                        <div>
                          <span className="font-bold text-slate-900">{v.title || v.sku}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">SKU: {v.sku}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-blue-600 block">{formatPrice(v.price)}</span>
                          <span className="text-[10px] text-slate-500">Kho: {v.stock} chiếc</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 font-mono leading-relaxed whitespace-pre-line">
                <span className="font-bold block text-slate-800 font-sans">Mô tả sản phẩm:</span>
                <p>{selectedProduct.description || 'Chưa có mô tả chi tiết.'}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 shrink-0">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit className="w-3.5 h-3.5" />}
                onClick={() => {
                  const p = selectedProduct;
                  setSelectedProduct(null);
                  handleOpenEditModal(p);
                }}
              >
                Chỉnh sửa
              </Button>
              <Button variant="dark" size="sm" onClick={() => setSelectedProduct(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;
