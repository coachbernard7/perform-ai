import type { ImageSourcePropType } from "react-native";
export const PAYMENT_PLANS={basic:{label:"Basic",price:"£5",amount:5},pro:{label:"Pro",price:"£10",amount:10},elite:{label:"Elite",price:"£20",amount:20},sovereign:{label:"Sovereign",price:"£30",amount:30},multiverse:{label:"Multiverse",price:"£50",amount:50}} as const;
export type PaymentPlanId=keyof typeof PAYMENT_PLANS; export type CryptoPaymentMethodId="bnb-bep20"|"eth-erc20"|"usdt-trc20"; export type PaymentMethodId=CryptoPaymentMethodId|"revolut";
export type CryptoPaymentMethod={id:CryptoPaymentMethodId;label:string;asset:string;network:string;address:string;walletUrl:string;explorerUrl:string;qr:ImageSourcePropType};
const EVM="0x64B637D97d9d9844212aAeA4eb981DBc3E3f3eB6",TRON="TFStsK6YQunN2jv9TXubFa73tc42bWrXs3";
export const CRYPTO_PAYMENT_METHODS:readonly CryptoPaymentMethod[]=[
{id:"bnb-bep20",label:"BNB",asset:"BNB",network:"BNB Smart Chain (BEP-20)",address:EVM,walletUrl:`https://link.trustwallet.com/send?asset=c20000714&address=${EVM}`,explorerUrl:`https://bscscan.com/address/${EVM}`,qr:require("../assets/images/payments/bnb-bep20.png")},
{id:"eth-erc20",label:"Ethereum",asset:"ETH",network:"Ethereum (ERC-20)",address:EVM,walletUrl:`https://link.trustwallet.com/send?asset=c60&address=${EVM}`,explorerUrl:`https://etherscan.io/address/${EVM}`,qr:require("../assets/images/payments/eth-erc20.png")},
{id:"usdt-trc20",label:"USDT",asset:"USDT",network:"TRON (TRC-20)",address:TRON,walletUrl:`https://link.trustwallet.com/send?asset=c195_tTR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&address=${TRON}`,explorerUrl:`https://tronscan.org/#/address/${TRON}`,qr:require("../assets/images/payments/usdt-trc20.png")}
];
export const REVOLUT_PAYMENT_URL="https://revolut.me/coachbernard";
export function getPaymentProofEndpoint(platform:"web"|"native"){const configured=process.env.EXPO_PUBLIC_PAYMENT_PROOF_ENDPOINT?.trim();if(configured)return configured;return platform==="web"?"/app/submit-payment.php":""}
