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

/**
 * Accepted `tokenCredentials.cardNetwork` values.
 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#accepted_cardnetwork_values Accepted CardNetwork values}
 */
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

/**
 * Accepted `tokenCredentials.tokenServiceProvider` values.
 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#accepted_tokenserviceprovider_values Accepted TokenServiceProvider values}
 */
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

/**
 * Payload of the required `onSessionCreated` callback.
 *
 * This callback is called when the push provisioning session has been created. Within this callback,
 * the issuer website should:
 * - Instruct the issuer backend server to generate payment credentials (i.e. OPC and Google OPC)
 * - Create the `PaymentCredentials` payload object and set the `tokenSetting` and/or `cardSetting`
 * - Call `pushPaymentCredentials(paymentCredentials)` from the provided library
 *
 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#required-parameters-onsessioncreated onSessionCreated}
 */
export interface OnSessionCreatedPayload {
	/**
	 * A string that identifies the client session. If a `clientSessionId` string was passed in to
	 * `openAppWindow`, the same string is sent back here. Otherwise, Google creates one.
	 */
	clientSessionId: string;
	/**
	 * A string that identifies the backend session.
	 */
	serverSessionId: string;
	/**
	 * This parameter indicates whether the user has entered a flow that includes tokenization.
	 *
	 * **Note:** Even if both tokenization and saving an FPAN are requested, the user can still be
	 * redirected into the FPAN-only flow if they don't have an Android device that supports
	 * tokenized card payments. In this case, `tokenSetting` is changed to `0`.
	 *
	 * - `1`: Tokenization is attempted
	 * - `0`: Tokenization is **not** attempted
	 */
	tokenSetting: number;
	/**
	 * This parameter indicates whether the user has entered a flow that includes saving an FPAN.
	 *
	 * - `1`: FPAN save to the user's Google Account is attempted
	 * - `0`: FPAN save to the user's Google Account is **not** attempted
	 */
	cardSetting: number;
	/**
	 * String identifying the Android device that receives the token.
	 *
	 * **Note:** Only included if `tokenSetting` is `1`. In the FPAN-only flow, neither
	 * `publicDeviceId` nor `publicWalletId` is provided.
	 */
	publicDeviceId?: string;
	/**
	 * String identifying the device-scoped Google Pay wallet that receives the token.
	 *
	 * **Note:** Only included if `tokenSetting` is `1`. In the FPAN-only flow, neither
	 * `publicDeviceId` nor `publicWalletId` is provided.
	 */
	publicWalletId?: string;
}

/**
 * Payload of the `onSuccess` callback.
 *
 * A call to this function indicates that the application has succeeded — the user was able to
 * tokenize, save an FPAN, or do both. A success message has been displayed in the application
 * window, which the user can close at their leisure.
 *
 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#optional-parameters-onsuccess onSuccess}
 */
export interface OnSuccessPayload {
	/**
	 * A number that indicates whether tokenization was completed.
	 *
	 * - `1`: Tokenization was completed
	 * - `0`: Tokenization was **not** completed
	 */
	tokenResult: 0 | 1;
	/**
	 * A number that indicates whether an FPAN was saved.
	 *
	 * - `1`: FPAN save was completed
	 * - `0`: FPAN save was **not** completed
	 */
	cardResult: 0 | 1;
	/**
	 * A container for result information about extra options that were requested when saving an FPAN.
	 * Only present when the corresponding extras were requested in `cardExtraOptions`.
	 */
	cardExtraDetails?: {
		/**
		 * A number that indicates whether virtual cards enrollment was completed.
		 *
		 * **Note:** Only present if `virtualCardsSetting` was set to `1` in the request.
		 *
		 * - `1`: Virtual cards enrollment was completed
		 * - `0`: Virtual cards enrollment was **not** completed
		 */
		virtualCardsResult?: 0 | 1;
	};
	/**
	 * An object containing information that may be helpful for debugging purposes.
	 */
	debugInfo: {
		/**
		 * A list of errors that occurred during the session that did not prevent a successful
		 * outcome (e.g. E202 in the FPAN-only flow).
		 */
		nonFatalErrors: GooglePayError[];
	};
}

/**
 * Payload of the `onFailure` callback.
 *
 * A call to this function indicates that the application has failed — tokenization was not
 * completed, and an FPAN was not saved. An error message has been displayed in the application
 * window, which the user can close at their leisure.
 *
 * **Note:** Most of the time, `onFailure` does not need to be handled explicitly.
 */
export interface OnFailurePayload {
	/**
	 * A list of objects representing errors that occurred during the session.
	 */
	errors: GooglePayError[];
}

/**
 * A container for additional options that may **only** be requested when saving an FPAN
 * (i.e., when `cardSetting` is `1`).
 */
