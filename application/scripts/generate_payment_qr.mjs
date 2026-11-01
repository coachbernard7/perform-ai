#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
const output=path.resolve("assets/images/payments");await mkdir(output,{recursive:true});
const links={"bnb-bep20":"https://link.trustwallet.com/send?asset=c20000714&address=0x64B637D97d9d9844212aAeA4eb981DBc3E3f3eB6","eth-erc20":"https://link.trustwallet.com/send?asset=c60&address=0x64B637D97d9d9844212aAeA4eb981DBc3E3f3eB6","usdt-trc20":"https://link.trustwallet.com/send?asset=c195_tTR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&address=TFStsK6YQunN2jv9TXubFa73tc42bWrXs3"};
for(const[name,value]of Object.entries(links))await QRCode.toFile(path.join(output,`${name}.png`),value,{width:480,margin:2,errorCorrectionLevel:"M",color:{dark:"#050811",light:"#FFFFFF"}});
console.log(`Generated ${Object.keys(links).length} payment QR codes`);
