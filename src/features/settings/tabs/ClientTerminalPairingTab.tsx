import React from 'react';
import {
  useClientTerminalPairing,
  ClientTerminalHeader,
  SectionTabSwitcher,
  ActivePairedSessionCard,
  NewTerminalPairingForm,
  MasterServerInfoSection,
} from './clientTerminal';

export default function ClientTerminalPairingTab() {
  const pairing = useClientTerminalPairing();

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full font-tajawal animate-fade-in pb-12" dir="rtl">
      {/* 1. الشريط العلوي ومعالج الإعداد السريع */}
      <ClientTerminalHeader
        isPaired={pairing.isPaired}
        showSetupWizard={pairing.showSetupWizard}
        setShowSetupWizard={pairing.setShowSetupWizard}
        onWizardCompleted={pairing.handleWizardCompleted}
      />

      {/* 2. شريط التبديل بين القسمين الرئيسيين */}
      <SectionTabSwitcher
        activeSection={pairing.activeSection}
        setActiveSection={pairing.setActiveSection}
      />

      {/* 3. قسم اقتران نقطة البيع الفرعية (محطة الكاشير) */}
      {pairing.activeSection === 'pairing' && (
        <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
          {pairing.isPaired ? (
            <ActivePairedSessionCard
              isUnpairingLoading={pairing.isUnpairingLoading}
              activeServerUrl={pairing.activeServerUrl}
              activeDeviceId={pairing.activeDeviceId}
              copiedField={pairing.copiedField}
              testClientUrlLoading={pairing.testClientUrlLoading}
              testClientUrlResult={pairing.testClientUrlResult}
              handleUnpairServer={pairing.handleUnpairServer}
              handleCopy={pairing.handleCopy}
              handleTestServerConnection={pairing.handleTestServerConnection}
            />
          ) : (
            <NewTerminalPairingForm
              connectionMethod={pairing.connectionMethod}
              setConnectionMethod={pairing.setConnectionMethod}
              isScanningServers={pairing.isScanningServers}
              scanPerformed={pairing.scanPerformed}
              discoveredServers={pairing.discoveredServers}
              clientUrlInput={pairing.clientUrlInput}
              setClientUrlInput={pairing.setClientUrlInput}
              clientTermCodeInput={pairing.clientTermCodeInput}
              setClientTermCodeInput={pairing.setClientTermCodeInput}
              pairingKeyInput={pairing.pairingKeyInput}
              setPairingKeyInput={pairing.setPairingKeyInput}
              showPairKeyInput={pairing.showPairKeyInput}
              setShowPairKeyInput={pairing.setShowPairKeyInput}
              isPairingLoading={pairing.isPairingLoading}
              testClientUrlLoading={pairing.testClientUrlLoading}
              testClientUrlResult={pairing.testClientUrlResult}
              pairingStatusResult={pairing.pairingStatusResult}
              handleScanLanServers={pairing.handleScanLanServers}
              handleTestServerConnection={pairing.handleTestServerConnection}
              handlePairWithServer={pairing.handlePairWithServer}
            />
          )}
        </div>
      )}

      {/* 4. قسم إعداد وهوية الخادم الرئيسي ومعلوماته */}
      {pairing.activeSection === 'server_info' && (
        <MasterServerInfoSection
          activeServerUrl={pairing.activeServerUrl}
          clientUrlInput={pairing.clientUrlInput}
          copiedField={pairing.copiedField}
          testClientUrlLoading={pairing.testClientUrlLoading}
          testClientUrlResult={pairing.testClientUrlResult}
          liveEventBusStatus={pairing.liveEventBusStatus}
          showMasterServerKey={pairing.showMasterServerKey}
          setShowMasterServerKey={pairing.setShowMasterServerKey}
          effectiveServerKey={pairing.effectiveServerKey}
          effectivePairingData={pairing.effectivePairingData}
          handleCopy={pairing.handleCopy}
          handleTestServerConnection={pairing.handleTestServerConnection}
          handleMakeServerMaster={pairing.handleMakeServerMaster}
        />
      )}
    </div>
  );
}
