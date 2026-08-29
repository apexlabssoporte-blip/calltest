package com.calltest.tester

import com.calltest.tester.ui.rewards.RewardItem
import com.calltest.tester.ui.rewards.RewardsRepository
import com.calltest.tester.ui.rewards.RewardsSummary
import com.calltest.tester.ui.rewards.RewardsViewModel
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class FakeRewardsRepository : RewardsRepository {
    var summaryResult: Result<RewardsSummary> = Result.success(
        RewardsSummary(
            userId = "tester-1",
            totalXp = 150,
            totalGold = 30,
            completedMissionsCount = 8,
            completedCampaignsCount = 2,
            recentRewards = listOf(
                RewardItem(
                    id = "rew-1",
                    userId = "tester-1",
                    sourceType = "MISSION_VALIDATED",
                    sourceId = "att-1",
                    amount = 10,
                    xpAmount = 10,
                    goldAmount = 2,
                    reason = "Mission completed",
                    createdAt = "2026-08-22T00:00:00Z"
                ),
                RewardItem(
                    id = "rew-2",
                    userId = "tester-1",
                    sourceType = "CAMPAIGN_PARTICIPATION_COMPLETED",
                    sourceId = "ct-1",
                    amount = 25,
                    xpAmount = 25,
                    goldAmount = 5,
                    reason = "14 days participation completed",
                    createdAt = "2026-08-22T01:00:00Z"
                )
            )
        )
    )

    override suspend fun getRewardsSummary(): Result<RewardsSummary> {
        return summaryResult
    }

    override suspend fun getRewardHistory(
        page: Int,
        limit: Int,
        sourceType: String?
    ): Result<List<RewardItem>> {
        val all = summaryResult.getOrNull()?.recentRewards ?: emptyList()
        return if (sourceType != null) {
            Result.success(all.filter { it.sourceType == sourceType })
        } else {
            Result.success(all)
        }
    }
}

class RewardsViewModelTest {

    private lateinit var repository: FakeRewardsRepository
    private lateinit var viewModel: RewardsViewModel

    @Before
    fun setUp() {
        repository = FakeRewardsRepository()
        viewModel = RewardsViewModel(repository)
    }

    @Test
    fun loadRewardsData_populatesBalanceAndRecentLedger() = runBlocking {
        viewModel.loadRewardsData()

        val state = viewModel.uiState.value
        assertNotNull(state.summary)
        assertEquals(150, state.totalXp)
        assertEquals(30, state.totalGold)
        assertEquals(2, state.historyItems.size)
        assertEquals("MISSION_VALIDATED", state.historyItems[0].sourceType)
    }

    @Test
    fun filterBySourceType_filtersLedgerItemsCorrectly() = runBlocking {
        viewModel.loadRewardsData()
        viewModel.filterBySourceType("CAMPAIGN_PARTICIPATION_COMPLETED")

        val state = viewModel.uiState.value
        assertEquals("CAMPAIGN_PARTICIPATION_COMPLETED", state.activeFilter)
        assertEquals(1, state.historyItems.size)
        assertEquals("CAMPAIGN_PARTICIPATION_COMPLETED", state.historyItems[0].sourceType)
    }
}
