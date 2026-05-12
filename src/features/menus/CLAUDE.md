# Menus Feature - Documentation

## Overview

Menu management feature with tree-structured display supporting expand/collapse for secondary menus.

## Key Components

### menu-tree-table.tsx

The main table component for displaying menus in a tree structure.

**Props:**
- `data: MenuTreeNode[]` - Tree data with nested children
- `loading: boolean` - Loading state
- `onView`, `onEdit`, `onDelete` - Action callbacks

**Features:**
- Expand/collapse via ChevronRight/ChevronDown icons
- Depth-based indentation (24px per level)
- Loading skeleton with 5 rows
- Empty state message

**Key Implementation Details:**
- Uses `expandedIds: Set<string>` for tracking expanded state
- `renderRow` is a recursive function that builds the tree structure
- React.Fragment with key prop wraps each row for proper React reconciliation
- Children are only rendered if `hasChildren && isExpanded`

```tsx
// Important: React.Fragment key pattern
<React.Fragment key={menu.id}>
  <TableRow>...</TableRow>
  {hasChildren && isExpanded && menu.children!.map(child => renderRow(child, depth + 1))}
</React.Fragment>
```

### use-menus.ts Hook

**fetchMenuTree Logic (Important Change):**
The `fetchMenuTree` function transforms flat API data to tree structure internally.

```typescript
// API returns flat list from /v1/menus/tree
const flatMenus: Menu[] = Array.isArray(rawData) ? rawData : ...

// Build tree structure
const menuMap = new Map<string, MenuTreeNode>()
const rootMenus: MenuTreeNode[] = []

flatMenus.forEach(menu => {
  menuMap.set(menu.id, { ...menu, children: [] })
})

flatMenus.forEach(menu => {
  const node = menuMap.get(menu.id)!
  if (menu.parentId && menuMap.has(menu.parentId)) {
    const parent = menuMap.get(menu.parentId)!
    parent.children!.push(node)
  } else {
    rootMenus.push(node)
  }
})
```

**Critical:** The parent selection filter in `menu-form.tsx` only shows top-level menus (parentId === null):
```typescript
parentMenus.filter((menu) => menu.parentId === null && menu.id !== initialData?.id)
```

## Data Types

```typescript
interface Menu {
  id: string
  name: string
  code: string
  icon: string
  path: string
  parentId: string | null
  sortOrder: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

interface MenuTreeNode extends Menu {
  children: MenuTreeNode[]
}
```

## API Endpoints

- `GET /v1/menus/tree` - Returns flat list, hook transforms to tree
- `GET /v1/menus` - Paginated list for parent selection dropdown
- `POST /v1/menus` - Create menu
- `PATCH /v1/menus/:id` - Update menu
- `DELETE /v1/menus/:id` - Delete menu

## Common Issues Fixed

1. **React.Fragment key warning** - Always wrap recursive rows with `<React.Fragment key={menu.id}>`
2. **Type narrowing for tree transformation** - Use `as any` for raw API response then validate
3. **Set state with new instance** - Always create new Set() when updating expandedIds

## Related Files

- `src/features/menus/menus/page.tsx` - Main page using the components
- `src/features/menus/components/menu-dialog.tsx` - Dialog wrapper
- `src/features/menus/components/menu-form.tsx` - Form with parent selection
- `src/features/menus/components/menu-tree.tsx` - Alternative checkbox tree (for role assignment)