#pragma once
#include <string>
#include <functional>

namespace margelo::anpos {

enum class ScanFormat {
  QR_CODE,
  EAN_13,
  EAN_8,
  CODE_128,
  CODE_39,
  UPC_A,
  UPC_E
};

struct ScanResult {
  std::string code;
  ScanFormat format;
};

using ScanCallback = std::function<void(const ScanResult&)>;

class AnposCamera {
public:
  void requestPermission(std::function<void(bool)> callback);
  bool isPermissionGranted();
  void startScan(ScanCallback callback);
  void stopScan();
};

} // namespace margelo::anpos
