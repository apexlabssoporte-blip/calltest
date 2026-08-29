package com.calltest.sdk.queue

import kotlinx.serialization.Serializable

@Serializable
data class SdkEvent(
    val eventId: String,
    val eventType: String,
    val timestamp: Long,
    val payload: String
)

interface EventQueue {
    fun enqueue(event: SdkEvent): Boolean
    fun peekBatch(maxSize: Int): List<SdkEvent>
    fun removeBatch(eventIds: List<String>)
    fun size(): Int
}

class InMemoryEventQueue(private val capacity: Int = 500) : EventQueue {
    private val queue = mutableListOf<SdkEvent>()

    @Synchronized
    override fun enqueue(event: SdkEvent): Boolean {
        if (queue.size >= capacity) return false
        return queue.add(event)
    }

    @Synchronized
    override fun peekBatch(maxSize: Int): List<SdkEvent> {
        return queue.take(maxSize)
    }

    @Synchronized
    override fun removeBatch(eventIds: List<String>) {
        queue.removeAll { eventIds.contains(it.eventId) }
    }

    @Synchronized
    override fun size(): Int = queue.size
}
