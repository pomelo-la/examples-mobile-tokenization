"use client";

import Image from "next/image";
import { useGooglePayProvisioning } from "@/lib/google/use-google-pay-provisioning";
import type { PomeloCardResponse } from "@/lib/pomelo/cards";

/**
 * "Add to Google Pay" button following Google's brand guidelines.
 *
 * The image is served by Google and localized automatically based on the
 * user's locale. The `rel="opener"` attribute is required to prevent E008
 * errors during the Web Push Provisioning flow.
 *
 * Reserve width between 100 to 300px for the button; actual size depends on
 * the user's locale.
 */
export function AddToGooglePayButton({
	card,
}: {
	card: PomeloCardResponse;
}) {
	const { start } = useGooglePayProvisioning(card, {
		onSuccess: (payload) => {
			console.info("Google Pay provisioning success:", payload);
			if (payload.tokenResult === 1) {
				alert("¡Tarjeta agregada a Google Pay!");
			} else if (payload.cardResult === 1) {
				alert("¡Tarjeta guardada en tu cuenta Google!");
			}
		},
		onFailure: (failure) => {
			console.error("Google Pay provisioning failure:", failure);
			if (failure.reason === "device-not-supported") {
				alert("No encontramos un Android compatible en tu cuenta Google");
			} else if (failure.reason === "cancelled") {
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
