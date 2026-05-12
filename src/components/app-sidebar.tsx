"use client"

import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Shield,
  Settings,
  Users,
  CreditCard,
  FileText,
  Wallet,
  Menu,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { Logo } from "@/components/logo"
import { SidebarNotification } from "@/components/sidebar-notification"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu as SidebarMenuPrimitive,
  SidebarMenuButton as SidebarMenuButtonPrimitive,
  SidebarMenuItem as SidebarMenuItemPrimitive,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useMenusContext } from "@/contexts/menu-context"
import { useAuth } from "@/contexts/auth-context"
import type { MenuTreeNode } from "@/features/menus/types"

// Map icon name to Lucide icon component
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Shield,
  Settings,
  Users,
  CreditCard,
  FileText,
  Wallet,
  Menu,
}

function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || Menu
}

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: NavItem[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

function convertMenuToNavGroups(menus: MenuTreeNode[]): NavGroup[] {
  // The API already returns a tree structure with children nested inside parents
  // We need to build nav groups where each root menu becomes a group
  // and its direct children become items

  const sortByOrder = (a: MenuTreeNode, b: MenuTreeNode) => a.sortOrder - b.sortOrder

  // Build nav groups from tree - each root menu is a group
  const groups: NavGroup[] = menus
    .filter(m => !m.parentId)
    .sort(sortByOrder)
    .map(root => {
      // Build items from root's children
      const items: NavItem[] = (root.children || [])
        .sort(sortByOrder)
        .map(child => ({
          title: child.name,
          url: child.path || "#",
          icon: getIcon(child.icon),
          // If child has nested children, include them too
          items: child.children && child.children.length > 0
            ? child.children.sort(sortByOrder).map(grandchild => ({
                title: grandchild.name,
                url: grandchild.path || "#",
                icon: getIcon(grandchild.icon),
              }))
            : undefined,
        }))

      return {
        label: root.name,
        items,
      }
    })

  return groups
}

function DynamicNavGroup({ group }: { group: NavGroup }) {
  const location = useLocation()

  const shouldBeOpen = (item: NavItem) => {
    if (item.isActive) return true
    return item.items?.some(subItem => location.pathname === subItem.url) || false
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarMenuPrimitive>
        {group.items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={shouldBeOpen(item)}
            className="group/collapsible"
          >
            <SidebarMenuItemPrimitive>
              {item.items && item.items.length > 0 ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButtonPrimitive tooltip={item.title} className="cursor-pointer">
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButtonPrimitive>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className="cursor-pointer"
                            isActive={location.pathname === subItem.url}
                          >
                            <Link to={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : (
                <SidebarMenuButtonPrimitive
                  asChild
                  tooltip={item.title}
                  className="cursor-pointer"
                  isActive={location.pathname === item.url}
                >
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButtonPrimitive>
              )}
            </SidebarMenuItemPrimitive>
          </Collapsible>
        ))}
      </SidebarMenuPrimitive>
    </SidebarGroup>
  )
}

const defaultUser = {
  name: "Admin",
  email: "admin@example.com",
  avatar: "",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { menus, fetchMenuTree, loading } = useMenusContext()

  React.useEffect(() => {
    fetchMenuTree()
  }, [fetchMenuTree])

  const navGroups = React.useMemo(() => {
    if (menus.length === 0) {
      return []
    }
    return convertMenuToNavGroups(menus)
  }, [menus])

  const displayUser = user
    ? {
        name: user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.email || "Admin",
        email: user.email || "",
        avatar: "",
      }
    : defaultUser

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Admin</span>
                  <span className="truncate text-xs">管理后台</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {loading ? (
          <SidebarGroup>
            <SidebarGroupLabel>加载中...</SidebarGroupLabel>
          </SidebarGroup>
        ) : navGroups.length > 0 ? (
          navGroups.map((group) => (
            <DynamicNavGroup key={group.label} group={group} />
          ))
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>暂无菜单</SidebarGroupLabel>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarNotification />
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
