// Types of the Google Pay Unified Web Push Provisioning JavaScript library
// (window.googlepay). The library ships as a static script and creates the
// `googlepay` namespace on `window`; these types describe the surface the
// wallet uses, so nothing here is a Pomelo concept.

/** Error codes reported by the app or thrown by the library. */
export type GooglePayErrorCode = `E${string}`;

/** One entry of the `errors` / `nonFatalErrors` lists; only `errorCode` is documented. */
export interface GooglePayError {
	errorCode: GooglePayErrorCode;
}

// Accepted `tokenCredentials.cardNetwork` values.
export type CardNetwork =
	| "CARD_NETWORK_AMEX"
	| "CARD_NETWORK_DISCOVER"
	| "CARD_NETWORK_MASTERCARD"
	| "CARD_NETWORK_VISA"
	| "CARD_NETWORK_INTERAC"
	| "CARD_NETWORK_PRIVATE_LABEL"
	| "CARD_NETWORK_EFTPOS"
	| "CARD_NETWORK_MAESTRO"
	| "CARD_NETWORK_ID"
	| "CARD_NETWORK_QUICPAY"
	| "CARD_NETWORK_JCB"
	| "CARD_NETWORK_ELO";

// Accepted `tokenCredentials.tokenServiceProvider` values.
export type TokenServiceProvider =
	| "TOKEN_PROVIDER_AMEX"
	| "TOKEN_PROVIDER_MASTERCARD"
	| "TOKEN_PROVIDER_VISA"
	| "TOKEN_PROVIDER_DISCOVER"
	| "TOKEN_PROVIDER_EFTPOS"
	| "TOKEN_PROVIDER_INTERAC"
	| "TOKEN_PROVIDER_OBERTHUR"
	| "TOKEN_PROVIDER_PAYPAL"
	| "TOKEN_PROVIDER_JCB"
	| "TOKEN_PROVIDER_ELO"
	| "TOKEN_PROVIDER_GEMALTO";

/** Payload of the required `onSessionCreated` callback. */
export interface OnSessionCreatedPayload {
	clientSessionId: string;
	serverSessionId: string;
	/** Final setting: Google downgrades it to 0 when the account has no Android device. */
	tokenSetting: number;
	cardSetting: number;
	/** Only present when `tokenSetting` is 1; absent in the FPAN-only flow. */
	publicDeviceId?: string;
	publicWalletId?: string;
}

/** Payload of `onSuccess`. */
export interface OnSuccessPayload {
	tokenResult: 0 | 1;
	cardResult: 0 | 1;
	/** Results of the extras requested in `cardExtraOptions`; only present when requested. */
	cardExtraDetails?: {
		virtualCardsResult?: 0 | 1;
	};
	debugInfo: {
		/** Errors that did not prevent a successful outcome (e.g. E202 in the FPAN-only flow). */
		nonFatalErrors: GooglePayError[];
	};
}

/** Payload of `onFailure`: the fatal errors of the session. */
export interface OnFailurePayload {
	errors: GooglePayError[];
}

/** Extra options that may only be requested when saving an FPAN (`cardSetting` is 1). */
export interface CardExtraOptions {
	virtualCardsSetting?: number;
}

/**
 * `appOptions` for `openAppWindow`. Required: `integratorId`, `tokenSetting`,
 * `cardSetting` and `onSessionCreated`; the rest are optional.
 */
export interface AppOptions {
	integratorId: string;
	tokenSetting: number;
	cardSetting: number;
	/** Called when the session is created; payment credentials must be pushed from here. */
	onSessionCreated: (payload: OnSessionCreatedPayload) => void;
	cardExtraOptions?: CardExtraOptions;
	/** true loads the Google Pay sandbox; false (or unset) uses production. */
	isTestEnvironment?: boolean;
	clientSessionId?: string;
	/** BCP 47 tag for the app window locale; the account/browser language is used when unset. */
	hl?: string;
	contentHeight?: number;
	contentWidth?: number;
	/** Called when the window first becomes interactable; empty payload. */
	onReady?: (payload: Record<string, never>) => void;
	onSuccess?: (payload: OnSuccessPayload) => void;
	onFailure?: (payload: OnFailurePayload) => void;
	/** Window closed after a terminal state; prefer onSuccess/onFailure/onCancel. */
	onFinish?: (payload: Record<string, never>) => void;
	/** Window closed before a terminal state. */
	onCancel?: (payload: Record<string, never>) => void;
}

/** `UserAddress` object of the PaymentCredentials payload. */
export interface UserAddress {
	name: string;
	addressLines: string[];
	localityName: string;
	administrativeAreaName: string;
	postalCodeNumber: string;
	/** ISO 3166-1 alpha-2 (e.g. "AR", "BR"). */
	countryCode: string;
	phone: string;
}

/** Required when `tokenSetting` is enabled: carries the TSP OPC. */
export interface TokenCredentials {
	cardNetwork: CardNetwork;
	tokenServiceProvider: TokenServiceProvider;
	/** TSP OPC as the ASCII codes of its base64 (RFC 4648 §4, not URL-safe) string. */
	opaquePaymentCard: Uint8Array;
}

/** Required when `cardSetting` is enabled: carries the Google OPC. */
export interface CardCredentials {
	/** Google OPC as the ASCII codes of its base64 (not URL-safe) string. */
	googleOpaquePaymentCard: Uint8Array;
}

/** `PaymentCredentials` payload for `pushPaymentCredentials`. */
export interface PaymentCredentials {
	displayName: string;
	lastDigits: string;
	userAddress: Partial<UserAddress>;
	tokenCredentials?: TokenCredentials;
	cardCredentials?: CardCredentials;
}

/** The `window.googlepay` namespace exported by the integration library. */
export interface GooglePayLibrary {
	/** Throws a JavaScript Error with an embedded GooglePayErrorCode (E4xx) when the window cannot be opened. */
	openAppWindow: (appOptions: AppOptions) => void;
	pushPaymentCredentials: (paymentCredentials: PaymentCredentials) => void;
	closeAppWindow: () => void;
}

declare global {
	interface Window {
		/** Optional: absent until Google's integration script loads. */
		googlepay?: GooglePayLibrary;
	}
}
