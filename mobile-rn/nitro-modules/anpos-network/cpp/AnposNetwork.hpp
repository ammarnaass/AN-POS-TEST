#pragma once
#include <string>
#include <vector>

namespace margelo::anpos {

struct NetworkInterface {
  std::string name;
  std::string ip;
  bool isInternal;
};

struct NetworkInfo {
  std::vector<NetworkInterface> interfaces;
  std::string localIP;
  std::string gateway;
  std::string subnet;
  std::string ssid;
  bool isOnline;
  bool isOnWifi;
};

class AnposNetwork {
public:
  std::vector<NetworkInterface> getInterfaces();
  std::string getLocalIP();
  std::string getGateway();
  std::string getSubnet();
  std::string getSSID();
  bool isOnline();
  bool isOnWifi();
};

} // namespace margelo::anpos
