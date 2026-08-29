package com.calltest.tester

import com.calltest.tester.data.models.MissionEvidenceModel
import com.calltest.tester.data.repository.InMemoryEvidenceRepository
import com.calltest.tester.ui.evidence.EvidenceReviewViewModel
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test

class EvidenceReviewViewModelTest {

    private lateinit var repository: InMemoryEvidenceRepository
    private lateinit var viewModel: EvidenceReviewViewModel

    private val sampleEvidence = MissionEvidenceModel(
        id = "evid-101",
        missionAttemptId = "attempt-1",
        campaignId = "camp-1",
        testerId = "tester-1",
        missionId = "m-1",
        fileReference = "screenshot.png",
        mimeType = "image/png",
        fileSize = 2048,
        sha256 = "hash123",
        status = "PENDING_REVIEW",
        submittedAt = "2026-08-22T06:00:00Z",
        createdAt = "2026-08-22T06:00:00Z",
        updatedAt = "2026-08-22T06:00:00Z"
    )

    @Before
    fun setUp() {
        repository = InMemoryEvidenceRepository(
            evidences = mutableListOf(sampleEvidence)
        )
        viewModel = EvidenceReviewViewModel(repository)
    }

    @Test
    fun loadMyEvidences_populatesStateWithSubmittedEvidences() = runBlocking {
        viewModel.loadMyEvidences("camp-1")
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertEquals(1, state.evidences.size)
        assertEquals("PENDING_REVIEW", state.evidences[0].status)
    }

    @Test
    fun claimInstallation_updatesInstallationStatusToClaimed() = runBlocking {
        viewModel.claimInstallation("camp-1")
        val state = viewModel.uiState.value

        assertEquals("INSTALL_CLAIMED", state.installationStatus)
    }

    @Test
    fun approveEvidence_updatesEvidenceStatusToApproved() = runBlocking {
        viewModel.approveEvidence("evid-101", "camp-1")
        val state = viewModel.uiState.value

        assertEquals("APPROVED", state.evidences[0].status)
    }

    @Test
    fun rejectEvidence_updatesEvidenceStatusToRejectedWithReason() = runBlocking {
        viewModel.rejectEvidence(
            evidenceId = "evid-101",
            campaignId = "camp-1",
            reason = "WRONG_SCREEN",
            comment = "Please capture the profile screen"
        )
        val state = viewModel.uiState.value

        assertEquals("REJECTED", state.evidences[0].status)
        assertEquals("WRONG_SCREEN", state.evidences[0].rejectionReason)
    }
}
