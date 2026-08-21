// Categories API client — uses Electron IPC with fallback
export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  description?: string;
  icon?: string;
  color?: string;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryWrite {
  name: string;
  parentId?: string | null;
  description?: string;
  icon?: string;
  color?: string;
}

async function getCategoriesApi(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.electronAPI?.categories) return w.electronAPI.categories;

  // انتظر جاهزية Electron API إذا كان في طور التهيئة
  return new Promise<any>((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (w.electronAPI?.categories) {
        clearInterval(interval);
        resolve(w.electronAPI.categories);
      } else if (Date.now() - start > 4000) {
        clearInterval(interval);
        reject(new Error('خدمة الفئات غير متاحة خارج بيئة Electron.'));
      }
    }, 50);
  });
}

export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    const api = await getCategoriesApi();
    const res = await api.list();
    if (res?.error) throw new Error(res.error.detail || 'فشل في تحميل قائمة الفئات');
    return (res?.data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      parentId: r.parent_id ?? r.parentId ?? null,
      description: r.description ?? '',
      icon: r.icon || 'FolderTree',
      color: r.color || '#3B82F6',
      productCount: Number(r.product_count) || 0,
      createdAt: r.created_at ?? r.createdAt,
      updatedAt: r.updated_at ?? r.updatedAt,
    }));
  },

  get: async (id: string): Promise<Category> => {
    const api = await getCategoriesApi();
    const res = await api.get(id);
    if (res?.error) throw new Error(res.error.detail || 'الفئة غير موجودة');
    const r = res.data;
    return {
      id: r.id,
      name: r.name,
      parentId: r.parent_id ?? r.parentId ?? null,
      description: r.description ?? '',
      icon: r.icon || 'FolderTree',
      color: r.color || '#3B82F6',
      productCount: Number(r.product_count) || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  create: async (body: CategoryWrite): Promise<Category> => {
    const api = await getCategoriesApi();
    const res = await api.create({
      name: body.name.trim(),
      parentId: body.parentId ?? null,
      description: body.description ?? '',
      icon: body.icon || 'FolderTree',
      color: body.color || '#3B82F6',
    });
    if (res?.error) throw new Error(res.error.detail || 'فشل في إنشاء الفئة');
    const r = res.data;
    return {
      id: r.id,
      name: r.name,
      parentId: r.parent_id ?? r.parentId ?? null,
      description: r.description ?? '',
      icon: r.icon || 'FolderTree',
      color: r.color || '#3B82F6',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  update: async (id: string, body: CategoryWrite): Promise<Category> => {
    const api = await getCategoriesApi();
    const res = await api.update(id, {
      name: body.name.trim(),
      parentId: body.parentId ?? null,
      description: body.description ?? '',
      icon: body.icon,
      color: body.color,
    });
    if (res?.error) throw new Error(res.error.detail || 'فشل في تحديث الفئة');
    const r = res.data;
    return {
      id: r.id,
      name: r.name,
      parentId: r.parent_id ?? r.parentId ?? null,
      description: r.description ?? '',
      icon: r.icon || 'FolderTree',
      color: r.color || '#3B82F6',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  remove: async (id: string): Promise<{ success: boolean }> => {
    const api = await getCategoriesApi();
    const res = await api.remove(id);
    if (res?.error) throw new Error(res.error.detail || 'فشل في حذف الفئة');
    return res;
  },
};
