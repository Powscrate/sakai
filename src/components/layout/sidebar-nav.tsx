// src/components/layout/sidebar-nav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PencilLine,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Tableau de Bord', icon: LayoutDashboard },
  { href: '/log-data', label: 'Enregistrer Données', icon: PencilLine },
  { href: '/goals', label: 'Objectifs', icon: Target },
  { href: '/trends', label: 'Tendances', icon: TrendingUp },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={{ children: item.label, side: "right", align: "center" }}
              >
                <a>
                  <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-sidebar-foreground/70")} />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
