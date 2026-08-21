#pragma once
#include <NitroModules/Types.hpp>
#include <NitroModules/HybridObject.hpp>
#include <string>
#include <optional>

namespace margelo::anpos {

class AnposSecureStore {
public:
  void setItem(const std::string& key, const std::string& value);
  std::optional<std::string> getItem(const std::string& key);
  void removeItem(const std::string& key);
  void clear();
  std::vector<std::string> getAllKeys();
};

} // namespace margelo::anpos
