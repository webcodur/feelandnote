
'use client'

import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'
import ManualSearchModal from '../ManualSearchModal'
import { useCollect } from './lib/hooks'
import InputSection from './components/InputSection'
import ExtractedList from './components/ExtractedList'
import ActionBar from './components/ActionBar'
import ImagePopup from './components/ImagePopup'

interface Props {
  celebId: string
  celebName: string
}

export default function CollectView({ celebId, celebName }: Props) {
  const {
    inputMode,
    setInputMode,
    url,
    setUrl,
    text,
    setText,
    jsonText,
    setJsonText,
    promptCopied,
    setPromptCopied,
    extractedItems,
    selectedIndices,
    processedItems,
    extracting,
    processing,
    saving,
    error,
    searchModalOpen,
    searchModalIndex,
    imagePopupUrl,
    setImagePopupUrl,
    excludedIndices,
    collapsedIndices,
    activeIndex,
    setActiveIndex,
    handleBackClick,
    handleExtract,
    handleSearch,
    handleSave,
    toggleSelect,
    toggleSelectAll,
    handleSearchResultChange,
    handleStatusChange,
    openManualSearch,
    updateExtractedItem,
    handleManualSearchSelect,
    toggleExclude,
    toggleCollapse,
    toggleCollapseAll,
    sortedIndices,
    savableCount,
    setSearchModalOpen,
    setSearchModalIndex,
  } = useCollect({ celebId, celebName })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/members/${celebId}/contents`}
          onClick={handleBackClick}
          className="text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{celebName}</h1>
            <p className="text-text-secondary text-sm">콘텐츠 수집</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Input Section */}
      <InputSection
        inputMode={inputMode}
        setInputMode={setInputMode}
        text={text}
        setText={setText}
        url={url}
        setUrl={setUrl}
        jsonText={jsonText}
        setJsonText={setJsonText}
        extracting={extracting}
        onExtract={handleExtract}
        promptCopied={promptCopied}
        setPromptCopied={setPromptCopied}
      />

      {/* Extracted Items */}
      <ExtractedList
        extractedItems={extractedItems}
        sortedIndices={sortedIndices}
        selectedIndices={selectedIndices}
        excludedIndices={excludedIndices}
        collapsedIndices={collapsedIndices}
        processedItems={processedItems}
        processing={processing}
        activeIndex={activeIndex}
        onToggleSelectAll={toggleSelectAll}
        onHandleSearch={handleSearch}
        onToggleCollapse={toggleCollapse}
        onToggleCollapseAll={toggleCollapseAll}
        onToggleSelect={toggleSelect}
        onToggleExclude={toggleExclude}
        onOpenManualSearch={openManualSearch}
        onUpdateExtractedItem={updateExtractedItem}
        onHandleSearchResultChange={handleSearchResultChange}
        onHandleStatusChange={handleStatusChange}
        onSetImagePopupUrl={setImagePopupUrl}
        onSetActiveIndex={setActiveIndex}
      />

      {/* Action Bar */}
      {extractedItems.length > 0 && (
        <ActionBar
          savableCount={savableCount}
          saving={saving}
          onSave={handleSave}
        />
      )}

      {/* Manual Search Modal */}
      {searchModalIndex !== null && (
        <ManualSearchModal
          isOpen={searchModalOpen}
          onClose={() => {
            setSearchModalOpen(false)
            setSearchModalIndex(null)
          }}
          onSelect={handleManualSearchSelect}
          contentType={extractedItems[searchModalIndex]?.type || 'BOOK'}
          initialQuery={
            extractedItems[searchModalIndex]?.titleKo ||
            extractedItems[searchModalIndex]?.title ||
            ''
          }
          initialCreator={extractedItems[searchModalIndex]?.creator || ''}
        />
      )}

      {/* Image Popup Modal */}
      <ImagePopup url={imagePopupUrl} onClose={() => setImagePopupUrl(null)} />
    </div>
  )
}
