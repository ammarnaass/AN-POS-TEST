#pragma once
#include <string>
#include <vector>

namespace margelo::anpos {

struct ReceiptItem {
  std::string name;
  int32_t qty;
  double unitPrice;
  double lineTotal;
};

struct ReceiptData {
  std::string shopName;
  std::string number;
  std::string date;
  std::vector<ReceiptItem> items;
  double subtotal;
  double discount;
  double tax;
  double total;
  std::string paymentMethod;
  std::string customerName;
  std::string soldBy;
};

struct BluetoothPrinter {
  std::string name;
  std::string address;
  std::string type; // bluetooth, usb, lan
};

struct BarcodeData {
  std::string type;
  std::string value;
  int32_t height;
  int32_t width;
};

class AnposPrinter {
public:
  std::vector<BluetoothPrinter> discoverPrinters();
  bool connect(const std::string& address, const std::string& type);
  void disconnect();
  bool printReceipt(const ReceiptData& data);
  bool printBarcode(const BarcodeData& data);
  void cutPaper();
  void openCashDrawer();
};

} // namespace margelo::anpos
