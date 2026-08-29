package com.calltest.sdk.storage

interface StorageAdapter {
    fun save(key: String, value: String)
    fun get(key: String): String?
    fun remove(key: String)
    fun clear()
}

class InMemoryStorageAdapter : StorageAdapter {
    private val store = mutableMapOf<String, String>()

    override fun save(key: String, value: String) {
        store[key] = value
    }

    override fun get(key: String): String? {
        return store[key]
    }

    override fun remove(key: String) {
        store.remove(key)
    }

    override fun clear() {
        store.clear()
    }
}
