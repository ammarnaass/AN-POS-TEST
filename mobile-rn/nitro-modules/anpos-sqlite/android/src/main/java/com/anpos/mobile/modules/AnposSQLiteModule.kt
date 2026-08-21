package com.anpos.mobile.modules

import com.anpos.mobile.modules.AnposSQLiteSpec
import com.anpos.mobile.modules.AnposSQLiteSpec.AnglerQueryResult
import com.anpos.mobile.modules.AnposSQLiteSpec.AnglerBindValue
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.database.sqlite.SQLiteDatabase.CursorFactory
import android.database.Cursor
import java.lang.Exception

@ReactModule(name = AnposSQLiteModule.NAME)
class AnposSQLiteModule(reactContext: ReactApplicationContext) : AnposSQLiteSpec(reactContext) {

  private var db: SQLiteDatabase? = null
  private val dbLock = java.lang.Object()

  override fun getName(): String = NAME

  override fun open(name: String) {
    synchronized(dbLock) {
      db?.close()
      val dbFile = reactApplicationContext.getDatabasePath(name + ".db")
      db = SQLiteDatabase.openOrCreateDatabase(dbFile, null)
      db?.execSQL("PRAGMA journal_mode=WAL;")
      db?.execSQL("PRAGMA foreign_keys=ON;")
    }
  }

  override fun close() {
    synchronized(dbLock) {
      db?.close()
      db = null
    }
  }

  private fun bindArgs(stmt: android.database.sqlite.SQLiteStatement, params: ReadableArray) {
    for (i in 0 until params.size()) {
      val value = params[i]
      when (value) {
        is String -> stmt.bindString(i + 1, value)
        is Int -> stmt.bindLong(i + 1, value.toLong())
        is Long -> stmt.bindLong(i + 1, value)
        is Double -> stmt.bindDouble(i + 1, value)
        is Boolean -> stmt.bindLong(i + 1, if (value) 1L else 0L)
        null -> stmt.bindNull(i + 1)
      }
    }
  }

  override fun execute(sql: String, params: ReadableArray?): AnglerQueryResult {
    synchronized(dbLock) {
      val db = this.db ?: throw Exception("Database not opened")
      val rows = Arguments.createArray()
      var rowsAffected = 0
      var insertId = 0L

      db.beginTransaction()
      try {
        if (params != null && params.size() > 0) {
          val stmt = db.compileStatement(normalizeSqlForCompile(sql))
          bindArgs(stmt, params)
          rowsAffected = stmt.executeUpdateDelete()
          insertId = stmt.insertRowId
        } else {
          db.execSQL(sql)
          rowsAffected = db.changes
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }

      return AnglerQueryResult.Builder()
        .setRows(rows)
        .setRowsAffected(rowsAffected)
        .setInsertId(insertId)
        .build()
    }
  }

  override fun query(sql: String, params: ReadableArray?): AnglerQueryResult {
    synchronized(dbLock) {
      val db = this.db ?: throw Exception("Database not opened")
      val rows = Arguments.createArray()
      var rowsAffected = 0

      val cursor = if (params != null && params.size() > 0) {
        db.query(true, sql, null, paramsToStringArray(params), null, null, null, null)
      } else {
        db.query(sql)
      }

      val columnNames = cursor.columnNames
      while (cursor.moveToNext()) {
        val map = Arguments.createMap()
        for (i in columnNames.indices) {
          val value = cursor.getString(i)
          map.putNull("column", value)
        }
        rows.pushMap(map)
      }
      cursor.close()
      rowsAffected = cursor.count

      return AnglerQueryResult.Builder()
        .setRows(rows)
        .setRowsAffected(rowsAffected)
        .setInsertId(-1L)
        .build()
    }
  }

  override fun beginTransaction() {
    synchronized(dbLock) {
      val db = this.db ?: throw Exception("Database not opened")
      db.beginTransaction()
      db.setTransactionSuccessful()
      db.endTransaction()
    }
  }

  override fun commit() {
    synchronized(dbLock) {
      val db = this.db ?: throw Exception("Database not opened")
      db.setTransactionSuccessful()
      db.endTransaction()
    }
  }

  override fun rollback() {
    synchronized(dbLock) {
      val db = this.db ?: throw Exception("Database not opened")
      db.endTransaction()
    }
  }

  override fun isTableExists(table: String): Boolean {
    synchronized(dbLock) {
      val db = this.db ?: throw Exception("Database not opened")
      val cursor = db.query(
        "sqlite_master",
        arrayOf("name"),
        "type = ? AND name = ?",
        arrayOf("table", table),
        null, null, null
      )
      val exists = cursor.count > 0
      cursor.close()
      return exists
    }
  }

  override fun createTable(table: String, columns: ReadableMap) {
    synchronized(dbLock) {
      val db = this.db ?: throw Exception("Database not opened")
      val sql = buildCreateTableSql(table, columns)
      db.execSQL(sql)
    }
  }

  private fun buildCreateTableSql(table: String, columns: ReadableMap): String {
    val sb = StringBuilder("CREATE TABLE IF NOT EXISTS $table (")
    val iterator = columns.keySetIterator()
    var first = true
    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()
      val type = columns.getString(key)
      if (!first) sb.append(", ")
      sb.append("$key $type")
      first = false
    }
    sb.append(");")
    return sb.toString()
  }

  private fun normalizeSqlForCompile(sql: String): String {
    // Simple approach: extract only first INSERT/UPDATE/DELETE
    return sql.substringBefore(";")
  }

  private fun paramsToStringArray(params: ReadableArray): Array<String> {
    val arr = arrayOfNulls<String>(params.size())
    for (i in 0 until params.size()) {
      arr[i] = params[i]?.toString()
    }
    @Suppress("UNCHECKED_CAST")
    return arr as Array<String>
  }

  companion object {
    const val NAME = "AnposSQLite"
  }
}
