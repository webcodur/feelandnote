'use client'

import ManualSearchModal from '../ManualSearchModal'
import { useCollect } from '../collect/lib/hooks'
import InputSection from '../collect/components/InputSection'
import ExtractedList from '../collect/components/ExtractedList'
import ActionBar from '../collect/components/ActionBar'
import ImagePopup from '../collect/components/ImagePopup'

interface Props {
  celebId: string
  celebName: string
}

export default function ContentCollector({ celebId, celebName }: Props) {
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
        />
      )}

      {/* Image Popup Modal */}
      <ImagePopup url={imagePopupUrl} onClose={() => setImagePopupUrl(null)} />
    </div>
  )
}
