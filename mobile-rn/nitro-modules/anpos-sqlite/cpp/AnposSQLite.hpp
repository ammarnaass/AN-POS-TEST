#pragma once
#include <NitroModules/Types.hpp>
#include <NitroModules/HybridObject.hpp>
#include <string>
#include <vector>
#include <map>
#include <optional>

namespace margelo::anpos {

struct QueryResult {
  std::vector<std::map<std::string, std::any>> rows;
  size_t rowsAffected;
  std::optional<int64_t> insertId;
};

class AnposSQLite {
public:
  void open(const std::string& name);
  void close();
  QueryResult execute(const std::string& sql, const std::vector<std::any>& params);
  QueryResult query(const std::string& sql, const std::vector<std::any>& params);
  void beginTransaction();
  void commit();
  void rollback();
  bool isTableExists(const std::string& table);
  void createTable(const std::string& table, const std::map<std::string, std::string>& columns);
};

} // namespace margelo::anpos
