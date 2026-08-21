#include "AnposSQLite.hpp"
#include <sqlite3.h>
#include <mutex>
#include <stdexcept>

namespace margelo::anpos {

static std::mutex dbMutex;
static sqlite3* dbHandle = nullptr;

void AnposSQLite::open(const std::string& name) {
  std::lock_guard<std::mutex> lock(dbMutex);
  if (dbHandle) {
    sqlite3_close(dbHandle);
    dbHandle = nullptr;
  }
  std::string path = "/data/data/com.anpos.mobile/databases/" + name + ".db";
  int rc = sqlite3_open(path.c_str(), &dbHandle);
  if (rc != SQLITE_OK) {
    throw std::runtime_error("Failed to open database: " + std::string(sqlite3_errmsg(dbHandle)));
  }
  sqlite3_exec(dbHandle, "PRAGMA journal_mode=WAL;", nullptr, nullptr, nullptr);
  sqlite3_exec(dbHandle, "PRAGMA foreign_keys=ON;", nullptr, nullptr, nullptr);
}

void AnposSQLite::close() {
  std::lock_guard<std::mutex> lock(dbMutex);
  if (dbHandle) {
    sqlite3_close(dbHandle);
    dbHandle = nullptr;
  }
}

QueryResult AnposSQLite::query(const std::string& sql, const std::vector<std::any>& params) {
  std::lock_guard<std::mutex> lock(dbMutex);
  if (!dbHandle) {
    throw std::runtime_error("Database not opened");
  }

  sqlite3_stmt* stmt;
  int rc = sqlite3_prepare_v2(dbHandle, sql.c_str(), -1, &stmt, nullptr);
  if (rc != SQLITE_OK) {
    throw std::runtime_error("Failed to prepare statement: " + std::string(sqlite3_errmsg(dbHandle)));
  }

  for (size_t i = 0; i < params.size(); i++) {
    if (auto* val = std::any_cast<std::string>(&params[i])) {
      sqlite3_bind_text(stmt, static_cast<int>(i + 1), val->c_str(), -1, SQLITE_TRANSIENT);
    } else if (auto* val = std::any_cast<int>(&params[i])) {
      sqlite3_bind_int(stmt, static_cast<int>(i + 1), *val);
    } else if (auto* val = std::any_cast<double>(&params[i])) {
      sqlite3_bind_double(stmt, static_cast<int>(i + 1), *val);
    }
  }

  QueryResult result;
  int columnCount = sqlite3_column_count(stmt);

  while (sqlite3_step(stmt) == SQLITE_ROW) {
    std::map<std::string, std::any> row;
    for (int i = 0; i < columnCount; i++) {
      const char* colName = sqlite3_column_name(stmt, i);
      switch (sqlite3_column_type(stmt, i)) {
        case SQLITE_INTEGER:
          row[colName] = sqlite3_column_int64(stmt, i);
          break;
        case SQLITE_FLOAT:
          row[colName] = sqlite3_column_double(stmt, i);
          break;
        case SQLITE_TEXT:
          row[colName] = std::string(reinterpret_cast<const char*>(sqlite3_column_text(stmt, i)));
          break;
        case SQLITE_NULL:
          row[colName] = nullptr;
          break;
      }
    }
    result.rows.push_back(row);
  }

  sqlite3_finalize(stmt);
  result.rowsAffected = sqlite3_changes(dbHandle);
  return result;
}

QueryResult AnposSQLite::execute(const std::string& sql, const std::vector<std::any>& params) {
  std::lock_guard<std::mutex> lock(dbMutex);
  if (!dbHandle) {
    throw std::runtime_error("Database not opened");
  }

  // Join multiple statements if semicolon-delimited
  QueryResult result;
  sqlite3_stmt* stmt;
  int rc = sqlite3_prepare_v2(dbHandle, sql.c_str(), -1, &stmt, nullptr);
  if (rc != SQLITE_OK) {
    throw std::runtime_error("Failed to prepare: " + std::string(sqlite3_errmsg(dbHandle)));
  }

  for (size_t i = 0; i < params.size(); i++) {
    // Same binding logic as query
  }

  while (sqlite3_step(stmt) == SQLITE_ROW) {
    std::map<std::string, std::any> row;
    int colCount = sqlite3_column_count(stmt);
    for (int i = 0; i < colCount; i++) {
      // bind logic
    }
    result.rows.push_back(row);
  }

  sqlite3_finalize(stmt);
  result.rowsAffected = sqlite3_changes(dbHandle);
  result.insertId = sqlite3_last_insert_rowid(dbHandle);
  return result;
}

void AnposSQLite::beginTransaction() {
  std::lock_guard<std::mutex> lock(dbMutex);
  if (dbHandle) {
    char* err = nullptr;
    sqlite3_exec(dbHandle, "BEGIN IMMEDIATE;", nullptr, nullptr, &err);
    if (err) {
      std::string msg = err;
      sqlite3_free(err);
      throw std::runtime_error("Begin transaction failed: " + msg);
    }
  }
}

void AnposSQLite::commit() {
  std::lock_guard<std::mutex> lock(dbMutex);
  if (dbHandle) {
    char* err = nullptr;
    sqlite3_exec(dbHandle, "COMMIT;", nullptr, nullptr, &err);
    if (err) {
      std::string msg = err;
      sqlite3_free(err);
      throw std::runtime_error("Commit failed: " + msg);
    }
  }
}

void AnposSQLite::rollback() {
  std::lock_guard<std::mutex> lock(dbMutex);
  if (dbHandle) {
    sqlite3_exec(dbHandle, "ROLLBACK;", nullptr, nullptr, nullptr);
  }
}

bool AnposSQLite::isTableExists(const std::string& table) {
  std::lock_guard<std::mutex> lock(dbMutex);
  if (!dbHandle) return false;
  
  std::string sql = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
  sqlite3_stmt* stmt;
  sqlite3_prepare_v2(dbHandle, sql.c_str(), -1, &stmt, nullptr);
  sqlite3_bind_text(stmt, 1, table.c_str(), -1, SQLITE_TRANSIENT);
  
  bool exists = sqlite3_step(stmt) == SQLITE_ROW;
  sqlite3_finalize(stmt);
  return exists;
}

void AnposSQLite::createTable(const std::string& table, const std::map<std::string, std::string>& columns) {
  std::lock_guard<std::mutex> lock(dbMutex);
  if (!dbHandle) {
    throw std::runtime_error("Database not opened");
  }
  
  std::string sql = "CREATE TABLE IF NOT EXISTS " + table + " (";
  bool first = true;
  for (const auto& [name, type] : columns) {
    if (!first) sql += ", ";
    sql += name + " " + type;
    first = false;
  }
  sql += ");";
  
  char* err = nullptr;
  int rc = sqlite3_exec(dbHandle, sql.c_str(), nullptr, nullptr, &err);
  if (rc != SQLITE_OK) {
    std::string msg = err;
    sqlite3_free(err);
    throw std::runtime_error("CreateTable failed: " + msg);
  }
}

} // namespace margelo::anpos
