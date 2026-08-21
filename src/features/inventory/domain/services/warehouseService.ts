import type { WarehouseEntity } from '@/infrastructure/database/dexie/db';

export interface WarehouseNode extends WarehouseEntity {
  children: WarehouseNode[];
  level: number;
}

export function buildWarehouseTree(warehouses: WarehouseEntity[]): WarehouseNode[] {
  const byId = new Map<string, WarehouseNode>();
  for (const w of warehouses) {
    byId.set(w.id, { ...w, children: [], level: 0 });
  }

  const roots: WarehouseNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (list: WarehouseNode[], level: number) => {
    for (const n of list) n.level = level;
    list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    for (const n of list) sortRecursive(n.children, level + 1);
  };
  sortRecursive(roots, 0);

  return roots;
}

export function flattenWarehouseTree(nodes: WarehouseNode[]): WarehouseNode[] {
  const out: WarehouseNode[] = [];
  const walk = (list: WarehouseNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}
