"use client";

import Image from "next/image";
import { useGooglePayProvisioning } from "@/lib/google/use-google-pay-provisioning";
import type { PomeloCardResponse } from "@/lib/pomelo/cards";

/**
 * Botón "Agregar a Google Pay" según las brand guidelines de Google.
 *
 * La imagen la sirve Google y se localiza automáticamente según el idioma
 * del usuario (acá se fuerza con `hl=es-419`). El atributo `rel="opener"` es
 * obligatorio para evitar errores E008 durante el flujo de Web Push Provisioning.
 *
 * Hay que reservar entre 100 y 300px de ancho para el botón; el tamaño real
 * depende del idioma. Google recomienda ocultar el botón en navegadores no
 * soportados (solo las últimas versiones de Chrome, Firefox, Edge y Safari).
 *
 * Docs:
 * https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#brand_guidelines
 * https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#supported_browsers
 */
export function AddToGooglePayButton({
	card,
}: {
	card: PomeloCardResponse;
}) {
	const { start } = useGooglePayProvisioning(card, {
		onSuccess: (payload) => {
			console.info("Google Pay provisioning success:", payload);
			// El éxito puede ser parcial: tokenizada en el dispositivo, solo guardada
			// en la cuenta de Google, o ambas. Se revisa cada resultado para informar
			// al usuario qué pasó.
			if (payload.tokenResult === 1) {
				alert("¡Tarjeta agregada a Google Pay!");
			} else if (payload.cardResult === 1) {
				alert("¡Tarjeta guardada en tu cuenta Google!");
			}
		},
		onFailure: (failure) => {
			console.error("Google Pay provisioning failure:", failure);
			if (failure.reason === "cancelled") {
				alert("Se cerró la ventana de Google Pay");
			} else if (failure.reason === "popup-blocked") {
				alert(
					"Tu navegador bloqueó la ventana de Google Pay. Permití las ventanas emergentes y volvé a intentar.",
				);
			} else {
				alert("No pudimos agregar la tarjeta a Google Pay");
			}
		},
	});

	// `start` se asocia directo al click para que `openAppWindow` corra dentro del
	// gesto del usuario; agregar trabajo asincrónico antes haría que se bloquee la ventana.
	return (
		<button
			type="button"
			onClick={start}
			aria-label="Agregar a Google Pay"
			className="flex h-11.5 w-full items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<Image
				src="https://pay.google.com/gp/v/a/pushprovisioning/saveButtonImage?hl=es-419"
				width={300}
				height={46}
				alt=""
				className="h-11.5 w-auto"
				unoptimized
				{...({ rel: "opener" } as { rel: string })}
			/>
		</button>
	);
}
