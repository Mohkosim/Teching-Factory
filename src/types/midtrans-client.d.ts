declare module "midtrans-client" {
    export interface SnapConfig {
        isProduction: boolean;
        serverKey: string;
        clientKey: string;
    }

    export interface TransactionDetails {
        order_id: string;
        gross_amount: number;
    }

    export interface CustomerDetails {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
    }

    export interface CreateTransactionParams {
        transaction_details: TransactionDetails;
        customer_details?: CustomerDetails;
        enabled_payments?: string[];
        credit_card?: Record<string, unknown>;
        item_details?: Array<{
            id?: string;
            price: number;
            quantity: number;
            name: string;
        }>;
        [key: string]: unknown;
    }

    export interface SnapTransactionResponse {
        token: string;
        redirect_url: string;
    }

    export interface TransactionStatusResponse {
        transaction_status: string;
        fraud_status?: string;
        gross_amount: string;
        order_id: string;
        payment_type: string;
        status_code: string;
        [key: string]: unknown;
    }

    export class Snap {
        constructor(config: SnapConfig);
        createTransaction(params: CreateTransactionParams): Promise<SnapTransactionResponse>;
    }

    export class CoreApi {
        constructor(config: SnapConfig);
        transaction: {
            status(orderId: string): Promise<TransactionStatusResponse>;
            notification(payload: unknown): Promise<TransactionStatusResponse>;
        };
    }

    const midtransClient: {
        Snap: typeof Snap;
        CoreApi: typeof CoreApi;
    };

    export default midtransClient;
}