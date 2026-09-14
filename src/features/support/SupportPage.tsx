import React, { useState } from 'react';
import type { ViewTab } from './types';
import {
  useSupportData,
  useSupportFilters,
  useSupportAssistantChat,
  useSupportTicket,
} from './hooks';
import {
  SupportHeroHeader,
  SupportDiagnosticsBar,
  SupportTabsNavigation,
  SupportAssistantTab,
  SupportGuidesTab,
  SupportFeaturesTab,
  SupportFaqsTab,
  SupportContactTab,
  SupportTicketModal,
} from './components';

export default function SupportPage() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('assistant');

  // 1. Store settings & Contact data
  const { contactInfo } = useSupportData();

  // 2. Search & Category Filters + FAQs/Guides State
  const {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    activeGuide,
    setActiveGuideId,
    openFaq,
    setOpenFaq,
    copiedId,
    feedbackGiven,
    filteredGuides,
    filteredFeatures,
    filteredFaqs,
    handleCopyText,
    handleCopyFaq,
    handleFeedback,
    resetFilters,
  } = useSupportFilters();

  // 3. Smart AI Assistant Chat Engine
  const {
    chatMessages,
    assistantInput,
    setAssistantInput,
    isAssistantThinking,
    chatEndRef,
    handleSendMessage,
    handleResetChat,
  } = useSupportAssistantChat();

  // 4. Internal Support Ticket State & Handlers
  const {
    isTicketModalOpen,
    ticketSent,
    ticketForm,
    openTicketModal,
    closeTicketModal,
    updateTicketFormField,
    handleSendTicket,
  } = useSupportTicket(contactInfo?.phone1Raw || contactInfo?.phone1 || '');

  return (
    <div className="min-h-screen bg-surface-container-lowest/40 p-4 md:p-8 font-cairo space-y-8 max-w-7xl mx-auto pb-24">
      {/* 1. HERO HEADER & SEARCH */}
      <SupportHeroHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        contactInfo={contactInfo}
      />

      {/* 2. REAL-TIME ARCHITECTURAL DIAGNOSTICS */}
      <SupportDiagnosticsBar />

      {/* 3. NAVIGATION TABS */}
      <SupportTabsNavigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      {/* 4. ACTIVE TAB CONTENT VIEW */}
      <main className="transition-all duration-300">
        {currentTab === 'assistant' && (
          <SupportAssistantTab
            chatMessages={chatMessages}
            assistantInput={assistantInput}
            setAssistantInput={setAssistantInput}
            isAssistantThinking={isAssistantThinking}
            chatEndRef={chatEndRef}
            copiedId={copiedId}
            handleSendMessage={handleSendMessage}
            handleResetChat={handleResetChat}
            handleCopyText={handleCopyText}
          />
        )}

        {currentTab === 'guides' && (
          <SupportGuidesTab
            filteredGuides={filteredGuides}
            activeGuide={activeGuide}
            setActiveGuideId={setActiveGuideId}
            searchQuery={searchQuery}
            resetFilters={resetFilters}
          />
        )}

        {currentTab === 'features' && (
          <SupportFeaturesTab
            filteredFeatures={filteredFeatures}
            searchQuery={searchQuery}
            resetFilters={resetFilters}
          />
        )}

        {currentTab === 'faqs' && (
          <SupportFaqsTab
            filteredFaqs={filteredFaqs}
            openFaq={openFaq}
            setOpenFaq={setOpenFaq}
            copiedId={copiedId}
            feedbackGiven={feedbackGiven}
            searchQuery={searchQuery}
            handleCopyFaq={handleCopyFaq}
            handleFeedback={handleFeedback}
            resetFilters={resetFilters}
          />
        )}

        {currentTab === 'contact' && (
          <SupportContactTab
            contactInfo={contactInfo}
            openTicketModal={openTicketModal}
          />
        )}
      </main>

      {/* 5. INTERNAL TICKET MODAL */}
      <SupportTicketModal
        isOpen={isTicketModalOpen}
        onClose={closeTicketModal}
        ticketSent={ticketSent}
        ticketForm={ticketForm}
        onFieldChange={updateTicketFormField}
        onSubmit={handleSendTicket}
      />
    </div>
  );
}
