#include "AnposSecureStore.hpp"
#ifdef __ANDROID__
#include <jni.h>
#include <android/log.h>
#endif
#include <fstream>
#include <filesystem>

namespace margelo::anpos {

static const char* SECURE_FILE = "/data/data/com.anpos.mobile/files/.secure_store";

void AnposSecureStore::setItem(const std::string& key, const std::string& value) {
  std::map<std::string, std::string> store = {};
  
  // Load existing
  std::ifstream in(SECURE_FILE);
  if (in.is_open()) {
    std::string line;
    while (std::getline(in, line)) {
      auto delim = line.find('=');
      if (delim != std::string::npos) {
        store[line.substr(0, delim)] = line.substr(delim + 1);
      }
    }
  }
  
  store[key] = value;
  in.close();
  
  // Save
  std::ofstream out(SECURE_FILE, std::ios::trunc);
  for (const auto& [k, v] : store) {
    out << k << "=" << v << "\n";
  }
  out.close();
}

std::optional<std::string> AnposSecureStore::getItem(const std::string& key) {
  std::ifstream in(SECURE_FILE);
  if (!in.is_open()) return std::nullopt;
  
  std::string line;
  while (std::getline(in, line)) {
    auto delim = line.find('=');
    if (delim != std::string::npos) {
      if (line.substr(0, delim) == key) {
        return line.substr(delim + 1);
      }
    }
  }
  return std::nullopt;
}

void AnposSecureStore::removeItem(const std::string& key) {
  std::map<std::string, std::string> store = {};
  std::ifstream in(SECURE_FILE);
  if (in.is_open()) {
    std::string line;
    while (std::getline(in, line)) {
      auto delim = line.find('=');
      if (delim != std::string::npos) {
        std::string k = line.substr(0, delim);
        if (k != key) {
          store[k] = line.substr(delim + 1);
        }
      }
    }
  }
  in.close();
  
  std::ofstream out(SECURE_FILE, std::ios::trunc);
  for (const auto& [k, v] : store) {
    out << k << "=" << v << "\n";
  }
  out.close();
}

void AnposSecureStore::clear() {
  std::filesystem::remove(SECURE_FILE);
}

std::vector<std::string> AnposSecureStore::getAllKeys() {
  std::vector<std::string> keys;
  std::ifstream in(SECURE_FILE);
  if (!in.is_open()) return keys;
  
  std::string line;
  while (std::getline(in, line)) {
    auto delim = line.find('=');
    if (delim != std::string::npos) {
      keys.push_back(line.substr(0, delim));
    }
  }
  return keys;
}

} // namespace margelo::anpos
