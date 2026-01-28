'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { type CelebTag, updateTagOrder } from '@/actions/admin/tags'
import TagFormModal from './TagFormModal'
import TagAccordionItem from './TagAccordionItem'

interface Props {
  initialTags: CelebTag[]
}

export default function TagList({ initialTags }: Props) {
  const [tags, setTags] = useState(initialTags)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // #region Handlers
  const handleCreateModalClose = (newTag?: CelebTag) => {
    setIsCreateModalOpen(false)
    if (newTag) {
      setTags(prev => [...prev, newTag])
      setExpandedId(newTag.id)
    }
  }

  const handleTagUpdate = (updatedTag: CelebTag) => {
    setTags(prev => prev.map(t => (t.id === updatedTag.id ? updatedTag : t)))
  }

  const handleTagDelete = (tagId: string) => {
    setTags(prev => prev.filter(t => t.id !== tagId))
    if (expandedId === tagId) setExpandedId(null)
  }
  // #endregion

  // #region Drag & Drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newTags = [...tags]
    const [draggedItem] = newTags.splice(draggedIndex, 1)
    newTags.splice(index, 0, draggedItem)
    setTags(newTags)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return
    setDraggedIndex(null)
    await updateTagOrder(tags.map(t => t.id))
  }
  // #endregion

  return (
    <div className="space-y-4">
      {/* 생성 버튼 */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
      >
        <Plus className="w-4 h-4" />
        태그 추가
      </button>

      {/* 태그 목록 (아코디언) */}
      <div className="space-y-2">
        {tags.length === 0 && (
          <div className="p-8 text-center text-text-secondary bg-bg-card border border-border rounded-xl">
            등록된 태그가 없다. 태그를 추가해보자.
          </div>
        )}
        {tags.map((tag, index) => (
          <TagAccordionItem
            key={tag.id}
            tag={tag}
            index={index}
            isExpanded={expandedId === tag.id}
            isDragging={draggedIndex === index}
            onToggle={() => setExpandedId(expandedId === tag.id ? null : tag.id)}
            onUpdate={handleTagUpdate}
            onDelete={handleTagDelete}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* 생성 모달 */}
      {isCreateModalOpen && (
        <TagFormModal tag={null} onClose={handleCreateModalClose} />
      )}
    </div>
  )
}
