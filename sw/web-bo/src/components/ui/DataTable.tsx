'use client'

import { ReactNode, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import EmptyState from './EmptyState'
import { LucideIcon } from 'lucide-react'

// region Types
export interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (value: unknown, row: T, index: number) => ReactNode
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T) => string
  selectable?: boolean
  selectedKeys?: Set<string>
  onSelectionChange?: (keys: Set<string>) => void
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string, order: 'asc' | 'desc') => void
  onRowClick?: (row: T) => void
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  className?: string
  loading?: boolean
}
// endregion

export default function DataTable<T extends object>({
  data,
  columns,
  keyExtractor,
  selectable,
  selectedKeys = new Set(),
  onSelectionChange,
  sortKey,
  sortOrder,
  onSort,
  onRowClick,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className = '',
  loading,
}: DataTableProps<T>) {
  const allKeys = data.map(keyExtractor)
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selectedKeys.has(key))
  const someSelected = allKeys.some((key) => selectedKeys.has(key))

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.(new Set())
    } else {
      onSelectionChange?.(new Set(allKeys))
    }
  }

  const handleSelectRow = (key: string) => {
    const newKeys = new Set(selectedKeys)
    if (newKeys.has(key)) {
      newKeys.delete(key)
    } else {
      newKeys.add(key)
    }
    onSelectionChange?.(newKeys)
  }

  const handleSort = (key: string) => {
    if (!onSort) return
    const newOrder =
      sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc'
    onSort(key, newOrder)
  }

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="w-3.5 h-3.5 text-text-secondary/50" />
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-accent" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-accent" />
    )
  }

  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return (
    <div className={`bg-bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-secondary">
            <tr>
              {selectable && (
                <th className="px-3 md:px-4 py-3 w-10 md:w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border bg-bg-card text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary whitespace-nowrap ${alignStyles[col.align || 'left']}`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-text-primary"
                    >
                      {col.header}
                      {renderSortIcon(col.key)}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-text-secondary">로딩 중...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4"
                >
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = keyExtractor(row)
                const isSelected = selectedKeys.has(key)

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${isSelected ? 'bg-accent/5' : 'hover:bg-bg-secondary/50'}
                    `}
                  >
                    {selectable && (
                      <td className="px-3 md:px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-border bg-bg-card text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 md:px-4 py-3 text-xs md:text-sm ${alignStyles[col.align || 'left']}`}
                      >
                        {col.render
                          ? col.render((row as Record<string, unknown>)[col.key], row, index)
                          : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
