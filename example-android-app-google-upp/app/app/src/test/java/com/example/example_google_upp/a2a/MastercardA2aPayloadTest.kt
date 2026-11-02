package com.example.example_google_upp.a2a.models

import com.example.example_google_upp.model.Brand
import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.util.Base64

class MastercardA2aPayloadTest {

    private val gson = Gson()

    private fun encode(json: String): String =
        Base64.getEncoder().encodeToString(json.toByteArray(Charsets.UTF_8))

    @Test
    fun `payload valido parsea todos los campos correctamente`() {
        val json = """{"paymentAppProviderId":"222","paymentAppInstanceId":"mdesQeItf121695046504798","tokenUniqueReference":"DT56MC00001143932a6956bc8aa44d58b293344a72450027","accountPanSuffix":"9911","accountExpiry":"0724"}"""

        val result = MastercardA2aPayload.fromExtraText(encode(json), gson)

        assertNotNull(result)
        assertEquals("222", result?.paymentAppProviderId)
        assertEquals("mdesQeItf121695046504798", result?.paymentAppInstanceId)
        assertEquals("DT56MC00001143932a6956bc8aa44d58b293344a72450027", result?.tokenUniqueReference)
        assertEquals("9911", result?.accountPanSuffix)
        assertEquals("0724", result?.accountExpiry)
    }

    @Test
    fun `extraText nulo devuelve null`() {
        assertNull(MastercardA2aPayload.fromExtraText(null, gson))
    }

    @Test
    fun `extraText vacio devuelve null`() {
        assertNull(MastercardA2aPayload.fromExtraText("", gson))
    }

    @Test
    fun `extraText en blanco devuelve null`() {
        assertNull(MastercardA2aPayload.fromExtraText("   ", gson))
    }

    @Test
    fun `base64 invalido devuelve null`() {
        assertNull(MastercardA2aPayload.fromExtraText("!!!invalid-base64!!!", gson))
    }

    @Test
    fun `JSON invalido en base64 devuelve null`() {
        assertNull(MastercardA2aPayload.fromExtraText(encode("esto no es json"), gson))
    }

    @Test
    fun `JSON valido con campos faltantes devuelve payload con esos campos en null`() {
        val result = MastercardA2aPayload.fromExtraText(
            encode("""{"tokenUniqueReference":"TUR-1","accountPanSuffix":"9999"}"""),
            gson,
        )

        assertNotNull(result)
        assertNull(result?.paymentAppProviderId)
        assertNull(result?.paymentAppInstanceId)
        assertNull(result?.accountExpiry)
        assertEquals("TUR-1", result?.tokenUniqueReference)
        assertEquals("9999", result?.accountPanSuffix)
    }

    @Test
    fun `toA2aCard mapea tokenUniqueReference, accountPanSuffix y marca MASTERCARD`() {
        val card = MastercardA2aPayload(
            tokenUniqueReference = "TUR-1",
            accountPanSuffix = "9911",
        ).toA2aCard()

        assertEquals(A2aCard(tokenId = "TUR-1", lastFour = "9911", brand = Brand.MASTERCARD), card)
    }

    @Test
    fun `toA2aCard sin accountPanSuffix usa placeholder`() {
        val card = MastercardA2aPayload(tokenUniqueReference = "TUR-1").toA2aCard()

        assertEquals("••••", card?.lastFour)
    }

    @Test
    fun `toA2aCard sin tokenUniqueReference devuelve null`() {
        assertNull(MastercardA2aPayload(accountPanSuffix = "9911").toA2aCard())
        assertNull(MastercardA2aPayload(tokenUniqueReference = "", accountPanSuffix = "9911").toA2aCard())
    }
}