export interface CardExtraOptions {
	/**
	 * This parameter indicates whether the user has entered a flow that includes a request for
	 * virtual cards enrollment.
	 *
	 * - `1`: Virtual cards enrollment is attempted
	 * - `0`: Virtual cards enrollment is **not** attempted
	 */
	virtualCardsSetting?: number;
}

/**
 * `appOptions` for `openAppWindow`. Required: `integratorId`, `tokenSetting`,
 * `cardSetting` and `onSessionCreated`; the rest are optional.
 *
 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#openAppWindow openAppWindow}
 */
export interface AppOptions {
	/**
	 * A Google-assigned string that uniquely identifies both the *integrator* that is initiating
	 * the session and the *issuer* of the payment card. They may or may not be the same entity.
	 *
	 * The `integratorId` could be something like `ACMEISSUER_1` if Acme Bank is both the
	 * integrator and the issuer, or it could be something like `INITECH_ACMEISSUER_1` if IniTech
	 * is the integrator acting *on behalf of* Acme Bank.
	 *
	 * The `integratorId` and the current page origin are checked against an allowlist to determine
	 * whether or not the application may be loaded.
	 */
	integratorId: string;
	/**
	 * A number that indicates whether tokenization is requested.
	 *
	 * - `1`: Tokenization is requested
	 * - `0`: Tokenization is **not** requested
	 *
	 * **Note:** Even if both tokenization and saving an FPAN are requested, the user can still be
	 * redirected into the FPAN-only flow if they don't have an Android device that supports
	 * tokenized card payments. In this case, `tokenSetting` is changed to `0` in the `payload`
	 * object parameter that is passed in to `onSessionCreated`.
	 */
	tokenSetting: number;
	/**
	 * A number that indicates whether saving an FPAN to the user's Google Account is requested.
	 *
	 * - `1`: FPAN save is requested
	 * - `0`: FPAN save is **not** requested
	 */
	cardSetting: number;
	/**
	 * This function is called when the push provisioning session has been created. Within this
	 * callback, the issuer website should:
	 * - Instruct the issuer backend server to generate payment credentials (i.e. OPC and Google OPC)
	 * - Create the `PaymentCredentials` payload object and set the `tokenSetting` and/or `cardSetting`
	 * - Call `pushPaymentCredentials(paymentCredentials)` from the provided library
	 *
	 * **Warning:** Payment credentials **must** be sent after `onSessionCreated` is called.
	 * Otherwise, the application window may get stuck on a loader screen that times out after
	 * several minutes, which results in a very poor user experience.
	 */
	onSessionCreated: (payload: OnSessionCreatedPayload) => void;
	/**
	 * A container for additional options that may **only** be requested when saving an FPAN
	 * (i.e., when `cardSetting` is `1`).
	 */
	cardExtraOptions?: CardExtraOptions;
	/**
	 * If `true`, this parameter loads the Google Pay sandbox environment in the application window.
	 * Otherwise, it uses the production endpoint.
	 */
	isTestEnvironment?: boolean;
	/**
	 * If provided, this parameter is used as the client session ID string in subsequent calls.
	 * If it's not provided, one is generated.
	 */
	clientSessionId?: string;
	/**
	 * *Web Interface Language*. A well-formed IETF BCP 47 language tag representing the locale of
	 * the user.
	 *
	 * If provided, it's used to localize the content in the application window. If it's not
	 * provided, the Google Account language preference is used. If the user hasn't signed in to
	 * Google yet, the browser language preference is used.
	 *
	 * @example "en-US", "es-419", "pt-BR"
	 */
	hl?: string;
	/**
	 * If provided, this parameter overrides the default height of the window that opens beginning
	 * the Google Pay Unified Web Push Provisioning API flow.
	 */
	contentHeight?: number;
	/**
	 * If provided, this parameter overrides the default width of the window that opens beginning
	 * the Google Pay Unified Web Push Provisioning API flow.
	 */
	contentWidth?: number;
	/**
	 * This function is called when the application window first becomes interactable.
	 * The `payload` object parameter is empty.
	 */
	onReady?: (payload: Record<string, never>) => void;
	/**
	 * A call to this function indicates that the application has succeeded — the user was able to
	 * tokenize, save an FPAN, or do both. A success message has been displayed in the application
	 * window, which the user can close at their leisure.
	 */
	onSuccess?: (payload: OnSuccessPayload) => void;
	/**
	 * A call to this function indicates that the application has failed — tokenization was not
	 * completed, and an FPAN was not saved. An error message has been displayed in the application
	 * window, which the user can close at their leisure.
	 *
	 * **Note:** Most of the time, `onFailure` does not need to be handled explicitly.
	 */
	onFailure?: (payload: OnFailurePayload) => void;
	/**
	 * A call to this function indicates that the application window has been closed *after*
	 * reaching a terminal state and displaying a success or failure message.
	 *
	 * **Note:** In most cases, integrator websites shouldn't supply this callback. They should
	 * instead perform all end-of-flow handling in `onSuccess`, `onFailure`, and `onCancel`.
	 */
	onFinish?: (payload: Record<string, never>) => void;
	/**
	 * A call to this function indicates that the application window has been closed *early*
	 * (either by the user or due to some other cause), before a success or failure message could
	 * be displayed. It is likely (though not certain) that tokenization was not completed and the
	 * FPAN was not saved.
	 */
	onCancel?: (payload: Record<string, never>) => void;
}

