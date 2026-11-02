package com.example.example_google_upp.a2a

import com.example.example_google_upp.a2a.models.StepUpResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MastercardAuthResultResolverTest {

    private val tur = "DT56MC00001143932a6956bc8aa44d58b293344a72450027"

    @Test
    fun `Approved devuelve APPROVED y tokenUniqueReference`() {
        val intent = MastercardAuthResultResolver.toResultIntent(StepUpResult.Approved, tur)

        assertEquals("APPROVED", intent.getStringExtra("issuerMobileAppAuthResponse"))
        assertEquals(tur, intent.getStringExtra("tokenUniqueReference"))
    }

    @Test
    fun `Declined devuelve DECLINED y tokenUniqueReference`() {
        val intent = MastercardAuthResultResolver.toResultIntent(StepUpResult.Declined, tur)

        assertEquals("DECLINED", intent.getStringExtra("issuerMobileAppAuthResponse"))
        assertEquals(tur, intent.getStringExtra("tokenUniqueReference"))
    }

    @Test
    fun `Failure devuelve FAILURE y tokenUniqueReference`() {
        val intent = MastercardAuthResultResolver.toResultIntent(StepUpResult.Failure("Network error"), tur)

        assertEquals("FAILURE", intent.getStringExtra("issuerMobileAppAuthResponse"))
        assertEquals(tur, intent.getStringExtra("tokenUniqueReference"))
    }

    @Test
    fun `Declined sin tokenUniqueReference para payload invalido`() {
        val intent = MastercardAuthResultResolver.toResultIntent(StepUpResult.Declined, null)

        assertEquals("DECLINED", intent.getStringExtra("issuerMobileAppAuthResponse"))
        assertNull(intent.getStringExtra("tokenUniqueReference"))
    }
}
