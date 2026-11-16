"use client";

import Image from "next/image";
import type { MouseEventHandler } from "react";

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
	onClick,
	locale,
	disabled,
}: {
	onClick?: MouseEventHandler<HTMLButtonElement>;
	/** BCP 47 tag to force a specific locale (e.g. "es-419", "en-US"). */
	locale?: string;
	disabled?: boolean;
}) {
	const imageUrl = locale
		? `https://pay.google.com/gp/v/a/pushprovisioning/saveButtonImage?hl=${encodeURIComponent(locale)}`
		: "https://pay.google.com/gp/v/a/pushprovisioning/saveButtonImage";

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label="Agregar a Google Pay"
			className="flex h-11.5 w-full items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Image
				src={imageUrl}
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