/**
 * `UserAddress` object of the PaymentCredentials payload.
 *
 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#useraddress_object UserAddress object}
 */
export interface UserAddress {
	name: string;
	addressLines: string[];
	localityName: string;
	administrativeAreaName: string;
	postalCodeNumber: string;
	/**
	 * **Important:** Must be a two character country code following ISO 3166-1 alpha-2.
	 * @example "US", "GB", "JP", "AR", "BR", "MX"
	 */
	countryCode: string;
	phone: string;
}

/**
 * This object is only required if `tokenSetting` in `appOptions` is enabled for provisioning.
 *
 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#tokencredentials_object TokenCredentials object}
 */
export interface TokenCredentials {
	cardNetwork: CardNetwork;
	tokenServiceProvider: TokenServiceProvider;
	/**
	 * TSP OPC as the ASCII codes of its base64 (RFC 4648 §4, not URL-safe) string.
	 */
	opaquePaymentCard: Uint8Array;
}

/**
 * This object is only required if `cardSetting` in `appOptions` is enabled for provisioning.
 *
 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#cardcredentials_object CardCredentials object}
 */
export interface CardCredentials {
	/**
	 * Google OPC as the ASCII codes of its base64 (not URL-safe) string.
	 */
	googleOpaquePaymentCard: Uint8Array;
}

/**
 * `PaymentCredentials` payload for `pushPaymentCredentials`.
 *
 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#paymentcredentials_object PaymentCredentials object}
 */
export interface PaymentCredentials {
	displayName: string;
	lastDigits: string;
	userAddress: Partial<UserAddress>;
	/**
	 * Optional: required only if `tokenSetting` in `appOptions` is enabled for provisioning.
	 */
	tokenCredentials?: TokenCredentials;
	/**
	 * Optional: required only if `cardSetting` in `appOptions` is enabled for provisioning.
	 */
	cardCredentials?: CardCredentials;
}

/**
 * The `window.googlepay` namespace exported by the integration library.
 */
export interface GooglePayLibrary {
	/**
	 * Opens the Google Pay Unified Web Push Provisioning API application in a new browser window.
	 *
	 * It should be called when the user presses the "Add to Google Pay" button on the integrator
	 * website.
	 *
	 * **Warning:** Your site's click event handler that calls this function should contain minimal
	 * code, and it shouldn't send any server requests. Any non-trivial code that executes in
	 * between the click event and the call to `openAppWindow()` is likely to trigger the browser's
	 * window blocking feature, which prevents the application window from being opened.
	 *
	 * @param appOptions An object that configures the application.
	 * @throws {Error} Throws a JavaScript Error with an embedded GooglePayErrorCode (E4xx) when
	 * the window cannot be opened.
	 *
	 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#openAppWindow openAppWindow}
	 */
	openAppWindow: (appOptions: AppOptions) => void;
	/**
	 * This function is called in the `onSessionCreated` callback when you have:
	 * - Set `tokenSetting` and `cardSetting`
	 * - Generated a classic OPC or Google OPC (depending on how you configure `tokenSetting` and
	 *   `cardSetting`) on your backend and delivered to your website frontend
	 * - Constructed the `PaymentCredentials` payload
	 *
	 * @param paymentCredentials The payment credentials to deliver to Google.
	 *
	 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#pushPaymentCredentials pushPaymentCredentials}
	 */
	pushPaymentCredentials: (paymentCredentials: PaymentCredentials) => void;
	/**
	 * Closes the Google Pay Web Push Provisioning application window immediately if it is already
	 * open. Callback functions that were passed in to `openAppWindow` aren't called after the
	 * window is closed.
	 *
	 * **Note:** In most cases, integrator websites shouldn't call this method. They should instead
	 * allow the user to close the application window at their leisure.
	 *
	 * @see {@link https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#closeAppWindow closeAppWindow}
	 */
	closeAppWindow: () => void;
}

declare global {
	interface Window {
		/**
		 * The `googlepay` namespace exported by the Google Pay Unified Web Push Provisioning
		 * integration library.
		 *
		 * **Optional:** absent until Google's integration script loads.
		 */
		googlepay?: GooglePayLibrary;
	}
}
